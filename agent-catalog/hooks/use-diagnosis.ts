import { useState, useCallback } from "react";
import {
  checks,
  CheckKey,
  Status,
  DiagnosisResultType,
} from "@/components/diagnosis-result";
import { diagnosisScript } from "@/features/diagnosed/diagnosisScript";
import { vrmDiagnosis } from "@/features/diagnosed/vrmDiagnosis";
import { extractKeyNames, fetchBackend } from "@/hooks/use-backend";
import type { Agent } from "@/types/agent";
import { CACHE_TTL } from "@/lib/query-client";

// Constants
const AGENT_CACHE_KEY = "agents";
const TIMESTAMP_CACHE_KEY = "diagnosis_timestamps";

const talentShowKeys: CheckKey[] = [
  "vrm",
  "chatbot",
  "tts",
  "stt",
  "vision",
  "amicaLife",
];

// Initial state for diagnosis results
const initialResults: DiagnosisResultType = {
  vrm: { status: "idle", score: 0 },
  chatbot: { status: "idle", score: 0 },
  tts: { status: "idle", score: 0 },
  stt: { status: "idle", score: 0 },
  vision: { status: "idle", score: 0 },
  amicaLife: { status: "idle", score: 0 },
  overall: "",
};

/**
 * Performs diagnosis checks on the agent configuration
 */
export async function runDiagnosisCheck(
  update: (key: CheckKey, status: Status) => void,
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmUrl: string,
) {
  // Set all checks to loading
  checks.forEach(({ key }) => update(key, { status: "loading", score: 0 }));

  await Promise.all(
    checks.map(async ({ key }) => {
      try {
        let metric: Status = { status: "fail", score: 0 };

        if (key === "vrm") {
          metric = await vrmDiagnosis(vrmUrl);
        } else {
          const backend = agentConfig[`${key}Backend`];
          metric = await diagnosisScript(key, backend, fullConfig);
        }

        update(key, metric);
      } catch (err) {
        console.error(`Error during ${key} check:`, err);
        update(key, { status: "fail", score: 0 });
      }
    }),
  );
}

/**
 * Custom hook to manage the diagnosis lifecycle
 */
export const useDiagnosisRunner = (agent: Agent, index: number) => {
  const [results, setResults] = useState<DiagnosisResultType>(initialResults);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /**
   * Triggers the diagnosis process
   * @param useCache - Whether to use cached diagnosis data
   */
  const handleDiagnosis = useCallback(
    async (useCache: boolean = true) => {
      setChecking(true);
      const now = Date.now();
      const idStr = agent.agentId;

      try {
        // Attempt to use cached results if enabled
        if (useCache) {
          const cachedAgent = getCachedAgent(idStr);
          const cachedTimestamp = getCachedTimestamp(idStr);

          if (
            cachedAgent &&
            cachedTimestamp &&
            now - cachedTimestamp < CACHE_TTL
          ) {
            console.log(
              `Using cached diagnosis for agent ${cachedAgent.agentId}`,
            );
            setStatus(cachedAgent.status);
            setResults(cachedAgent.diagnosisResult || initialResults);
            setChecking(false);
            return;
          }
        }

        // Prepare backend configurations
        const { keysMap, keysList } = extractKeyNames(agent.config);
        const fullConfig = await fetchBackend(index, keysList, keysMap);

        const tempResults: DiagnosisResultType = { ...initialResults };

        const update = (
          key: keyof DiagnosisResultType,
          value: Status | string,
        ) => {
          if (key === "overall") {
            setResults((prev) => ({ ...prev, overall: value as string }));
          } else {
            tempResults[key as CheckKey] = value as Status;
            setResults((prev) => ({ ...prev, [key]: value as Status }));
          }
        };

        await runDiagnosisCheck(update, agent.config, fullConfig, agent.vrmUrl);

        const newStatus = (
          Object.keys(tempResults) as (keyof DiagnosisResultType)[]
        )
          .filter((key): key is CheckKey => key !== "overall")
          .every((key) => tempResults[key].status === "pass")
          ? "active"
          : "inactive";

        const newTalentShowScore = calculateTalentShowScore(tempResults).toPrecision(4);
        update("overall", newTalentShowScore);

        setStatus(newStatus);

        const updatedAgent = {
          ...agent,
          status: newStatus as Agent["status"],
          talentShowScore: newTalentShowScore,
          diagnosisResult: tempResults,
        };

        updateAgentCache(agent.agentId, updatedAgent);
        updateTimestampCache(agent.agentId, now);
      } catch (err) {
        console.error("Diagnosis process failed:", err);
      } finally {
        setChecking(false);
      }
    },
    [agent, index],
  );

  return { results, checking, status, handleDiagnosis };
};

/**
 * Safely retrieves cached agent data
 */
function getCachedAgent(agentId: string): Agent | undefined {
  const raw = localStorage.getItem(AGENT_CACHE_KEY);
  if (!raw) return undefined;
  const cache: Record<string, Agent> = JSON.parse(raw);
  return cache[agentId];
}

/**
 * Safely retrieves cached timestamp
 */
function getCachedTimestamp(agentId: string): number | undefined {
  const raw = localStorage.getItem(TIMESTAMP_CACHE_KEY);
  if (!raw) return undefined;
  const timestamps: Record<string, number> = JSON.parse(raw);
  return timestamps[agentId];
}

/**
 * Safely updates the agent cache
 */
function updateAgentCache(agentId: string, agentData: Agent) {
  const raw = localStorage.getItem(AGENT_CACHE_KEY);
  const current: Record<string, Agent> = raw ? JSON.parse(raw) : {};
  current[agentId] = agentData;
  localStorage.setItem(AGENT_CACHE_KEY, JSON.stringify(current));
}

/**
 * Safely updates the timestamp cache
 */
function updateTimestampCache(agentId: string, timestamp: number) {
  const raw = localStorage.getItem(TIMESTAMP_CACHE_KEY);
  const current: Record<string, number> = raw ? JSON.parse(raw) : {};
  current[agentId] = timestamp;
  localStorage.setItem(TIMESTAMP_CACHE_KEY, JSON.stringify(current));
}

function calculateTalentShowScore(results: Record<CheckKey, Status>): number {
  const maxScorePerCheck = 100;
  const earnedScore = talentShowKeys.reduce((sum, key) => {
    const score = results[key]?.score;
    return sum + score;
  }, 0);

  return (earnedScore / (talentShowKeys.length * maxScorePerCheck)) * 100;
}

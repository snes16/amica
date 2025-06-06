"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { supabase } from "@/utils/supabase";

// Diagnosis categories used to compute talent score
const talentShowKeys: CheckKey[] = [
  "vrm",
  "chatbot",
  "tts",
  "stt",
  "vision",
  "amicaLife",
];

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
 * Main runner hook
 */
export const useDiagnosisRunner = (agent: Agent, index: number) => {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<DiagnosisResultType>(initialResults);

  const diagnosisQueryKey = ["diagnosis", agent.agentId];
  const agentQueryKey = ["agents", agent.agentId];

  const {
    data: dynamicResults = initialResults,
    isStale,
    refetch,
  } = useDiagnosisQuery(diagnosisQueryKey, agent);

  const handleDiagnosis = useCallback(
    async (useCache: boolean = true) => {
      // Prevent concurrent runs
      if (checking) return;

      setChecking(true);

      if (useCache && !isStale) {
        setStatus(agent.status);
        setResults(dynamicResults);
        setChecking(false);
        return;
      }

      try {
        const { keysList, keysMap } = extractKeyNames(agent.config);
        const fullConfig = await fetchBackend(agent.agentId,keysList, keysMap);

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

        const talentScore =
          calculateTalentShowScore(tempResults).toPrecision(4);
         tempResults["overall"] = talentScore;
        update("overall", talentScore);

        setStatus(newStatus);

        queryClient.setQueryData(diagnosisQueryKey, tempResults);

        const agentUpdateCache = {
          status: newStatus,
        };
        const scoreUpdateCache = {
          ...extractScoresAndOverall(tempResults),
          talentShowScore: talentScore,
          agentId: agent.agentId,
        };

        const { error: agentsUpsertError } = await supabase
          .from("agents")
          .update({ status: newStatus })
          .eq("agentId", agent.agentId);

        const { error: backendUpsertError } = await supabase
          .from("agent-score")
          .upsert(scoreUpdateCache, { onConflict: "agentId" });

        if (agentsUpsertError) {
          console.error("Failed to upsert agents:", agentsUpsertError);
        }
        if (backendUpsertError) {
          console.error("Failed to upsert agent-score:", backendUpsertError);
        }

        queryClient.setQueryData(agentQueryKey, (prev: Agent | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...agentUpdateCache,
            talentShowScore: talentScore,
          };
        });

        // refresh agent data cache
        queryClient.invalidateQueries({ queryKey: agentQueryKey });
        queryClient.refetchQueries({queryKey: agentQueryKey});

      } catch (err) {
        console.error("Diagnosis process failed:", err);
      } finally {
        setChecking(false);
      }
    },
    [agent, index, queryClient, isStale, dynamicResults],
  );

  return {
    results,
    status,
    checking,
    handleDiagnosis,
  };
};

export function extractScoresAndOverall(result: DiagnosisResultType) {
  const scores: Record<CheckKey, number> = {} as Record<CheckKey, number>;

  for (const key of Object.keys(result) as (keyof DiagnosisResultType)[]) {
    if (key === "overall") continue;
    scores[key as CheckKey] = result[key as CheckKey].score;
  }

  return {
    ...scores,
  };
}

/**
 * Custom query hook to manage diagnosis cache
 */
function useDiagnosisQuery(queryKey: any[], agent: Agent) {
  return useQuery<DiagnosisResultType>({
    queryKey,
    queryFn: async () => {
      const { keysList,keysMap } = extractKeyNames(agent.config);
      const fullConfig = await fetchBackend(agent.agentId, keysList,keysMap);
      const tempResults: DiagnosisResultType = { ...initialResults };

      await runDiagnosisCheck(
        (key, status) => {
          tempResults[key] = status;
        },
        agent.config,
        fullConfig,
        agent.vrmUrl,
      );

      const score = calculateTalentShowScore(tempResults);
      tempResults["overall"] = score.toPrecision(4);

      return tempResults;
    },
    staleTime: CACHE_TTL,
  });
}

/**
 * Diagnosis execution
 */
export async function runDiagnosisCheck(
  update: (key: CheckKey, status: Status) => void,
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmUrl: string,
) {
  checks.forEach(({ key }) => update(key, { status: "loading", score: 0 }));

  await Promise.all(
    checks.map(async ({ key }) => {
      try {
        let metric: Status =
          key === "vrm"
            ? await vrmDiagnosis(vrmUrl)
            : await diagnosisScript(key, agentConfig[key], fullConfig);

        update(key, metric);
      } catch (err) {
        console.error(`Error during ${key} check:`, err);
        update(key, { status: "fail", score: 0 });
      }
    }),
  );
}

function calculateTalentShowScore(results: Record<CheckKey, Status>): number {
  const maxScorePerCheck = 100;
  const earnedScore = talentShowKeys.reduce((sum, key) => {
    const score = results[key]?.score || 0;
    return sum + score;
  }, 0);

  return (earnedScore / (talentShowKeys.length * maxScorePerCheck)) * 100;
}
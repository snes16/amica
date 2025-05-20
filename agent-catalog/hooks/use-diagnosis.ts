import { useState, useCallback } from "react";
import { checks, CheckKey, Status } from "@/components/diagnosis-result";
import { diagnosisScript } from "@/features/diagnosed/diagnosisScript";
import { vrmDiagnosis } from "@/features/diagnosed/vrmDiagnosis";

const initialResults: Record<CheckKey, Status> = {
  vrm: "idle",
  chatbot: "idle",
  tts: "idle",
  stt: "idle",
  vision: "idle",
  amicaLife: "idle",
};

export async function runDiagnosisCheck(
  update: (key: CheckKey, status: Status) => void,
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmUrl: string,
) {
  for (const { key } of checks) update(key, "loading");

  await Promise.all(
    checks.map(async ({ key }) => {
      try {
        if (key === "vrm") {
          const res = await vrmDiagnosis(vrmUrl);
          update(key, res ? "pass" : "fail");
          return;
        }

        const backend = agentConfig[`${key}Backend`];
        const res = await diagnosisScript(key, backend, fullConfig);
        update(key, res === "pass" ? "pass" : "fail");
      } catch (err) {
        console.error(`Error in ${key} check:`, err);
        update(key, "fail");
      }
    }),
  );
}

export const useDiagnosis = (
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmUrl: string,
) => {
  const [results, setResults] = useState(initialResults);

  const update = (key: CheckKey, status: Status) =>
    setResults((prev) => ({ ...prev, [key]: status }));

  const runDiagnosis = async () => {
    await runDiagnosisCheck(update, agentConfig, fullConfig, vrmUrl);
  };

  return { results, runDiagnosis };
};

import { extractKeyNames, fetchBackend } from "@/hooks/use-backend";
import type { Agent } from "@/types/agent";

export const useDiagnosisRunner = (agent: Agent, index: number) => {
  const [results, setResults] = useState(initialResults);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleDiagnosis = useCallback(async () => {
    setChecking(true);

    try {
      const { keysMap, keysList } = extractKeyNames(agent.config);
      const fullConfig = await fetchBackend(index, keysList, keysMap);

      const tempResults = { ...initialResults };

      const update = (key: CheckKey, status: Status) => {
        tempResults[key] = status;
        setResults((prev) => ({ ...prev, [key]: status }));
      };

      await runDiagnosisCheck(update, agent.config, fullConfig, agent.vrmUrl);

      const allPassed = Object.values(tempResults).every(
        (val) => val === "pass",
      );
      setStatus(allPassed ? "active" : "inactive");
    } catch (err) {
      console.error("Diagnosis error:", err);
    } finally {
      setChecking(false);
    }
  }, [agent.config, agent.vrmUrl, index]);

  return { results, checking, status, handleDiagnosis };
};

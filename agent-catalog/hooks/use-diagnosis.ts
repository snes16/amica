import { useState } from "react";
import { checks, CheckKey, Status } from "@/components/diagnosis-result";
import { diagnosisScript } from "@/features/diagnosed/diagnosisScript";

export const useDiagnosis = (
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmLoaded: boolean,
  vrmError: boolean
) => {
  const [results, setResults] = useState<Record<CheckKey, Status>>({
    vrm: "idle",
    chatbot: "idle",
    tts: "idle",
    stt: "idle",
    vision: "idle",
    amicaLife: "idle",
  });

  const update = (key: CheckKey, status: Status) =>
    setResults(prev => ({ ...prev, [key]: status }));

  const runDiagnosis = async () => {
    for (const { key } of checks) update(key, "loading");

    await Promise.all(
      checks.map(async ({ key }) => {
        try {
          if (key === "vrm") {
            update(key, vrmLoaded && !vrmError ? "pass" : "fail");
            return;
          }

          const backend = agentConfig[`${key}Backend`];
          const res = await diagnosisScript(key, backend, fullConfig);
          update(key, res === "pass" ? "pass" : "fail");
        } catch (err) {
          console.error(`Error in ${key} check:`, err);
          update(key, "fail");
        }
      })
    );
  };

  return { results, runDiagnosis };
};

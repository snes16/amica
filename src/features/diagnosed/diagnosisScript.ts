
import { AmicaLife } from "@/utils/diagnosisUtils";
import { amicaLifeDiagnosis } from "./amicaLifeDiagnosis";
import { chatbotDiagnosis } from "./chatbotDiagnosis";
import { sttDiagnosis } from "./sttDiagnosis";
import { ttsDiagnosis } from "./ttsDiagnosis";
import { visionDiagnosis } from "./visionDiagnosis";
import { backendKeyMap } from "./backendKeys";
import { checks } from "@/components/diagnosisScript";
import { vrmDiagnosis } from "./vrmDiagnosis";
import { config } from "@/utils/config";

export function structBackend(agentConfig: Record<string, string>) {
  const keysMap: Record<string, string[]> = {};

  for (const backendType in agentConfig) {
    const backendName = agentConfig[backendType];
    const mappedKeys = backendKeyMap[backendName];
    if (mappedKeys) {
      keysMap[backendName] = mappedKeys;
    }
  }

  const result: Record<string, Record<string, string>> = {};
    // Assign metadata values back to the appropriate backend sections
    for (const backendName in keysMap) {
      result[backendName] = {};
      for (const field of keysMap[backendName]) {
        result[backendName][field] = config(field);
      }
    }
  return result;
}

export async function runDiagnosisCheck(
  update: (key: string, status: string) => void,
  agentConfig: Record<string, string>,
  fullConfig: any,
  vrmUrl: string,
) {
  // Set all checks to loading
  checks.forEach(({ key }) => update(key, "loading"));

  await Promise.all(
    checks.map(async ({ key }) => {
      try {
        let status = ""
        if (key === "vrm") {
          status = await vrmDiagnosis(vrmUrl);
        } else {
          const backend = agentConfig[`${key}Backend`];
          status = await diagnosisScript(key, backend, fullConfig);
        }

        update(key, status);
      } catch (err) {
        console.error(`Error during ${key} check:`, err);
        update(key,"fail");
      }
    }),
  );
}

export async function diagnosisScript(key: string,backend: string, params: object): Promise<string> {
  // Debug all the backend configs
  // console.log("diagnosisScript", key, backend, params);

  switch (key) {
    case "chatbot":
      return await chatbotDiagnosis(backend, params);
    case "tts":
      return await ttsDiagnosis(backend, params);
    case "stt":
      return await sttDiagnosis(backend, params);
    case "vision":
      return await visionDiagnosis(backend, params);
    case "amicaLife":
      return await amicaLifeDiagnosis(backend, params as AmicaLife);
    default:
      return "fail";
  }
}

import { AmicaLife } from "@/types/backend";
import { amicaLifeDiagnosis } from "./amicaLifeDiagnosis";
import { chatbotDiagnosis } from "./chatbotDiagnosis";
import { sttDiagnosis } from "./sttDiagnosis";
import { ttsDiagnosis } from "./ttsDiagnosis";
import { visionDiagnosis } from "./visionDiagnosis";

export type EvaluationResult = {
  status: "pass" | "fail";
  score: number;
};


export async function diagnosisScript(key: string,backend: string, params: object): Promise<EvaluationResult> {
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
      return {status: "fail", score: 0};
  }
}
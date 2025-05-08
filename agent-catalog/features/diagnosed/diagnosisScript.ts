
import { AmicaLife } from "@/types/backend";
import { amicaLifeDiagnosis } from "./amicaLifeDiagnosis";
import { chatbotDiagnosis } from "./chatbotDiagnosis";
import { sttDiagnosis } from "./sttDiagnosis";
import { ttsDiagnosis } from "./ttsDiagnosis";
import { visionDiagnosis } from "./visionDiagnosis";

export async function diagnosisScript(key: string,backend: string, params: object) {
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
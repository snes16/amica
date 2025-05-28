import { AmicaLife } from "@/types/backend";
import { EvaluationResult } from "./diagnosisScript";

const backendHandlers: Record<
  string,
  (params: AmicaLife) => Promise<EvaluationResult>
> = {
  amicaLife: async (params) => {
    const { amica_life_enabled, min_time_interval_sec, max_time_interval_sec, time_to_sleep_sec, idle_text_prompt } = params.amicaLife || {};
    if (!amica_life_enabled || !min_time_interval_sec || !max_time_interval_sec || !time_to_sleep_sec || !idle_text_prompt ) return {status: "fail", score: 0};

    try {
      const parsed = JSON.parse(idle_text_prompt);
      if (
        !(amica_life_enabled === "true" || amica_life_enabled === "false") ||
        isNaN(Number(min_time_interval_sec)) ||
        isNaN(Number(max_time_interval_sec)) ||
        isNaN(Number(time_to_sleep_sec)) ||
        typeof parsed !== "object" ||
        !parsed.idleTextPrompt
      ) {
        return {status: "fail", score: 0};
      }
    } catch {
      return {status: "fail", score: 0};
    }

    return {status: "pass", score: 100};
  },

};

// Dispatcher function
export async function amicaLifeDiagnosis(
  backend: string,
  params: AmicaLife
): Promise<EvaluationResult> {
  const handler = backendHandlers[backend];
  if (!handler) return {status: "fail", score: 0};
  return await handler(params);
}

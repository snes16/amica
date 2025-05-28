import { AmicaLife } from "@/utils/diagnosisUtils";

const backendHandlers: Record<
  string,
  (params: AmicaLife) => Promise<string>
> = {
  amicaLife: async (params) => {
    const { amica_life_enabled, min_time_interval_sec, max_time_interval_sec, time_to_sleep_sec, idle_text_prompt } = params.amicaLife || {};
    if (!amica_life_enabled || !min_time_interval_sec || !max_time_interval_sec || !time_to_sleep_sec || !idle_text_prompt ) return "fail";

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
        return "fail";
      }
    } catch {
      return "fail";
    }

    return "pass";
  },

};

// Dispatcher function
export async function amicaLifeDiagnosis(
  backend: string,
  params: AmicaLife
): Promise<string> {
  const handler = backendHandlers[backend];
  if (!handler) return "fail";
  return await handler(params);
}

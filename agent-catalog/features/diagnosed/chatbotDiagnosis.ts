import { ChatbotBackend } from "@/types/backend";
import { EvaluationResult } from "./diagnosisScript";

const additionalUrls = {
  openai: "/v1/chat/completions",
  ollama: "/api/chat",
  llamacpp: "/completions",
  koboldai: "/api/v1/generate",
  kobolda_extra: "/api/extra/generate/stream",
  openrouter: "/chat/completions",
};

const prompt = [{ role: "user", content: "Hello" }];
const promptBuild = "User: Hello\n";

const TIME_OUT = 20000; // time out 10 secs
const MIN_DURATION = 5000; // latest time to add the score

// Utility to safely call fetch with a timeout
async function safeFetch(fullUrl: string, options: RequestInit, timeoutMs = TIME_OUT): Promise<EvaluationResult> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
    });

    const end = performance.now();
    clearTimeout(id);
    const duration = end - start;

    const status = res.ok ? "pass" : "fail";
    const score = calculateScore({ status, duration });

    return { status, score };
  } catch (err: any) {
    const end = performance.now();
    clearTimeout(id);
    const duration = end - start;

    const isAbort = err.name === "AbortError";
    const status = isAbort ? "fail" : "fail";

    return {
      status,
      score: calculateScore({ status, duration, timeout: isAbort }),
    };
  }
}

// Score calculation logic
function calculateScore({
  status,
  duration,
  timeout = false,
}: {
  status: "pass" | "fail";
  duration: number;
  timeout?: boolean;
}): number {
  if (timeout) return 0;
  let score = 0;
  if (status === "pass") score += 50;
  if (duration < MIN_DURATION) score += 50 * ((MIN_DURATION - duration) / MIN_DURATION); 
  return Math.round(score);
}

// Individual backend handlers
const backendHandlers: Record<
  string,
  (params: ChatbotBackend) => Promise<EvaluationResult>
> = {
  openai: async (params) => {
    const { openai_apikey, openai_model, openai_url } = params.openai || {};
    if (!openai_apikey || !openai_url || !openai_model) return {status: "fail", score: 0};

    return await safeFetch(`${openai_url}${additionalUrls.openai}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_apikey}`,
        "HTTP-Referer": "https://amica.arbius.ai",
        "X-Title": "Amica",
      },
      body: JSON.stringify({
        model: openai_model,
        messages: prompt,
        stream: false,
        max_tokens: 200,
      }),
    });
  },

  llamacpp: async (params) => {
    const { llamacpp_url } = params.llamacpp || {};
    if (!llamacpp_url) return {status: "fail", score: 0};

    return await safeFetch(`${llamacpp_url}${additionalUrls.llamacpp}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        stream: true,
        n_predict: 400,
        temperature: 0.7,
        cache_prompt: true,
        prompt: promptBuild,
      }),
    });
  },

  ollama: async (params) => {
    const { ollama_url, ollama_model } = params.ollama || {};
    if (!ollama_url) return {status: "fail", score: 0};

    return await safeFetch(`${ollama_url}${additionalUrls.ollama}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ollama_model, messages: prompt }),
    });
  },

  koboldai: async (params) => {
    const { koboldai_url, koboldai_use_extra } = params.koboldai || {};
    if (!koboldai_url) return {status: "fail", score: 0};

    const path = koboldai_use_extra === "true" ? additionalUrls.kobolda_extra : additionalUrls.koboldai;

    return await safeFetch(`${koboldai_url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  },

  openrouter: async (params) => {
    const { openrouter_apikey, openrouter_model, openrouter_url } = params.openrouter || {};
    if (!openrouter_apikey || !openrouter_model || !openrouter_url) return {status: "fail", score: 0};

    return await safeFetch(`${openrouter_url}${additionalUrls.openrouter}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouter_apikey}`,
        "HTTP-Referer": "https://amica.arbius.ai",
        "X-Title": "Amica Chat",
      },
      body: JSON.stringify({
        model: openrouter_model,
        messages: prompt,
        stream: true,
      }),
    });
  },

  windowai: async () => { return { status: "pass", score: 100 }},
};

// Dispatcher function
export async function chatbotDiagnosis(
  backend: string,
  params: ChatbotBackend
): Promise<EvaluationResult> {
  const handler = backendHandlers[backend];
  if (!handler) return {status: "fail", score: 0};
  return await handler(params);
}
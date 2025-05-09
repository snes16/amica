import { ChatbotBackend } from "@/types/backend";

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

// Utility to safely call fetch
async function safeFetch(fullUrl: string, options: RequestInit): Promise<"pass" | "fail"> {
  try {
    const res = await fetch(fullUrl, options);
    return res.ok ? "pass" : "fail";
  } catch {
    return "fail";
  }
}

// Individual backend handlers
const backendHandlers: Record<
  string,
  (params: ChatbotBackend) => Promise<"pass" | "fail">
> = {
  openai: async (params) => {
    const { openai_apikey, openai_model, openai_url } = params.openai || {};
    if (!openai_apikey || !openai_url || !openai_model) return "fail";

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
    if (!llamacpp_url) return "fail";

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
    if (!ollama_url) return "fail";

    return await safeFetch(`${ollama_url}${additionalUrls.ollama}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: ollama_model, messages: prompt }),
    });
  },

  koboldai: async (params) => {
    const { koboldai_url, koboldai_use_extra } = params.koboldai || {};
    if (!koboldai_url) return "fail";

    const path = koboldai_use_extra === "true" ? additionalUrls.kobolda_extra : additionalUrls.koboldai;

    return await safeFetch(`${koboldai_url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
  },

  openrouter: async (params) => {
    const { openrouter_apikey, openrouter_model, openrouter_url } = params.openrouter || {};
    if (!openrouter_apikey || !openrouter_model || !openrouter_url) return "fail";

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

  windowai: async () => "pass",
};

// Dispatcher function
export async function chatbotDiagnosis(
  backend: string,
  params: ChatbotBackend
): Promise<string> {
  const handler = backendHandlers[backend];
  if (!handler) return "fail";
  return await handler(params);
}

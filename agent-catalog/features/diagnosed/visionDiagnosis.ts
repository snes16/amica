import { VisionBackend } from "@/types/backend";
import { EvaluationResult } from "./diagnosisScript";

const additionalUrls = {
  vision_openai: "/v1/chat/completions",
  vision_llamacpp: "/completion",
  vision_ollama: "/api/chat",
};

const TIME_OUT = 20000;
const MIN_DURATION = 5000;

export async function loadImage(
    url: string,
    maxWidth = 320,
    maxHeight = 240,
    quality = 0.8 // JPEG compression quality (0 to 1)
  ): Promise<string> {
    // Fetch the image blob
    const response = await fetch(url);
    const blob = await response.blob();
  
    const imageUrl = URL.createObjectURL(blob);
    const img = new Image();
  
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imageUrl;
    });
  
    // Calculate new dimensions maintaining aspect ratio
    let { width, height } = img;
    const aspectRatio = width / height;
  
    if (width > maxWidth || height > maxHeight) {
      if (aspectRatio > 1) {
        // Landscape
        width = maxWidth;
        height = maxWidth / aspectRatio;
      } else {
        // Portrait
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
    }
  
    // Draw on canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Unable to get canvas context");
  
    ctx.drawImage(img, 0, 0, width, height);
  
    // Compress and convert to base64
    const base64 = canvas
      .toDataURL('image/jpeg', quality)
      .replace('data:image/jpeg;base64,', '');
  
    URL.revokeObjectURL(imageUrl);
    return base64;
  }  

// Utility to safely call fetch
async function safeFetch(
  fullUrl: string,
  options?: RequestInit,
  timeoutMs = TIME_OUT
): Promise<EvaluationResult> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    if (!options) {
        const res = await fetch(fullUrl, {
          signal: controller.signal,
        });
        const end = performance.now();
        clearTimeout(id);
        const duration = end - start;
        const status = res.ok ? "pass" : "fail";
        const score = calculateScore({ status, duration });

        return { status, score };
    } else {
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
    }
  } catch (err: any) {
    const end = performance.now();
    clearTimeout(id);
    const duration = end - start;
    const isAbort = err.name === "AbortError";
    return { status: "fail", score: calculateScore({ status: "fail", duration, timeout: isAbort }) };
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
  (params: VisionBackend) => Promise<EvaluationResult>
> = {
  vision_openai: async (params) => {
    const { vision_openai_apikey, vision_openai_model, vision_openai_url } =
      params.vision_openai || {};

    if (!vision_openai_apikey || !vision_openai_model || !vision_openai_url)
      return {status:"fail", score: 0};

    let image = await loadImage("/sample-image.jpeg");
    const messages = [
      {
        role: "user",
        // @ts-ignore normally this is a string
        content: [
          {
            type: "text",
            text: "Describe the image as accurately as possible",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          },
        ],
      },
    ];

    return await safeFetch(
      `${vision_openai_url}${additionalUrls.vision_openai}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${vision_openai_apikey}`,
          "HTTP-Referer": "https://amica.arbius.ai",
          "X-Title": "Amica",
        },
        body: JSON.stringify({
          vision_openai_model,
          messages,
          stream: true,
          max_tokens: 200,
        }),
      },
    );
  },

  vision_llamacpp: async (params) => {
    const { vision_llamacpp_url } = params.vision_llamacpp || {};
    if (!vision_llamacpp_url) return {status:"fail", score: 0};


    let image = await loadImage("/sample-image.jpeg");
    const prompt = `User: Describe the image as accurately as possible`;

    return await safeFetch(`${vision_llamacpp_url}${additionalUrls.vision_llamacpp}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connection": "keep-alive",
        "Accept": "text/event-stream",
      },
      body: JSON.stringify({
        stream: true,
        n_predict: 400,
        temperature: 0.7,
        cache_prompt: true,
        image_data: [{
          data: image,
          id: 10,
        }],
        prompt,
      }),
    });
  },

  vision_ollama: async (params) => {
    const { vision_ollama_url, vision_ollama_model } =
      params.vision_ollama || {};
    if (!vision_ollama_url || !vision_ollama_model) return {status:"fail", score: 0};

    let image = await loadImage("/sample-image.jpeg");
    const messages = [
        {
          role: "user",
          content: "Describe the image as accurately as possible",
        },
      ];

    return await safeFetch(`${vision_ollama_url}${additionalUrls.vision_ollama}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: vision_ollama_model,
        messages,
        images: [image],
        stream: false,
      }),
    });
  },
};

// Dispatcher function
export async function visionDiagnosis(
  backend: string,
  params: VisionBackend,
): Promise<EvaluationResult> {
  const handler = backendHandlers[backend];
  if (!handler) return {status:"fail", score: 0};
  return await handler(params);
}

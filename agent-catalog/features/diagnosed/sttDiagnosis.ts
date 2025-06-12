import { STTBackend } from "@/types/backend";
import { WaveFile } from "wavefile";
import { EvaluationResult } from "./diagnosisScript";

const additionalUrls = {
  openai_whisper: "/v1/audio/transcriptions",
  whispercpp: "/inference",
};

const TIME_OUT = 8000;
const MIN_DURATION = 2000;

export async function loadAudioAsFloat32Array(
  url: string,
): Promise<Float32Array> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();

  const audioCtx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  return audioBuffer.getChannelData(0);
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
  (params: STTBackend) => Promise<EvaluationResult>
> = {
  whisper_openai: async (params) => {
    const { openai_whisper_apikey, openai_whisper_model, openai_whisper_url } =
      params.whisper_openai || {};

    if (!openai_whisper_apikey || !openai_whisper_model || !openai_whisper_url)
      return {status: "fail", score: 0};

    let audio = await loadAudioAsFloat32Array("/sample-voice.wav");
    const wav = new WaveFile();
    wav.fromScratch(1, 16000, "32f", audio);
    const file = new File([new Uint8Array(wav.toBuffer())], "input.wav", { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", openai_whisper_model);
    formData.append("language", "en");

    return await safeFetch(
      `${openai_whisper_url}${additionalUrls.openai_whisper}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openai_whisper_apikey}`,
        },
        body: formData,
      },
    );
  },

  whispercpp: async (params) => {
    const { whispercpp_url } = params.whispercpp || {};
    if (!whispercpp_url) return {status: "fail", score: 0};

    let audio = await loadAudioAsFloat32Array("/sample-voice.wav");
    const wav = new WaveFile();
    wav.fromScratch(1, 16000, "32f", audio);
    wav.toBitDepth("16");
    const file = new File([new Uint8Array(wav.toBuffer())], "input.wav", { type: "audio/wav" });

    const formData = new FormData();
    formData.append("file", file);

    return await safeFetch(`${whispercpp_url}${additionalUrls.whispercpp}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: formData,
    });
  },

  whisper_browser: async () => { return {status: "pass", score: 100}; }
};

// Dispatcher function
export async function sttDiagnosis(
  backend: string,
  params: STTBackend,
): Promise<EvaluationResult> {
  const handler = backendHandlers[backend];
  if (!handler) return {status: "fail", score: 0};
  return await handler(params);
}

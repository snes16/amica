import { STTBackend } from "@/types/backend";
import { WaveFile } from "wavefile";

const additionalUrls = {
  openai_whisper: "/v1/audio/transcriptions",
  whispercpp: "/inference",
};

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
): Promise<"pass" | "fail"> {
  try {
    if (!options) {
      const res = await fetch(fullUrl);
      return res.ok ? "pass" : "fail";
    } else {
      const res = await fetch(fullUrl, options);
      return res.ok ? "pass" : "fail";
    }
  } catch {
    return "fail";
  }
}

// Individual backend handlers
const backendHandlers: Record<
  string,
  (params: STTBackend) => Promise<"pass" | "fail">
> = {
  whisper_openai: async (params) => {
    const { openai_whisper_apikey, openai_whisper_model, openai_whisper_url } =
      params.whisper_openai || {};

    if (!openai_whisper_apikey || !openai_whisper_model || !openai_whisper_url)
      return "fail";

    let audio = await loadAudioAsFloat32Array("/sample-voice.wav");
    const wav = new WaveFile();
    wav.fromScratch(1, 16000, "32f", audio);
    const file = new File([wav.toBuffer()], "input.wav", { type: "audio/wav" });

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
    if (!whispercpp_url) return "fail";

    let audio = await loadAudioAsFloat32Array("/sample-voice.wav");
    const wav = new WaveFile();
    wav.fromScratch(1, 16000, "32f", audio);
    wav.toBitDepth("16");
    const file = new File([wav.toBuffer()], "input.wav", { type: "audio/wav" });

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

  whisper_browser: async () => "pass",
};

// Dispatcher function
export async function sttDiagnosis(
  backend: string,
  params: STTBackend,
): Promise<string> {
  const handler = backendHandlers[backend];
  if (!handler) return "fail";
  return await handler(params);
}

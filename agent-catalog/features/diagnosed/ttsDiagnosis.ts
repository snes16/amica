import { TTSBackend } from "@/types/backend";
import { EvaluationResult } from "./diagnosisScript";

const additionalUrls = {
  elevenlabs: "?optimize_streaming_latency=0&output_format=mp3_44100_128",
  openai_tts: "/v1/audio/speech",
  localXTTSTTS: "/api/tts-generate",
  piper: "/api/v1/generate",
  coquiLocal: "/api/tts",
};

const message = "Hello World";

const TIME_OUT = 8000;
const MIN_DURATION = 2000;

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
        const res = await fetch(fullUrl);
        const end = performance.now();
        clearTimeout(id);
        const duration = end - start;
        const status = res.ok ? "pass" : "fail";
        const score = calculateScore({ status, duration });

        return { status, score };
    } else {
        const res = await fetch(fullUrl, options);
        const end = performance.now();
        clearTimeout(id);
        const duration = end - start;
        const status = res.ok ? "pass" : "fail";
        const score = calculateScore({ status, duration });

        return { status, score };
    }
  } catch (err:any) {
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
  (params: TTSBackend) => Promise<EvaluationResult>
> = {
  elevenlabs: async (params) => {
    const { elevenlabs_apikey, elevenlabs_voiceid, elvenlabs_model } = params.elvenlabs || {};

    if (!elevenlabs_apikey || !elevenlabs_voiceid || !elvenlabs_model) return {status: "fail", score: 0};
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${elevenlabs_voiceid}`;

    return await safeFetch(`${url}${additionalUrls.elevenlabs}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": elevenlabs_apikey,
      },
      body: JSON.stringify({
        text: message,
        model_id: elvenlabs_model,
        voice_settings: {
          stability: 0,
          similarity_boost: 0,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });
  },

  openai_tts: async (params) => {
    const { openai_tts_apikey, openai_tts_url, openai_tts_model, openai_tts_voice } = params.openai_tts || {};
    if (!openai_tts_model || !openai_tts_apikey || !openai_tts_url || !openai_tts_voice) return {status: "fail", score: 0};

    return await safeFetch(`${openai_tts_url}${additionalUrls.openai_tts}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_tts_apikey}`,
      },
      body: JSON.stringify({
        model: openai_tts_model,
        input: message,
        voice: openai_tts_voice,
      }),
    });
  },

  localXTTSTTS: async (params) => {
    const { localXTTS_url, alltalk_version, alltalk_rvc_voice, alltalk_language, alltalk_rvc_pitch, alltalk_voice } =
      params.localXTTS || {};
    const baseUrl = localXTTS_url?.replace(/\/+$/, "").replace("/api/tts-generate", "");
    const formData = new URLSearchParams({
      text_input: message,
      text_filtering: "standard",
      character_voice_gen: alltalk_voice || "female_01.wav",
      narrator_enabled: "false",
      narrator_voice_gen: alltalk_voice || "female_01.wav",
      text_not_inside: "character",
      language: alltalk_language || "en",
      output_file_name: "amica_output",
      output_file_timestamp: "true",
      autoplay: "false",
      autoplay_volume: "0.8",
    });

    if (alltalk_version === "v2") {
      if (alltalk_rvc_voice && alltalk_rvc_voice !== "Disabled") {
        formData.append("rvccharacter_voice_gen", alltalk_rvc_voice);
        formData.append("rvccharacter_pitch", alltalk_rvc_pitch || "0");
      }
    }

    return await safeFetch(`${baseUrl}${additionalUrls.localXTTSTTS}`, {
      method: "POST",
      body: formData,
    });
  },

  piper: async (params) => {
    const { piper_url } = params.piper || {};
    if (!piper_url) return {status: "fail", score: 0};
    const newUrl = new URL(piper_url);
    newUrl.searchParams.append('text', message);

    return await safeFetch(newUrl.toString());
  },

  coquiLocal: async (params) => {
    const { coquiLocal_url, coquiLocal_voiceid } = params.coquiLocal || {};
    if (!coquiLocal_url || !coquiLocal_voiceid) return {status: "fail", score: 0};

    return await safeFetch(`${coquiLocal_url}${additionalUrls.coquiLocal}`, {
      method: "POST",
      headers: {
        'text': message,
        'speaker-id': coquiLocal_voiceid,
      }
    });
  },

  speecht5: async () => { return {status: "pass", score: 100}; },
};

// Dispatcher function
export async function ttsDiagnosis(
  backend: string,
  params: TTSBackend,
): Promise<EvaluationResult> {
  const handler = backendHandlers[backend];
  if (!handler) return {status: "fail", score: 0};
  return await handler(params);
}

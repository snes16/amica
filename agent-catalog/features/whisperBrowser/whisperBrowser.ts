import { Transcriber } from "@/hooks/useTranscriber";

export async function transcribeWhisperBrowser(
  audio: Float32Array,
  transcriber: Transcriber
) {
  console.debug('whisper_browser attempt');

  // Since VAD sample rate is the same as Whisper (16000), no resampling needed
  const audioCtx = new AudioContext();
  const buffer = audioCtx.createBuffer(1, audio.length, 16000);
  buffer.copyToChannel(new Float32Array(audio), 0, 0);

  transcriber.start(buffer);
}

import { useCallback, useMemo, useRef, useState } from "react";
import { createModel } from "vosk-browser";
import type { Model } from "vosk-browser";
import { config } from "@/utils/config";
import type { Transcriber, TranscriberData } from "./useTranscriber";

export function useVoskTranscriber(): Transcriber {
  const [transcript, setTranscript] = useState<TranscriberData | undefined>(undefined);
  const [isBusy, setIsBusy] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);

  const modelRef = useRef<Model | null>(null);
  const modelUrlRef = useRef<string>("");
  const modelPromiseRef = useRef<Promise<Model> | null>(null);

  const ensureModel = useCallback((): Promise<Model> => {
    const modelUrl = config("vosk_model_url");

    if (modelRef.current && modelUrlRef.current === modelUrl) {
      return Promise.resolve(modelRef.current);
    }

    if (modelPromiseRef.current && modelUrlRef.current === modelUrl) {
      return modelPromiseRef.current;
    }

    setIsModelLoading(true);
    modelUrlRef.current = modelUrl;

    modelPromiseRef.current = createModel(modelUrl).then(
      (m) =>
        new Promise<Model>((resolve, reject) => {
          // Already ready (createModel resolved after load)
          if (m.ready) {
            modelRef.current = m;
            setIsModelLoading(false);
            resolve(m);
            return;
          }

          m.on("load", (msg: any) => {
            if (msg.result === false) {
              reject(new Error("Vosk model failed to load"));
              return;
            }
            modelRef.current = m;
            setIsModelLoading(false);
            resolve(m);
          });

          m.on("error", (msg: any) => {
            setIsModelLoading(false);
            reject(new Error(msg.error ?? "Vosk model error"));
          });
        }),
    );

    return modelPromiseRef.current;
  }, []);

  const onInputChange = useCallback(() => {
    setTranscript(undefined);
  }, []);

  const start = useCallback(
    (audioData: AudioBuffer | undefined) => {
      if (!audioData) return;
      setTranscript(undefined);
      setIsBusy(true);

      ensureModel()
        .then((model) => {
          const rec = new model.KaldiRecognizer(audioData.sampleRate);
          let collectedText = "";
          let doneTimer: ReturnType<typeof setTimeout> | null = null;
          let finalized = false;

          const finalize = () => {
            if (finalized) return;
            finalized = true;
            if (doneTimer) clearTimeout(doneTimer);
            rec.remove();
            setTranscript({ isBusy: false, text: collectedText.trim(), chunks: [] });
            setIsBusy(false);
          };

          rec.on("result", (msg: any) => {
            const t: string = msg.result?.text ?? "";
            if (t) collectedText += (collectedText ? " " : "") + t;
            // Debounce: finalize 100ms after the last result event.
            // The last event is always from retrieveFinalResult().
            if (doneTimer) clearTimeout(doneTimer);
            doneTimer = setTimeout(finalize, 100);
          });

          rec.on("error", () => {
            if (doneTimer) clearTimeout(doneTimer);
            finalized = true;
            rec.remove();
            setIsBusy(false);
          });

          rec.acceptWaveform(audioData);
          rec.retrieveFinalResult();

          // Safety: finalize after 8s even if no result arrives
          doneTimer = setTimeout(finalize, 8000);
        })
        .catch((err) => {
          console.error("vosk error", err);
          setIsBusy(false);
        });
    },
    [ensureModel],
  );

  return useMemo(
    () => ({ onInputChange, isBusy, isModelLoading, start, output: transcript }),
    [onInputChange, isBusy, isModelLoading, start, transcript],
  );
}

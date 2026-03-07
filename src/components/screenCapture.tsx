import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ChatContext } from "@/features/chat/chatContext";
import { IconButton } from "./iconButton";

// How often to auto-capture in watch mode (ms)
const AUTO_INTERVAL_MS = 30_000;

export function ScreenCapture({
  setScreenCaptureEnabled,
}: {
  setScreenCaptureEnabled: (enabled: boolean) => void;
}) {
  const { chat: bot } = useContext(ChatContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  useKeyboardShortcut("Escape", () => {
    setScreenCaptureEnabled(false);
  });

  // Capture current video frame and send to vision backend
  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg").replace("data:image/jpeg;base64,", "");

    setIsProcessing(true);
    await bot.getVisionResponse(base64, "screen");
    setIsProcessing(false);
  }, [bot]);

  // Start screen sharing on mount - prefer monitor/display surface
  useEffect(() => {
    let cancelled = false;

    async function startCapture() {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // @ts-ignore displaySurface is a valid MediaTrackConstraint extension
            displaySurface: "monitor",
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Close panel if user stops sharing via browser chrome
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenCaptureEnabled(false);
        });
      } catch {
        // User dismissed the picker
        setScreenCaptureEnabled(false);
      }
    }

    startCapture();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Auto-capture loop
  useEffect(() => {
    if (autoMode) {
      captureFrame();
      intervalRef.current = setInterval(captureFrame, AUTO_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoMode, captureFrame]);

  // Manual one-shot capture — closes panel after sending
  const handleManualCapture = useCallback(async () => {
    await captureFrame();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setScreenCaptureEnabled(false);
  }, [captureFrame, setScreenCaptureEnabled]);

  return (
    <div className="fixed right-[calc(320px)] top-0 z-[11]">
      <div className="fixed">
        <video
          ref={videoRef}
          autoPlay
          muted
          width={320}
          height={240}
          className="rounded-bl-none rounded-br-none rounded-lg bg-black"
        />
        <div className="p-1 shadow-md flex flex-auto justify-evenly items-center bg-gray-50 rounded-tl-none rounded-tr-none rounded-full">
          {/* One-shot capture & close */}
          <IconButton
            iconName="24/Shutter"
            isProcessing={isProcessing}
            className="bg-secondary hover:bg-secondary-hover active:bg-secondary-active"
            onClick={handleManualCapture}
            disabled={isProcessing || autoMode}
            title="Capture once and send to AI"
          />
          {/* Auto-watch toggle */}
          <button
            onClick={() => setAutoMode((v) => !v)}
            disabled={isProcessing}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              autoMode
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
            title={autoMode ? "Stop auto-watch" : `Watch screen every ${AUTO_INTERVAL_MS / 1000}s`}
          >
            {autoMode ? "Stop" : "Auto"}
          </button>
        </div>
      </div>
    </div>
  );
}

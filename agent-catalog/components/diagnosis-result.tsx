import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useEffect } from "react";

export const checks = [
  { label: "VRM", key: "vrm" },
  { label: "LLM", key: "chatbot" },
  { label: "TTS", key: "tts" },
  { label: "STT", key: "stt" },
  { label: "Vision", key: "vision" },
  { label: "AmicaLife", key: "amicaLife" },
] as const;

export type CheckKey = typeof checks[number]["key"];
export type Status = { status: "idle" | "loading" | "pass" | "fail", score: number };

export type DiagnosisResultType = {
  [key in CheckKey]: Status;
} & {
  overall?: string;
};

interface DiagnosisResultProps {
  label: string;
  status: Status;
}

export const DiagnosisResult = ({ label, status }: DiagnosisResultProps) => {
  const statusIcon = {
    pass: <CheckCircle className="text-green-500" size={20} />,
    fail: <XCircle className="text-red-500" size={20} />,
    loading: <Loader2 className="animate-spin text-gray-400" size={20} />,
    idle: <div className="w-5 h-5 rounded-full bg-gray-200" />,
  };

  const statusColor = {
    pass: "text-green-600",
    fail: "text-red-600",
    loading: "text-gray-500",
    idle: "text-gray-400",
  };

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-4 rounded-xl shadow-sm">
      {statusIcon[status.status]}
      <div className="justify-between">
        {/* Label and status */}  
        <div className="flex flex-col">
          <span className="font-medium text-sm text-gray-700">{label}</span>
          <span className={`text-xs ${statusColor[status.status]}`}>
            {status.status === "idle" ? "Not checked" : status.score >= 0 ? `Score: ${status.score}` : "N/A"}
          </span>
        </div>
        {/* Each evaluation criteria */}
        <div className="flex flex-col">

        </div>
      </div>

    </div>
  );
};

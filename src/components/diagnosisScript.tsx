import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { IconButton } from "./iconButton";
import { useCallback, useState } from "react";
import { runDiagnosisCheck, structBackend } from "@/features/diagnosed/diagnosisScript";
import { config } from "@/utils/config";

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

export const checks = [
    { label: "VRM", key: "vrm" },
    { label: "LLM", key: "chatbot" },
    { label: "TTS", key: "tts" },
    { label: "STT", key: "stt" },
    { label: "Vision", key: "vision" },
    { label: "AmicaLife", key: "amicaLife" },
] as const;

export type CheckKey = typeof checks[number]["key"];
export type Status = "idle" | "loading" | "pass" | "fail";

const initialResults: Record<string, string> = {
    vrm: "idle",
    chatbot: "idle",
    tts: "idle",
    stt: "idle",
    vision: "idle",
    amicaLife: "idle",
};


export const DiagnosisScript = ({

}: {
    }) => {
    const [checking, setChecking] = useState(false)
    const [results, setResults] = useState<Record<string, string>>(initialResults);
    const [status, setStatus] = useState<string | null>(null);

    const agentConfig = {
        chatbotBackend: config("chatbot_backend"),
        ttsBackend: config("tts_backend"),
        sttBackend: config("stt_backend"),
        visionBackend: config("vision_backend"),
        amicaLifeBackend: "amicaLife",
    }

    async function handleDiagnosis() {
        setChecking(true);
        try {
            const fullConfig = structBackend(agentConfig);

            const tempResults: Record<string, any> = {};

            const update = (key: string, value: string) => {
                tempResults[key] = value;
                setResults((prev) => ({ ...prev, [key]: value }));
            };

            await runDiagnosisCheck(update, agentConfig, fullConfig, config("vrm_url"));

            console.log(agentConfig, fullConfig, tempResults)

            const newStatus = Object.keys(tempResults).every((key) => tempResults[key] === "pass")
                ? "active"
                : "inactive";
            setStatus(newStatus);

        } catch (err) {
            console.error("Diagnosis process failed:", err);
        } finally {
            setChecking(false);
        }
    }

    return (
        <div className="absolute left-14 top-4 z-10">
            <div className="w-full p-4 border border-gray-200 rounded-3xl bg-gray-50 shadow-xl flex flex-col justify-between">
                <div className="mx-auto max-w-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 md:mb-0">Diagnosis</h2>
                        <button
                            className={`bg-slate-600 hover:bg-slate-500 active:bg-slate-500 shadow-xl disabled:bg-primary-disabled text-white rounded-lg text-sm p-1 text-center inline-flex items-center mr-2`}
                            onClick={handleDiagnosis}
                        >
                            <div className="mx-2 font-bold">{checking ? "Loading..." : "Run Diagnosis"}</div>
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {checks.map(({ label, key }) => {
                            const currentStatus = results[key] as keyof typeof statusIcon;
                            return (
                                <div key={key} className="flex items-center gap-3 bg-gray-100 border border-gray-200 p-4 rounded-xl shadow-sm">
                                    {statusIcon[currentStatus]}
                                    <div className="flex flex-col">
                                        <span className="font-medium text-sm text-gray-700">{label}</span>
                                        <span className={`text-xs ${statusColor[currentStatus]}`}>
                                            {currentStatus === "idle" ? "Not checked" : currentStatus}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                    </div>
                </div>
            </div>
        </div >
    );
};
"use client";
import { useBackend } from "@/hooks/use-backend";
import { Button } from "./ui/button";
import { useDiagnosis } from "@/hooks/use-diagnosis";
import { DiagnosisResult } from "./diagnosis-result";
import { checks } from "@/components/diagnosis-result";

interface AgentVrmDiagnosisProps {
  vrmLoaded: boolean;
  vrmError: boolean;
  agentId: string;
  agentConfig: {
    chatbotBackend: string;
    ttsBackend: string;
    sttBackend: string;
    visionBackend: string;
    amicaLifeBackend: string;
  };
}

export function AgentVrmDiagnosis({
  vrmLoaded,
  vrmError,
  agentId,
  agentConfig
}: AgentVrmDiagnosisProps) {
  const {
    data: fullConfig,
    loading: configLoading,
    error: configError
  } = useBackend(Number(agentId), agentConfig);

  const { results, runDiagnosis } = useDiagnosis(
    agentConfig,
    fullConfig,
    vrmLoaded,
    vrmError
  );

  const handleDiagnosis = () => {
    if (configLoading || configError || !fullConfig) {
      console.warn("Waiting for backend config to load.");
      return;
    }
    runDiagnosis();
  };

  return (
    <div className="w-full p-6 border border-gray-200 rounded-3xl bg-white shadow-xl flex flex-col justify-between">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-orbitron text-gray-800 mb-2 md:mb-0">Agent Diagnosis</h2>
        <Button
          onClick={handleDiagnosis}
          disabled={configLoading}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-orbitron px-6 py-2 rounded-xl shadow"
        >
          {configLoading ? "Preparing..." : "Run Full Diagnosis"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {checks.map(({ label, key }) => (
          <DiagnosisResult key={key} label={label} status={results[key]} />
        ))}
      </div>
    </div>
  );
}

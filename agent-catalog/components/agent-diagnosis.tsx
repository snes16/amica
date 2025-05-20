"use client";
import { useBackend } from "@/hooks/use-backend";
import { Button } from "./ui/button";
import { useDiagnosis } from "@/hooks/use-diagnosis";
import { DiagnosisResult } from "./diagnosis-result";
import { checks } from "@/components/diagnosis-result";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Agent } from "@/types/agent";

interface AgentVrmDiagnosisProps {
  vrmUrl: string;
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
  vrmUrl,
  agentId,
  agentConfig
}: AgentVrmDiagnosisProps) {
  const queryClient = useQueryClient();
  const {
    data: fullConfig,
    loading: configLoading,
    error: configError
  } = useBackend(Number(agentId), agentConfig);

  const { results, runDiagnosis } = useDiagnosis(
    agentConfig,
    fullConfig,
    vrmUrl
  );

  const handleDiagnosis = () => {
    if (configLoading || configError || !fullConfig) {
      console.warn("Waiting for backend config to load.");
      return;
    }
    runDiagnosis();
  };

  // Update the agent status in the query cache when it changes
  useEffect(() => {
    const isPassed = checks.every(({ key }) => results[key] === "pass");
    queryClient.setQueryData(["agents"], (old: Agent[] = []) =>
          old.map((a) =>
            a.id === agentId
              ? { ...a, status: isPassed ? "active" : "inactive" } // update only the matching agent
              : a
          )
        );
  }, [results]);

  // Running the diagnosis when the config is loaded
  useEffect(() => {
    if (fullConfig) {
      handleDiagnosis();
    }
  }, [fullConfig]);

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

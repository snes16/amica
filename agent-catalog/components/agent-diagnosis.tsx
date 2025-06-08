"use client";

import { Button } from "./ui/button";
import { useDiagnosisRunner } from "@/hooks/use-diagnosis";
import { CheckKey, DiagnosisResult, DiagnosisResultType } from "./diagnosis-result";
import { checks } from "@/components/diagnosis-result";
import { useEffect, useRef, useState } from "react";
import { Agent } from "@/types/agent";

interface AgentVrmDiagnosisProps {
  agent: Agent
  index: number;
  setDiagnosisIsPassed: (isPassed: boolean) => void;
}

export function AgentVrmDiagnosis({
  agent,
  index,
  setDiagnosisIsPassed,
}: AgentVrmDiagnosisProps) {
  const hasChecked = useRef(false);

  const { results, checking, handleDiagnosis } = useDiagnosisRunner(agent, index);

  // Check agent status on mount
  useEffect(() => {
    if (!hasChecked.current) {
      handleDiagnosis();
      hasChecked.current = true;
    }
  }, []);

  // Set diagnosis is passed flag
  useEffect(() => {
    const isPassed = (
      Object.keys(results) as (keyof DiagnosisResultType)[]
    )
      .filter((key): key is CheckKey => key !== "overall")
      .every((key) => results[key].status === "pass");

    setDiagnosisIsPassed(isPassed);
  }, [results]);


  return (
    <div className="w-full p-6 border border-gray-200 rounded-3xl bg-white shadow-xl flex flex-col justify-between">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-orbitron text-gray-800 mb-2 md:mb-0">
          Talent Show Score:{" "}
          <span className="font-bold">
            {results["overall"] || agent.talentShowScore || "N/A"}
          </span>
        </h2>
        <Button
          onClick={() => handleDiagnosis(false)}
          disabled={checking}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-orbitron px-6 py-2 rounded-xl shadow"
        >
          {checking ? "Loading..." : "Evaluate Agent"}
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

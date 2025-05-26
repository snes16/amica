"use client";

import { useAgents } from "@/hooks/use-agents";
import { AgentDetails } from "@/components/agent-details";
import { Agent } from "@/types/agent";

export default function AgentPageContent({ params }: { params: { id: string } }) {
  const { agents, loading, error } = useAgents(params.id) as {
    agents: Agent;
    loading: boolean;
    error: string | null;
  };

  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
      {error ? (
        <div className="p-4 text-red-500">Error loading agents: {error}</div>
      ) : !agents || loading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <AgentDetails agent={agents} />
      )}
    </div>
  );
}

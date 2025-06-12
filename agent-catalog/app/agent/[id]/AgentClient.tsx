"use client";

import { AgentDetails } from "@/components/agent-details";
import { Agent } from "@/types/agent";
import { useEffect, useState } from "react";
import { fetchAgentPriceAndTiers } from "@/lib/agents";

export default function AgentClient({ id }: { id: string }) {
  const [agents, setAgents] = useState<Agent>();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/agents?agentId=${id}`);
        if (!res.ok) throw new Error(`Failed to fetch agent ${id}`);
        const data = await res.json();
        const agentsResult = await fetchAgentPriceAndTiers(data);
        if (isMounted) {
          setAgents(Array.isArray(agentsResult) ? agentsResult[0] : agentsResult);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || `Error loading agent ${id}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

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

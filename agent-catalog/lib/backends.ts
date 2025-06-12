import { backendKeyMap } from "@/features/diagnosed/backendKeys";
import { Agent } from "@/types/agent";
import { supabase } from "@/utils/supabase";

export async function getBackendsFromSupabase(agentId?: string | null) {
  let query = supabase.from("agent-backend").select("*");

  if (agentId) {
    query = query.eq("agentId", agentId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchBackends(agentId: string, config: Agent["config"]) {
  const res = await fetch(`/api/backends?agentId=${agentId}`);
  if (!res.ok) throw new Error("Failed to fetch backends. ");
  const json = await res.json();
  const result = json[0];
  const fullConfig: { [key: string]: Record<string, string> } = {};

  // Assign metadata values back to the appropriate backend sections
  for (const backendName in config) {
    const configKey = backendName as keyof Agent["config"];
    const configValue = config[configKey];
    fullConfig[configValue] = result[configKey];
  }

  return fullConfig
}

export function extractKeyNames(agentConfig: Record<string, string>) {
  const keysMap: Record<string, string[]> = {};

  for (const backendType in agentConfig) {
    const backendName = agentConfig[backendType];
    const mappedKeys = backendKeyMap[backendName];
    if (mappedKeys) {
      keysMap[backendType] = mappedKeys;
    }
  }

  const keysList = Object.values(keysMap).flat();
  return { keysMap, keysList };
}

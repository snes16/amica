import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { decodeAgentId } from "./fileUtils";
import { backendKeyMap } from "@/features/diagnosed/backendKeys";

type AgentConfig = Record<string, string>;
type Config = Record<string, string>;

export async function saveNFT(keysList: string[], valuesList: string[]) {
  if (keysList.length !== valuesList.length) {
    console.error("Keys and values lists must have the same length");
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_PSV_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_PSV_SUPABASE_ANON_KEY as string,
  );

  const config: Config = Object.fromEntries(
    keysList.map((key, i) => [key, valuesList[i]]),
  );

  const agentConfig: AgentConfig = {
    chatbot: config.chatbot_backend,
    tts: config.tts_backend,
    stt: config.stt_backend,
    vision: config.vision_backend,
    amicaLife: "amicaLife",
    rvc: "rvc",
  };

  try {
    await saveToAgent(supabase, config, agentConfig);
    await saveToAgentBackend(supabase, config, agentConfig);
    console.log("NFT configuration saved to supabase successfully.");
  } catch (err) {
    console.error("Error saving NFT configuration to supabase:", err);
  }
}

async function saveToAgent(
  supabase: SupabaseClient,
  config: Config,
  agentConfig: AgentConfig,
) {
  const integrations: Record<string, string> = [
    "brain",
    "virtuals",
    "eacc",
    "uos",
  ]
    .filter((key) => config[key])
    .reduce((acc, key) => ({ ...acc, [key]: config[key] }), {});

  const agent = {
    id: String(decodeAgentId(config.agent_id)),
    agentId: config.agent_id,
    name: config.name,
    description: config.description,
    status: "active", // optionally update this dynamically
    avatar: config.image,
    token: "AINFT",
    category: config.agent_category || "All Agents",
    tags: config.tags?.split(",") ?? [],
    vrmUrl: config.vrm_url,
    bgUrl: config.bg_url,
    config: agentConfig,
    integrations,
    systemPrompt: config.system_prompt,
    visionSystemPrompt: config.vision_system_prompt,
  };

  const { error } = await supabase.from("agents").insert(agent);

  if (error) {
    throw new Error(`Failed to insert agent: ${error.message}`);
  }
}

async function saveToAgentBackend(
  supabase: SupabaseClient,
  config: Config,
  agentConfig: AgentConfig,
) {
  const backendData: Record<string, Record<string, string>> = {};

  for (const backendType in agentConfig) {
    const backendName = agentConfig[backendType];
    const mappedKeys = backendKeyMap[backendName];
    backendData[backendType] = {};
    if (mappedKeys?.length) {
      for (const key of mappedKeys) {
        if (config[key]) {
          backendData[backendType][key] = config[key];
        } 
      }
    }
  }

  const payload = {
    agentId: config.agent_id,
    ...backendData,
  };

  const { error } = await supabase.from("agent-backend").insert(payload);

  if (error) {
    throw new Error(`Failed to insert agent backend: ${error.message}`);
  }
}

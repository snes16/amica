"use client";

import type { Agent } from "@/types/agent";
import VRMDemo from "./vrm-demo";
import { useEffect, useState, useContext } from "react";
import { Message, Role } from "@/features/chat/messages";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { ChatContext } from "@/features/chat/chatContext";
import { AmicaLifeContext } from "@/features/amicaLife/amicaLifeContext";
import { ChatConfig } from "@/features/chat/chat";
import { extractKeyNames, fetchBackend } from "@/hooks/use-backend";

interface AgentDemoProps {
    agent: Agent;
    talentShow: boolean;
}

export function AgentDemo({ agent, talentShow }: AgentDemoProps) {
    const { viewer } = useContext(ViewerContext);
    const { chat: bot } = useContext(ChatContext);
  const { amicaLife: amicaLife } = useContext(AmicaLifeContext);
    const { keysList, keysMap } = extractKeyNames(agent.config);
  
    const [vrmLoaded, setVrmLoaded] = useState(false);
    const [vrmError, setVrmError] = useState(false);
    const [config, setConfig] = useState<ChatConfig>();

  const [chatSpeaking, setChatSpeaking] = useState(false);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [shownMessage, setShownMessage] = useState<Role>("system");

  useEffect(() => {
    const loadConfig = async () => {
        const fullConfig = await fetchBackend(agent.agentId, keysList, keysMap);
        const config: ChatConfig = {
        name: agent.name,
        tts_backend: agent.config.tts as ChatConfig["tts_backend"],
        chatbot_backend: agent.config.chatbot as ChatConfig["chatbot_backend"],
        vision_backend: agent.config.vision as ChatConfig["vision_backend"],
        system_prompt: agent.systemPrompt,
        vision_system_prompt: agent.visionSystemPrompt,
        chatbot_params: fullConfig["chatbot"],
        tts_params: fullConfig["tts"],
        vision_params: fullConfig["vision"],
        amica_life_params: {
          amica_life_enabled: fullConfig["amicaLife"]?.amica_life_enabled ?? "",
          min_time_interval_sec: fullConfig["amicaLife"]?.min_time_interval_sec ?? "",
          max_time_interval_sec: fullConfig["amicaLife"]?.max_time_interval_sec ?? "",
          time_to_sleep_sec: fullConfig["amicaLife"]?.time_to_sleep_sec ?? "",
          idle_text_prompt: fullConfig["amicaLife"]?.idle_text_prompt ?? "",
        },
        rvc_params: {
          rvc_enabled: fullConfig["rvc"]?.rvc_enabled ?? false,
          rvc_url: fullConfig["rvc"]?.rvc_url ?? "",
          rvc_model_name: fullConfig["rvc"]?.rvc_model_name ?? "",
          rvc_f0_upkey: fullConfig["rvc"]?.rvc_f0_upkey ?? 0,
          rvc_f0_method: fullConfig["rvc"]?.rvc_f0_method ?? 0,
          rvc_index_path: fullConfig["rvc"]?.rvc_index_path ?? "",
          rvc_index_rate: fullConfig["rvc"]?.rvc_index_rate ?? 0,
          rvc_protect: fullConfig["rvc"]?.rvc_protect ?? 0,
          rvc_filter_radius: fullConfig["rvc"]?.rvc_filter_radius ?? 0,
          rvc_resample_sr: fullConfig["rvc"]?.rvc_resample_sr ?? 0,
          rvc_rms_mix_rate: fullConfig["rvc"]?.rvc_rms_mix_rate ?? 0,
        },
      };
      setConfig(config);
    }

    loadConfig();
  },[])

useEffect(() => {
  if (!talentShow || bot.initialized || !config) return;

  const initBot = async () => {
    try {
      bot.initialize(
        amicaLife,
        viewer,
        setUserMessage,
        setAssistantMessage,
        setShownMessage,
        setChatProcessing,
        setChatSpeaking,
        config
      );
    } catch (error) {
      console.error("Failed to initialize bot:", error);
    }
  };

  initBot();
}, [talentShow, bot, viewer]);

  useEffect(() => {
      if (!talentShow || bot.initialized || !config) return;
    amicaLife.initialize(
        config,
      viewer,
      bot,
      chatSpeaking,
    );
  }, [amicaLife, bot, viewer]);

    useEffect(() => {

    }, [])

    return (
        <>
            <div
                className="bg-gray-100 p-8 rounded-lg h-[400px] flex items-center justify-center border border-gray-200 relative"
                style={{
                    backgroundImage: `url(${agent.bgUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                }}>
                {/* TODO: Talent Video Output */}
                {/* <div className="absolute left-4 top-4 z-20 text-white text-2xl">
                Hello
              </div> */}
                <VRMDemo
                    vrmUrl={agent.vrmUrl}
                    onLoaded={() => setVrmLoaded(true)}
                    onError={() => setVrmError(true)}
                />
            </div>
        </>
    );
}

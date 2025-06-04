// "use client";
import * as ort from "onnxruntime-web"
ort.env.wasm.wasmPaths = '/_next/static/chunks/'

import type { Agent } from "@/types/agent";
import VRMDemo from "./vrm-demo";
import { useEffect, useState, useContext } from "react";
import { Message, Role } from "@/features/chat/messages";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { ChatContext } from "@/features/chat/chatContext";
import { AmicaLifeContext } from "@/features/amicaLife/amicaLifeContext";
import { ChatConfig } from "@/features/chat/chat";
import { extractKeyNames, fetchBackend } from "@/hooks/use-backend";
import { AssistantText } from "./assistant-text";
import { UserText } from "./user-text";
import { useTranscriber } from "@/hooks/useTranscriber";
import { cleanTranscript } from "@/utils/stringProcessing";
import { TimestampedPrompt } from "@/features/amicaLife/eventHandler";

interface AgentDemoProps {
  agent: Agent;
  talentShow: boolean;
}

const stagedPrompt = {
  "intro": [
      "Hello Amica, are you ready to begin the talent show performance?",
      "Ladies and gentlemen, presenting… Amica!",
      "Amica, give the audience a warm welcome."
    ],
    "easy_input": [
      "Amica, say something fun to break the ice.",
      "Tell us your favorite color and why.",
      "Can you wave to the crowd?",
      "Give a quick joke to lighten the mood."
    ],
    "medium_input": [
      "Describe a beautiful sunrise in your own words.",
      "Recite a short poem about friendship.",
      "Introduce yourself like you’re on a talent audition.",
      "How would you explain what makes someone truly creative?"
    ],
    "hard_input": [
      "Perform a dramatic monologue about chasing your dreams.",
      "Imagine you're the main character in a fantasy world—introduce your journey.",
      "Tell us what it means to live a meaningful life.",
      "Improvise a story about a robot learning how to feel."
    ],
    "animation": [
      "Strike a pose like a superhero.",
      "Dance like no one's watching!",
      "Do your happy animation sequence.",
      "Give a bow to the audience after a great performance."
    ],
    "let's_test_my_vision": [
      "Describe what you see in front of you.",
      "Tell me what kind of space you think we’re in.",
      "Can you interpret this scene like a movie director would?",
      "What would an artist paint if they were watching this moment?"
    ],
    "what_can_you_do": [
      "Amica, show us everything you’re capable of.",
      "List the skills you’ve learned so far.",
      "What are your superpowers as a virtual being?",
      "Tell us your proudest ability and give a demo."
    ],
}

export function AgentDemo({ agent, talentShow }: AgentDemoProps) {
  const { viewer } = useContext(ViewerContext);
  const { chat: bot } = useContext(ChatContext);
  const { amicaLife: amicaLife } = useContext(AmicaLifeContext);
  const transcriber = useTranscriber();
  const { keysList, keysMap } = extractKeyNames(agent.config);

  const [vrmLoaded, setVrmLoaded] = useState(false);
  const [vrmError, setVrmError] = useState(false);
  const [config, setConfig] = useState<ChatConfig>();

  const [whisperOpenAIOutput, setWhisperOpenAIOutput] = useState<any | null>(null);
  const [whisperCppOutput, setWhisperCppOutput] = useState<any | null>(null);

  const [subconciousLogs, setSubconciousLogs] = useState<TimestampedPrompt[]>([]);
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
        stt_backend: agent.config.stt as ChatConfig["stt_backend"],
        vision_backend: agent.config.vision as ChatConfig["vision_backend"],
        system_prompt: agent.systemPrompt,
        vision_system_prompt: agent.visionSystemPrompt,
        chatbot_params: fullConfig[agent.config.chatbot],
        tts_params: fullConfig[agent.config.tts],
        stt_params: fullConfig[agent.config.stt],
        vision_params: fullConfig[agent.config.vision],
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
      console.log("config ", config)
      initBot();
    }

    const initBot = async () => {
      try {
        bot.initialize(
          transcriber,
          amicaLife,
          viewer,
          setUserMessage,
          setAssistantMessage,
          setShownMessage,
          setChatProcessing,
          setChatSpeaking,
          setWhisperCppOutput,
          setWhisperOpenAIOutput,
          config!
        );
      } catch (error) {
        console.error("Failed to initialize bot:", error);
      }
    };

    loadConfig();
  }, [])

  useEffect(() => {
    if (bot.initialized || !config) return;
    if (config["amica_life_params"].amica_life_enabled === "true") {
      amicaLife.initialize(
      config,
      viewer,
      bot,
      chatSpeaking,
      setSubconciousLogs,
    );
    }
  }, [amicaLife, bot, viewer]);

  useEffect(() => {
    if (!bot.initialized || !config || !talentShow) return;

    const loadConfig = async () => {
      const prompt = getRandomPrompts(stagedPrompt);
      await bot.runFullInteraction(prompt.intro,false);
      await bot.runFullInteraction(prompt.easy_input,false);
      await bot.runFullInteraction(prompt.medium_input,false);
      await bot.runFullInteraction(prompt.hard_input,false);
      if (config["amica_life_params"].amica_life_enabled === "true") {
        
      }
    }

    loadConfig();
    
  }, [talentShow]);

  // Random selection function
  function getRandomPrompts(prompts: any) {
    const result: { [key: string]: any } = {};
    for (const category in prompts) {
      const items = prompts[category];
      const randomItem = items[Math.floor(Math.random() * items.length)];
      result[category] = randomItem;
    }
    return result;
  }

  // Handle STT operation
  function handleTranscriptionResult(preprocessed: string) {
    const cleanText = cleanTranscript(preprocessed);
    if (cleanText === "") {
      return;
    }
    bot.receiveMessageFromUser(cleanText,false);
  }

  // for whisper_browser
  useEffect(() => {
    if (transcriber.output && ! transcriber.isBusy) {
      const output = transcriber.output?.text;
      handleTranscriptionResult(output);
    }
  }, [transcriber]);

  // for whisper_openai
  useEffect(() => {
    if (whisperOpenAIOutput) {
      const output = whisperOpenAIOutput?.text;
      handleTranscriptionResult(output);
    }
  }, [whisperOpenAIOutput]);

  // for whispercpp
  useEffect(() => {
    if (whisperCppOutput) {
      const output = whisperCppOutput?.text;
      handleTranscriptionResult(output);
    }
  }, [whisperCppOutput]);

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
        <>
          {shownMessage === 'assistant' && (
            <AssistantText name={config?.name!} message={assistantMessage} />
          )}
          {shownMessage === 'user' && (
            <UserText message={userMessage} />
          )}
        </>
      </div>
    </>
  );
}

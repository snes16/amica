// "use client";
import * as ort from "onnxruntime-web"
ort.env.wasm.wasmPaths = '/_next/static/chunks/'

import type { Agent } from "@/types/agent";
import VRMDemo from "./vrm-demo";
import { useEffect, useState, useContext, useCallback } from "react";
import { Role } from "@/features/chat/messages";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import { ChatContext } from "@/features/chat/chatContext";
import { AmicaLifeContext } from "@/features/amicaLife/amicaLifeContext";
import { ChatConfig } from "@/features/chat/chat";
import { fetchBackends } from "@/lib/backends";
import { AssistantText } from "./assistant-text";
import { UserText } from "./user-text";
import { useTranscriber } from "@/hooks/useTranscriber";
import { cleanTranscript } from "@/utils/stringProcessing";
import { handleIdleEvent, TimestampedPrompt } from "@/features/amicaLife/eventHandler";
import { loadImage } from "@/features/diagnosed/visionDiagnosis";
import { loadVRMAnimation } from "@/lib/VRMAnimation/loadVRMAnimation";
import { wait } from "@/utils/wait";
import { stagedPrompt } from "@/lib/prompts";

interface AgentDemoProps {
  agent: Agent;
  talentShow: boolean;
  talentRunning: boolean;
  setTalentShow: (show: boolean) => void;
  setTalentRunning: (running: boolean) => void;
}

const promptKeys = ["intro", "easy_input", "medium_input", "hard_input"];
const animPaths = ["/animations/greeting.vrma", "/animations/peaceSign.vrma"];
const stepLabels = [
  "Intro",
  "Easy Input",
  "Medium Input",
  "Hard Input",
  "Image Vision",
  "Greeting Animation",
  "Subconscious Event",
  "Peace Sign Animation",
];
const TalentSteps = {
  INTRO: 0,
  EASY_INPUT: 1,
  MEDIUM_INPUT: 2,
  HARD_INPUT: 3,
  IMAGE_VISION: 4,
  GREETING_ANIM: 5,
  SUBCONSCIOUS: 6,
  PEACE_SIGN_ANIM: 7,
} as const;


export function AgentDemo({ agent, talentShow, setTalentShow, talentRunning, setTalentRunning }: AgentDemoProps) {
  const { viewer } = useContext(ViewerContext);
  const { chat: bot } = useContext(ChatContext);
  const { amicaLife } = useContext(AmicaLifeContext);
  const transcriber = useTranscriber();

  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [talentError, setTalentError] = useState<string | null>(null);

  const [config, setConfig] = useState<ChatConfig>();
  const [assistantMessage, setAssistantMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [shownMessage, setShownMessage] = useState<Role>("system");
  const [vrmError, setVrmError] = useState(false);
  const [subconciousLogs, setSubconciousLogs] = useState<TimestampedPrompt[]>([]);
  const [chatSpeaking, setChatSpeaking] = useState(false);
  const [chatProcessing, setChatProcessing] = useState(false);

  const [whisperOpenAIOutput, setWhisperOpenAIOutput] = useState<any | null>(null);
  const [whisperCppOutput, setWhisperCppOutput] = useState<any | null>(null);

  const getRandomPrompts = useCallback((prompts: typeof stagedPrompt) => {
    return Object.fromEntries(
      Object.entries(prompts).map(([key, values]) => [
        key,
        values[Math.floor(Math.random() * values.length)],
      ])
    );
  }, []);

  const handleTranscriptionResult = useCallback(
    (text: string) => {
      const cleanText = cleanTranscript(text);
      if (cleanText) bot.receiveMessageFromUser(cleanText, false);
    },
    [bot]
  );

  // Load config and initialize bot
  useEffect(() => {
    const loadAndInit = async () => {
      const fullConfig = await fetchBackends(agent.agentId, agent.config);
      const newConfig: ChatConfig = {
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
        amica_life_params: fullConfig[agent.config.amicaLife] as ChatConfig["amica_life_params"],
        rvc_params: fullConfig[agent.config.rvc] as unknown as ChatConfig["rvc_params"],
      };
      setConfig(newConfig);
      bot.initialize(
        transcriber,
        amicaLife,
        viewer,
        setUserMessage,
        setAssistantMessage,
        setShownMessage,
        setChatProcessing,
        setChatSpeaking,
        setWhisperOpenAIOutput,
        setWhisperCppOutput,
        newConfig
      );
    };
    loadAndInit();
  }, []);

  // Initialize Amica Life
  useEffect(() => {
    if (!bot.initialized || !config || config.amica_life_params.amica_life_enabled !== "true") return;
    amicaLife.initialize(config, viewer, bot, chatSpeaking, setSubconciousLogs);
  }, [bot.initialized, config, viewer, amicaLife, chatSpeaking]);

  const updateProgress = (step: number) => {
    setCurrentStep(step);
  };

  const runPromptSteps = async (promptSet: { [x: string]: string; }) => {
    for (const key of promptKeys) {
      updateProgress(TalentSteps[key.toUpperCase() as keyof typeof TalentSteps]);
      await bot.runFullInteraction(promptSet[key], false);
    }
  };

  const runVisionStep = async () => {
    updateProgress(TalentSteps.IMAGE_VISION);
    const imageBase64 = await loadImage("/sample-image.jpeg");
    await bot.runFullInteraction(imageBase64, true);
  };

  const runAnimationSteps = async () => {
    for (let i = 0; i < animPaths.length; i++) {
      const animStep = i === 0 ? TalentSteps.GREETING_ANIM : TalentSteps.PEACE_SIGN_ANIM;
      updateProgress(animStep);

      const animation = await loadVRMAnimation(animPaths[i]);
      if (animation && viewer.model) {
        const duration = await viewer.model.playAnimation(animation, "idle_loop.vrma");
        requestAnimationFrame(() => viewer.resetCameraLerp());
        await wait(duration * 1000);
      }

      if (i === 0 && config?.amica_life_params.amica_life_enabled === "true") {
        updateProgress(TalentSteps.SUBCONSCIOUS);
        await handleIdleEvent(config, { events: "Subconcious" }, amicaLife, bot, viewer);
      }
    }
  };

  // Talent show logic
  useEffect(() => {
    if (!bot.initialized || !config || !talentShow || talentRunning) return;

    const isSubconsciousEnabled = config.amica_life_params.amica_life_enabled === "true";
    const baseSteps = promptKeys.length + 1 + animPaths.length; // prompts + vision + animations
    const total = isSubconsciousEnabled ? baseSteps + 1 : baseSteps;

    setTotalSteps(total);

    const runTalentShow = async () => {
      try {
        setTalentRunning(true);
        const promptSet = getRandomPrompts(stagedPrompt);
        await runPromptSteps(promptSet);
        await runVisionStep();
        await runAnimationSteps();
      } catch (err) {
        console.error("Talent show error:", err);
        setTalentError("Something went wrong.");
      } finally {
        setTalentRunning(false);
        setTalentShow(false);
      }
    };


    runTalentShow();
  }, [talentShow, bot.initialized, config]);


  // Consolidated STT handler
  useEffect(() => {
    const outputs = [transcriber.output?.text, transcriber.output, whisperCppOutput, whisperOpenAIOutput];
    for (const o of outputs) {
      if (o && typeof o.text === "string") {
        handleTranscriptionResult(o.text);
      }
    }
  }, [transcriber.output, whisperCppOutput, whisperOpenAIOutput]);

  useEffect(() => {
    return () => {
      console.log("AgentDemo is unmounting : ",agent.agentId);
      bot.clean();
      viewer.unloadVRM();
      amicaLife.clean();
    };
  }, []);


  return (
    <div
      className="bg-gray-100 p-8 rounded-lg h-[400px] flex items-center justify-center border border-gray-200 relative"
      style={{
        backgroundImage: `url(${agent.bgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Talent Show Progress Bar */}
      {(talentShow && talentRunning) && (
        <div className="absolute right-4 top-4 z-20 w-32 text-white text-2xl">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-white">{stepLabels[currentStep]}</p>
        </div>
      )}

      <VRMDemo
        vrmUrl={agent.vrmUrl}
        onLoaded={() => { }}
        onError={() => setVrmError(true)}
      />
      {shownMessage === "assistant" && (
        <AssistantText name={config?.name ?? ""} message={assistantMessage} />
      )}
      {shownMessage === "user" && <UserText message={userMessage} />}
    </div>
  );
}


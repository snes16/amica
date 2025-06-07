import { Queue } from "@/utils/queue"
import { Message, Role, Screenplay, Talk, textsToScreenplay } from "./messages";
import { Viewer } from "@/features/vrmViewer/viewer";

import { getEchoChatResponseStream } from "./echoChat";
import {
  getOpenAiChatResponseStream,
  getOpenAiVisionChatResponse,
} from "./openAiChat";
import {
  getLlamaCppChatResponseStream,
  getLlavaCppChatResponse,
} from "./llamaCppChat";
import { getWindowAiChatResponseStream } from "./windowAiChat";
import {
  getOllamaChatResponseStream,
  getOllamaVisionChatResponse,
} from "./ollamaChat";
import { getKoboldAiChatResponseStream } from "./koboldAiChat";

import { rvc } from "@/features/rvc/rvc";
import { coquiLocal } from "@/features/coquiLocal/coquiLocal";
import { piper } from "@/features/piper/piper";
import { elevenlabs } from "@/features/elevenlabs/elevenlabs";
import { speecht5 } from "@/features/speecht5/speecht5";
import { openaiTTS } from "@/features/openaiTTS/openaiTTS";
import { localXTTSTTS } from "@/features/localXTTS/localXTTS";

import { AmicaLife } from "@/features/amicaLife/amicaLife";

import { cleanTalk } from "@/utils/cleanTalk";
import { processResponse } from "@/utils/processResponse";
import { wait } from "@/utils/wait";
import {
  isCharacterIdle,
  characterIdleTime,
  resetIdleTimer,
} from "@/utils/isIdle";
import { getOpenRouterChatResponseStream } from "./openRouterChat";
import {
  AmicaLifeParams,
  ChatbotBackend,
  RVC,
  STTBackend,
  TTSBackend,
  VisionBackend,
} from "@/types/backend";
import { loadAudioAsFloat32Array } from "../diagnosed/sttDiagnosis";
import { WaveFile } from "wavefile";
import { openaiWhisper } from "../openaiWhisper/openaiWhisper";
import { Transcriber } from "@/hooks/useTranscriber";
import { whispercpp } from "../whispercpp/whispercpp";

type Speak = {
  audioBuffer: ArrayBuffer | null;
  screenplay: Screenplay;
  streamIdx: number;
};

type TTSJob = {
  screenplay: Screenplay;
  streamIdx: number;
};

export interface ChatConfig {
  name: string;
  tts_backend:
    | "none"
    | "piper"
    | "coqui"
    | "elevenlabs"
    | "speecht5"
    | "openai_tts"
    | "localXTTS"
    | "coquiLocal";
  chatbot_backend:
    | "openai"
    | "llamacpp"
    | "ollama"
    | "koboldai"
    | "windowai"
    | "openrouter";
  stt_backend: "whisper_browser" | "whisper_openai" | "whispercpp";
  vision_backend: "vision_llamacpp" | "vision_ollama" | "vision_openai";
  system_prompt: string;
  vision_system_prompt: string;
  chatbot_params: ChatbotBackend;
  tts_params: TTSBackend;
  stt_params: STTBackend;
  vision_params: VisionBackend;
  amica_life_params: AmicaLifeParams;
  rvc_params: RVC;
  // Add more as needed
}

export class Chat {
  public initialized: boolean;
  private shouldStopProcessing = false;

  public transcriber?: Transcriber;
  public amicaLife?: AmicaLife;
  public viewer?: Viewer;

  public setChatLog?: (messageLog: Message[]) => void;
  public setUserMessage?: (message: string) => void;
  public setAssistantMessage?: (message: string) => void;
  public setShownMessage?: (role: Role) => void;
  public setChatProcessing?: (processing: boolean) => void;
  public setChatSpeaking?: (speaking: boolean) => void;
  public setWhisperCppOutput?: (output: any) => void;
  public setWhisperOpenAIOutput?: (output: any) => void;

  // the message from the user that is currently being processed
  // it can be reset
  public stream: ReadableStream<Uint8Array> | null;
  public streams: ReadableStream<Uint8Array>[];
  public reader: ReadableStreamDefaultReader<Uint8Array> | null;
  public readers: ReadableStreamDefaultReader<Uint8Array>[];

  // process these immediately as they come in and add to audioToPlay
  public ttsJobs: Queue<TTSJob>;

  // this should be read as soon as they exist
  // and then deleted from the queue
  public speakJobs: Queue<Speak>;

  private currentAssistantMessage: string;
  private currentUserMessage: string;

  private lastAwake: number;

  public messageList: Message[];

  public currentStreamIdx: number;

  public config?: ChatConfig;

  private onChatCompleteResolver?: () => void;
  public onChatComplete?: Promise<void>;


  constructor() {
    this.initialized = false;

    this.stream = null;
    this.reader = null;
    this.streams = [];
    this.readers = [];

    this.ttsJobs = new Queue<TTSJob>();
    this.speakJobs = new Queue<Speak>();

    this.currentAssistantMessage = "";
    this.currentUserMessage = "";

    this.messageList = [];
    this.currentStreamIdx = 0;

    this.lastAwake = 0;
  }

  public initialize(
    transcriber: Transcriber,
    amicaLife: AmicaLife,
    viewer: Viewer,
    setUserMessage: (message: string) => void,
    setAssistantMessage: (message: string) => void,
    setShownMessage: (role: Role) => void,
    setChatProcessing: (processing: boolean) => void,
    setChatSpeaking: (speaking: boolean) => void,
    setWhisperCppOutput: (output: any) => void,
    setWhisperOpenAIOutput: (output: any) => void,
    config: ChatConfig,
  ) {
    this.transcriber = transcriber;
    this.amicaLife = amicaLife;
    this.viewer = viewer;
    this.setUserMessage = setUserMessage;
    this.setAssistantMessage = setAssistantMessage;
    this.setShownMessage = setShownMessage;
    this.setChatProcessing = setChatProcessing;
    this.setChatSpeaking = setChatSpeaking;
    this.setWhisperCppOutput = setWhisperCppOutput;
    this.setWhisperOpenAIOutput = setWhisperOpenAIOutput;
    this.config = config;
    console.log("Config ", config)

    this.shouldStopProcessing = false;
    // these will run forever
    this.processTtsJobs();
    this.processSpeakJobs();

    this.updateAwake();
    this.initialized = true;
  }

  public setMessageList(messages: Message[]) {
    this.messageList = messages;
    this.currentAssistantMessage = "";
    this.currentUserMessage = "";
    // this.setChatLog!(this.messageList!);
    this.setAssistantMessage!(this.currentAssistantMessage);
    this.setUserMessage!(this.currentAssistantMessage);
    this.currentStreamIdx++;
  }

  public async handleRvc(audio: any) {
    const rvcParams = this.config?.rvc_params;
    const rvcUrl = rvcParams?.rvc_url!;
    const rvcModelName = rvcParams?.rvc_model_name!;
    const rvcIndexPath = rvcParams?.rvc_index_path!;
    const rvcF0upKey = parseInt(rvcParams?.rvc_f0_upkey!)!;
    const rvcF0Method = rvcParams?.rvc_f0_method!;
    const rvcIndexRate = rvcParams?.rvc_index_rate!;
    const rvcFilterRadius = parseInt(rvcParams?.rvc_filter_radius!);
    const rvcResampleSr = parseInt(rvcParams?.rvc_resample_sr!);
    const rvcRmsMixRate = parseInt(rvcParams?.rvc_rms_mix_rate!);
    const rvcProtect = parseInt(rvcParams?.rvc_protect!);

    const voice = await rvc(
      audio,
      rvcUrl,
      rvcModelName,
      rvcIndexPath,
      rvcF0upKey,
      rvcF0Method,
      rvcIndexRate,
      rvcFilterRadius,
      rvcResampleSr,
      rvcRmsMixRate,
      rvcProtect,
    );

    return voice.audio;
  }

  public idleTime(): number {
    return characterIdleTime(this.config?.amica_life_params.time_to_sleep_sec!,this.lastAwake);
  }

  public isAwake() {
    return !isCharacterIdle(this.config?.amica_life_params.time_to_sleep_sec!,this.lastAwake);
  }

  public updateAwake() {
    this.lastAwake = new Date().getTime();
    resetIdleTimer();
  }

  public async processTtsJobs() {
    while (!this.shouldStopProcessing) {
      do {
        if (this.shouldStopProcessing) return;

        const ttsJob = this.ttsJobs.dequeue();
        if (!ttsJob) break;

        if (ttsJob.streamIdx !== this.currentStreamIdx) {
          continue;
        }

        const audioBuffer = await this.fetchAudio(ttsJob.screenplay.talk);
        this.speakJobs.enqueue({
          audioBuffer,
          screenplay: ttsJob.screenplay,
          streamIdx: ttsJob.streamIdx,
        });
      } while (this.ttsJobs.size() > 0);
      await wait(50);
    }
  }

  public async processSpeakJobs() {
    while (!this.shouldStopProcessing) {
      do {
        if (this.shouldStopProcessing) return;

        const speak = this.speakJobs.dequeue();
        if (!speak) break;
        if (speak.streamIdx !== this.currentStreamIdx) continue;

        this.bubbleMessage("assistant", speak.screenplay.text);

        if (speak.audioBuffer) {
          this.setChatSpeaking!(true);
          await this.viewer!.model?.speak(speak.audioBuffer, speak.screenplay);
          this.setChatSpeaking!(false);
          if (this.isAwake()) this.updateAwake();
        }

        // Resolve full chat complete
        if (this.speakJobs.size() === 0 && this.ttsJobs.size() === 0) {
          this.onChatCompleteResolver?.();
        }
      } while (this.speakJobs.size() > 0);
      await wait(50);
    }
  }

  public async runFullInteraction(message: string, vision: boolean) {
    vision ? await this.getVisionResponse(message) : await this.receiveMessageFromUser(message,false);
    await wait(3000);
    await this.onChatComplete;
  }


  public bubbleMessage(role: Role, text: string) {
    // TODO: currentUser & Assistant message should be contain the message with emotion in it

    if (role === "user") {
      // add space if there is already a partial message
      if (this.currentUserMessage !== "") {
        this.currentUserMessage += " ";
      }
      this.currentUserMessage += text;
      this.setUserMessage!(this.currentUserMessage);
      this.setAssistantMessage!("");

      if (this.currentAssistantMessage !== "") {
        this.messageList!.push({
          role: "assistant",
          content: this.currentAssistantMessage,
        });

        this.currentAssistantMessage = "";
      }

      // this.setChatLog!([
      //   ...this.messageList!,
      //   { role: "user", content: this.currentUserMessage },
      // ]);
    }

    if (role === "assistant") {
      if (
        this.currentAssistantMessage != "" &&
        !this.isAwake() &&
        this.config?.amica_life_params.amica_life_enabled === "true"
      ) {
        this.messageList!.push({
          role: "assistant",
          content: this.currentAssistantMessage,
        });

        this.currentAssistantMessage = text;
        this.setAssistantMessage!(this.currentAssistantMessage);
      } else {
        this.currentAssistantMessage += text;
        this.setUserMessage!("");
        this.setAssistantMessage!(this.currentAssistantMessage);
      }

      if (this.currentUserMessage !== "") {
        this.messageList!.push({
          role: "user",
          content: this.currentUserMessage,
        });

        this.currentUserMessage = "";
      }

      // this.setChatLog!([
      //   ...this.messageList!,
      //   { role: "assistant", content: this.currentAssistantMessage },
      // ]);
    }

    this.setShownMessage!(role);
    console.debug("bubbler", this.messageList);
  }

  public async interrupt() {
    this.currentStreamIdx++;
    try {
      if (this.reader) {
        console.debug("cancelling");
        if (!this.reader?.closed) {
          await this.reader?.cancel();
        }
        // this.reader = null;
        // this.stream = null;
        console.debug("finished cancelling");
      }
    } catch (e: any) {
      console.error(e.toString());
    }

    // TODO if llm type is llama.cpp, we can send /stop message here
    this.ttsJobs.clear();
    this.speakJobs.clear();
    // TODO stop viewer from speaking
  }

  // this happens either from text or from voice / whisper completion
  public async receiveMessageFromUser(message: string, amicaLife: boolean) {
    if (message === null || message === "") {
      return;
    }

    this.onChatComplete = new Promise<void>((resolve) => {
      this.onChatCompleteResolver = resolve;
    });

    console.time("performance_interrupting");
    console.debug("interrupting...");
    await this.interrupt();
    console.timeEnd("performance_interrupting");
    await wait(0);
    console.debug("wait complete");

    if (!amicaLife) {
      console.log("receiveMessageFromUser", message);

      this.amicaLife?.receiveMessageFromUser(message);

      if (!/\[.*?\]/.test(message)) {
        message = `[neutral] ${message}`;
      }

      this.updateAwake();
      this.bubbleMessage("user", message);
    }

    // make new stream
    const messages: Message[] = [
      { role: "system", content: this.config?.system_prompt! },
      ...this.messageList!,
      { role: "user", content: amicaLife ? message : this.currentUserMessage },
    ];
    // console.debug('messages', messages);

    await this.makeAndHandleStream(messages);
  }

  public async makeAndHandleStream(messages: Message[]) {
    try {
      this.streams.push(await this.getChatResponseStream(messages));
    } catch (e: any) {
      const errMsg = e.toString();
      console.error("Failed to get chat response", errMsg);
      return errMsg;
    }

    if (this.streams[this.streams.length - 1] == null) {
      const errMsg = "Error: Null stream encountered.";
      console.error("Null stream encountered", errMsg);
      return errMsg;
    }

    return await this.handleChatResponseStream();
  }

  public async handleChatResponseStream() {
    if (this.streams.length === 0) {
      console.log("no stream!");
      return;
    }

    this.currentStreamIdx++;
    const streamIdx = this.currentStreamIdx;
    this.setChatProcessing!(true);

    console.time("chat stream processing");
    let reader = this.streams[this.streams.length - 1].getReader();
    this.readers.push(reader);
    let sentences = new Array<string>();

    let aiTextLog = "";
    let tag = "";
    let isThinking = false;
    let rolePlay = "";
    let receivedMessage = "";

    let firstTokenEncountered = false;
    let firstSentenceEncountered = false;
    console.time("performance_time_to_first_token");
    console.time("performance_time_to_first_sentence");

    try {
      while (true) {
        if (this.currentStreamIdx !== streamIdx) {
          console.log("wrong stream idx");
          break;
        }
        const { done, value } = await reader.read();
        if (!firstTokenEncountered) {
          console.timeEnd("performance_time_to_first_token");
          firstTokenEncountered = true;
        }
        if (done) break;

        receivedMessage += value;
        receivedMessage = receivedMessage.trimStart();

        const proc = processResponse({
          sentences,
          aiTextLog,
          receivedMessage,
          tag,
          isThinking,
          rolePlay,
          callback: (aiTalks: Screenplay[]): boolean => {
            // Generate & play audio for each sentence, display responses
            console.debug("enqueue tts", aiTalks);
            console.debug(
              "streamIdx",
              streamIdx,
              "currentStreamIdx",
              this.currentStreamIdx,
            );
            if (streamIdx !== this.currentStreamIdx) {
              console.log("wrong stream idx");
              return true; // should break
            }
            this.ttsJobs.enqueue({
              screenplay: aiTalks[0],
              streamIdx: streamIdx,
            });

            if (!firstSentenceEncountered) {
              console.timeEnd("performance_time_to_first_sentence");
              firstSentenceEncountered = true;
            }

            return false; // normal processing
          },
        });

        sentences = proc.sentences;
        aiTextLog = proc.aiTextLog;
        receivedMessage = proc.receivedMessage;
        tag = proc.tag;
        rolePlay = proc.rolePlay;
        if (proc.shouldBreak) {
          break;
        }
      }
    } catch (e: any) {
      const errMsg = e.toString();
      this.bubbleMessage!("assistant", errMsg);
      console.error(errMsg);
    } finally {
      if (!reader.closed) {
        reader.releaseLock();
      }
      console.timeEnd("chat stream processing");
      if (streamIdx === this.currentStreamIdx) {
        this.setChatProcessing!(false);
      }
    }

    return aiTextLog;
  }

  // TTS
  public async fetchAudio(talk: Talk): Promise<ArrayBuffer | null> {
    // TODO we should remove non-speakable characters
    // since this depends on the tts backend, we should do it
    // in their respective functions
    // this is just a simple solution for now
    talk = cleanTalk(talk);
    if (talk.message.trim() === "") {
      return null;
    }

    const params = this.config?.tts_params;
    const rvcParams = this.config?.rvc_params;
    const rvcEnabled = rvcParams?.rvc_enabled === "true";

    try {
      switch (this.config?.tts_backend) {
        case "none": {
          return null;
        }
        case "elevenlabs": {
          const p = params as TTSBackend["elevenlabs"]
          const voiceId = p?.elevenlabs_voiceid!;
          const voice = await elevenlabs(
            p,
            talk.message,
            voiceId,
          );
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "speecht5": {
          const p = params as TTSBackend["speecht5"]
          const speakerEmbeddingUrl = p?.speecht5_speaker_embedding_url!;
          const voice = await speecht5(talk.message, speakerEmbeddingUrl);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "openai_tts": {
          const voice = await openaiTTS(params as TTSBackend["openai_tts"], talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "localXTTS": {
          const voice = await localXTTSTTS(params as TTSBackend["localXTTS"], talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "piper": {
          const voice = await piper(params as TTSBackend["piper"], talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
        case "coquiLocal": {
          const voice = await coquiLocal(params as TTSBackend["coquiLocal"], talk.message);
          if (rvcEnabled) {
            return await this.handleRvc(voice.audio);
          }
          return voice.audio;
        }
      }
    } catch (e: any) {
      console.error("Failed to get TTS response", e.toString());
    }

    return null;
  }

  // Chatbot
  public async getChatResponseStream(messages: Message[]) {
    console.debug("getChatResponseStream", messages);
    const chatbotBackend = this.config?.chatbot_backend;
    const name = this.config?.name!;
    const system_prompt = this.config?.system_prompt!;
    const params = this.config?.chatbot_params;

    switch (chatbotBackend) {
      case "openai":
        return getOpenAiChatResponseStream(
          params as ChatbotBackend["openai"],
          messages,
        );
      case "llamacpp":
        return getLlamaCppChatResponseStream(
          params as ChatbotBackend["llamacpp"],
          name,
          system_prompt,
          messages,
        );
      case "windowai":
        return getWindowAiChatResponseStream(name, messages);
      case "ollama":
        return getOllamaChatResponseStream(
          params as ChatbotBackend["ollama"],
          messages,
        );
      case "koboldai":
        return getKoboldAiChatResponseStream(
          name,
          system_prompt,
          params as ChatbotBackend["koboldai"],
          messages,
        );
      case "openrouter":
        return getOpenRouterChatResponseStream(
          params as ChatbotBackend["openrouter"],
          messages,
        );
    }

    return getEchoChatResponseStream(messages);
  }

  // STT
  public async getSTTResponse() {
    let audio = await loadAudioAsFloat32Array("/sample-voice.wav");
    try {
      switch (this.config?.stt_backend) {
        case "whisper_browser": {
          console.debug("whisper_browser attempt");
          // since VAD sample rate is same as whisper we do nothing here
          // both are 16000
          const audioCtx = new AudioContext();
          const buffer = audioCtx.createBuffer(1, audio.length, 16000);
          buffer.copyToChannel(new Float32Array(audio), 0, 0);
          this.transcriber?.start(buffer);
          break;
        }
        case "whisper_openai": {
          console.debug("whisper_openai attempt");
          const wav = new WaveFile();
          wav.fromScratch(1, 16000, "32f", audio);
          const file = new File([new Uint8Array(wav.toBuffer())], "input.wav", { type: "audio/wav" });


          let prompt;
          // TODO load prompt if it exists

          (async () => {
            try {
              const transcript = await openaiWhisper(this.config?.stt_params.whisper_openai,file, prompt);
              this.setWhisperOpenAIOutput!(transcript);
            } catch (e: any) {
              console.error("whisper_openai error", e);
            }
          })();
          break;
        }
        case "whispercpp": {
          console.debug("whispercpp attempt");
          const wav = new WaveFile();
          wav.fromScratch(1, 16000, "32f", audio);
          wav.toBitDepth("16");
          const file = new File([new Uint8Array(wav.toBuffer())], "input.wav", { type: "audio/wav" });


          let prompt;
          // TODO load prompt if it exists

          (async () => {
            try {
              const transcript = await whispercpp(this.config?.stt_params.whispercpp,file, prompt);
              this.setWhisperCppOutput!(transcript);
            } catch (e: any) {
              console.error("whispercpp error", e);
            }
          })();
          break;
        }
      }
    } catch (e: any) {
      console.error("stt_backend error", e);
    }
  }

  // Vision
  public async getVisionResponse(imageData: string, onlyVisionResponse?: boolean) {
    try {
      const visionBackend = this.config?.vision_backend;
      const name = this.config?.name!;
      const vision_system_prompt = this.config?.vision_system_prompt!;
      const params = this.config?.vision_params;

      console.debug("vision_backend", visionBackend);

      this.onChatComplete = new Promise<void>((resolve) => {
        this.onChatCompleteResolver = resolve;
      });

      let res = "";
      if (visionBackend === "vision_llamacpp") {
        const messages: Message[] = [
          { role: "system", content: vision_system_prompt },
          ...this.messageList!,
          {
            role: "user",
            content: "Describe the image as accurately as possible",
          },
        ];

        res = await getLlavaCppChatResponse(
          name,
          vision_system_prompt,
          params as VisionBackend["vision_llamacpp"],
          messages,
          imageData,
        );
      } else if (visionBackend === "vision_ollama") {
        const messages: Message[] = [
          { role: "system", content: vision_system_prompt },
          ...this.messageList!,
          {
            role: "user",
            content: "Describe the image as accurately as possible",
          },
        ];

        res = await getOllamaVisionChatResponse(
          params as VisionBackend["vision_ollama"],
          messages,
          imageData,
        );
      } else if (visionBackend === "vision_openai") {
        const messages: Message[] = [
          { role: "user", content: vision_system_prompt },
          ...(this.messageList! as any[]),
          {
            role: "user",
            // @ts-ignore normally this is a string
            content: [
              {
                type: "text",
                text: "Describe the image as accurately as possible",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                },
              },
            ],
          },
        ];

        res = await getOpenAiVisionChatResponse(
          params as VisionBackend["vision_openai"],
          messages,
        );
      } else {
        console.warn("vision_backend not supported", visionBackend);
        return;
      }

      if (onlyVisionResponse) {
        return res;
      }

      await this.makeAndHandleStream([
        { role: "system", content: this.config?.system_prompt! },
        ...this.messageList!,
        {
          role: "user",
          content: `This is a picture I just took from my webcam (described between [[ and ]] ): [[${res}]] Please respond accordingly and as if it were just sent and as though you can see it.`,
        },
      ]);
    } catch (e: any) {
      console.error("Failed to get vision response ", e.toString());
    }
  }

  public stopProcessing() {
    console.log("Stopping all background processes...");
    this.shouldStopProcessing = true;

    // Cancel any readers or streams if needed
    this.interrupt();

    // You could also optionally clear queues
    this.ttsJobs.clear();
    this.speakJobs.clear();
  }
}

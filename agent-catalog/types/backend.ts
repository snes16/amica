export interface ChatbotBackend {
    openai?: {
      openai_url: string;
      openai_apikey: string;
      openai_model: string;
    };
    llamacpp?: {
      llamacpp_url: string;
      llamacpp_stop_sequence: string;
    };
    windowai?: Record<string, never>; 
    ollama?: {
      ollama_url: string;
      ollama_model: string;
    };
    koboldai?: {
      koboldai_url: string;
      koboldai_use_extra: string;
      koboldai_stop_sequence: string;
    };
    openrouter?: {
      openrouter_apikey: string;
      openrouter_url: string;
      openrouter_model: string;
    };
  }
  
  export interface AmicaLife {
    amicaLife : {
        amica_life_enabled: string;
        min_time_interval_sec: string;
        max_time_interval_sec: string;
        time_to_sleep_sec: string;
        idle_text_prompt: string;
    }
  }
  
  export interface TTSBackend {
    elvenlabs?: {
      elevenlabs_apikey: string;
      elevenlabs_voiceid: string;
      elvenlabs_model: string;
    };
    speecht5?: {
      speaker_embedding_url: string;
    };
    openai_tts?: {
      openai_tts_apikey: string;
      openai_tts_url: string;
      openai_tts_model: string;
      openai_tts_voice: string;
    };
    localXTTS?: {
      localXTTS_url: string;
      alltalk_version: string;
      alltalk_voice: string;
      alltalk_language: string;
      alltalk_rvc_voice: string;
      alltalk_rvc_pitch: string;
    };
    piper?: {
      piper_url: string;
    };
    coquiLocal?: {
      coquiLocal_url: string;
      coquiLocal_voiceid: string;
    };
  }
  
  export interface RVC {
    rvc_enabled: string;
    rvc_url: string;
    rvc_model_name: string;
    rvc_f0_upkey: string;
    rvc_f0_method: string;
    rvc_index_path: string;
    rvc_index_rate: string;
    rvc_filter_radius: string;
    rvc_resample_sr: string;
    rvc_rmx_mix_rate: string;
    rvc_protect: string;
  }
  
  export interface STTBackend {
    whisper_browser?: Record<string, never>; // No config
    whisper_openai?: {
      openai_whisper_url: string;
      openai_whisper_apikey: string;
      openai_whisper_model: string;
    };
    whispercpp?: {
      whispercpp_url: string;
    };
  }
  
  export interface VisionBackend {
    vision_llamacpp?: {
      vision_llamacpp_url: string;
    };
    vision_openai?: {
      vision_openai_apikey: string;
      vision_openai_url: string;
      vision_openai_model: string;
    };
    vision_ollama?: {
      vision_ollama_url: string;
      vision_ollama_model: string;
    };
  }
  
  // Root Config
  export interface FullConfig {
    chatbot_backend: ChatbotBackend;
    amica_life: AmicaLife;
    tts_backend: TTSBackend;
    rvc: RVC;
    stt_backend: STTBackend;
    vision_backend: VisionBackend;
  }
  
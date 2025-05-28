export const backendKeyMap: Record<string, string[]> = {
    openai: ["openai_url", "openai_apikey", "openai_model"],
    llamacpp: ["llamacpp_url", "llamacpp_stop_sequence"],
    windowai: [],
    ollama: ["ollama_url", "ollama_model"],
    koboldai: ["koboldai_url", "koboldai_use_extra", "koboldai_stop_sequence"],
    openrouter: ["openrouter_apikey", "openrouter_url", "openrouter_model"],
  
    elvenlabs: ["elevenlabs_apikey", "elevenlabs_voiceid", "elvenlabs_model"],
    speecht5: ["speaker_embedding_url"],
    openai_tts: ["openai_tts_apikey", "openai_tts_url", "openai_tts_model", "openai_tts_voice"],
    localXTTS: [
      "localXTTS_url", "alltalk_version", "alltalk_voice",
      "alltalk_language", "alltalk_rvc_voice", "alltalk_rvc_pitch"
    ],
    piper: ["piper_url"],
    coquiLocal: ["coquiLocal_url", "coquiLocal_voiceid"],
  
    whisper_browser: [],
    whisper_openai: ["openai_whisper_url", "openai_whisper_apikey", "openai_whisper_model"],
    whispercpp: ["whispercpp_url"],
  
    vision_llamacpp: ["vision_llamacpp_url"],
    vision_openai: ["vision_openai_apikey", "vision_openai_url", "vision_openai_model"],
    vision_ollama: ["vision_ollama_url", "vision_ollama_model"],

    amicaLife : ["amica_life_enabled", "min_time_interval_sec", "max_time_interval_sec", "time_to_sleep_sec", "idle_text_prompt"]
  };
  
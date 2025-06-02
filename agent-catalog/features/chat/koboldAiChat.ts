import { ChatbotBackend } from "@/types/backend";
import { Message } from "./messages";
import { buildPrompt } from "@/utils/buildPrompt";

interface KoboldAIParams {
  name: string,
  system_prompt: string,
  koboldai_stop_sequence: string,
  koboldai_url: string
}

export async function getKoboldAiChatResponseStream(name: string, system_prompt: string, config: ChatbotBackend["koboldai"],messages: Message[]) {
  if (config?.koboldai_use_extra === 'true') {
    return getExtra({name: name, system_prompt: system_prompt, koboldai_stop_sequence: config.koboldai_stop_sequence, koboldai_url: config.koboldai_url}, messages);
  } else {
    return getNormal({name: name, system_prompt: system_prompt, koboldai_stop_sequence: config?.koboldai_stop_sequence!, koboldai_url: config?.koboldai_url!},messages);
  }
}

// koboldcpp / stream support
async function getExtra(config: KoboldAIParams, messages: Message[]) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const prompt = buildPrompt({name: config.name!, system_prompt: config.system_prompt!},messages);
  const stop_sequence: string[] = [`${config.name}:`, ...`${config.koboldai_stop_sequence}`.split("||")];

  const res = await fetch(`${config.koboldai_url}/api/extra/generate/stream`, {
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      prompt,
      stop_sequence
    }),
  });

  const reader = res.body?.getReader();
  if (res.status !== 200 || ! reader) {
    throw new Error(`KoboldAi chat error (${res.status})`);
  }

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const decoder = new TextDecoder("utf-8");
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value);

          let eolIndex;
          while ((eolIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.substring(0, eolIndex).trim();
            buffer = buffer.substring(eolIndex + 1);

            if (line.startsWith('data:')) {
              try {
                const json = JSON.parse(line.substring(5));
                const messagePiece = json.token;
                if (messagePiece) {
                  controller.enqueue(messagePiece);
                }
              } catch (error) {
                console.error("JSON parsing error:", error, "in line:", line);
              }
            }
          }
        }
      } catch (error) {
        console.error("Stream error:", error);
        controller.error(error);
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
    async cancel() {
      await reader?.cancel();
      reader.releaseLock();
    }
  });

  return stream;
}

// koboldai / no stream support
async function getNormal(config: KoboldAIParams,messages: Message[]) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const prompt = buildPrompt({name: config.name!, system_prompt: config.system_prompt!},messages);
  const stop_sequence: string[] = [`${config.name}:`, ...`${config.koboldai_stop_sequence}`.split("||")];

  const res = await fetch(`${config.koboldai_url}/api/v1/generate`, {
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      prompt,
      stop_sequence
    }),
  });

  const json = await res.json();
  if (json.results.length === 0) {
    throw new Error(`KoboldAi result length 0`);
  }

  const text = json.results.map((row: {text: string}) => row.text).join('');

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      try {
        text.split(' ').map((word: string) => word + ' ').forEach((word: string) => {
          controller.enqueue(word);
        });
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}

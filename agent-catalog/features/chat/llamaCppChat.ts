import { ChatbotBackend, VisionBackend } from "@/types/backend";
import { Message } from "./messages";
import { buildPrompt, buildVisionPrompt } from "@/utils/buildPrompt";

export async function getLlamaCppChatResponseStream(config: ChatbotBackend["llamacpp"], name: string, system_prompt: string, messages: Message[]) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Connection": "keep-alive",
    "Accept": "text/event-stream",
  };
  const prompt = buildPrompt({ name: name, system_prompt: system_prompt },messages);
  const stop: string[] = [`${name}:`, ...`${config?.llamacpp_stop_sequence}`.split("||")];
  const res = await fetch(`${config?.llamacpp_url}/completion`, {
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      stream: true,
      n_predict: 400,
      temperature: 0.7,
      cache_prompt: true,
      stop,
      prompt,
    }),
  });

  const reader = res.body?.getReader();
  if (res.status !== 200 || ! reader) {
    throw new Error(`LlamaCpp chat error (${res.status})`);
  }

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const decoder = new TextDecoder("utf-8");
      try {
        // sometimes the response is chunked, so we need to combine the chunks
        let combined = "";
        let cont = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done || ! cont) break;
          const data = decoder.decode(value);
          const chunks = data
            .split("data:")
            .filter((val) => !!val && val.trim() !== "[DONE]");

          for (const chunk of chunks) {
            // skip comments
            if (chunk.length > 0 && chunk[0] === ":") {
              continue;
            }
            combined += chunk;

            try {
              const json = JSON.parse(combined);
              if (json.stop) {
                cont = false;
              }
              const messagePiece = json.content;
              combined = "";
              if (!!messagePiece) {
                controller.enqueue(messagePiece);
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      } catch (error) {
        console.error(error);
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

export async function getLlavaCppChatResponse(name: string, vision_system_prompt: string, config: VisionBackend["vision_llamacpp"],messages: Message[], imageData: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Connection": "keep-alive",
    "Accept": "text/event-stream",
  };
  const prompt = buildVisionPrompt({name: name, vision_system_prompt: vision_system_prompt},messages);

  const res = await fetch(`${config?.vision_llamacpp_url}/completion`, {
    headers: headers,
    method: "POST",
    body: JSON.stringify({
      stream: true,
      n_predict: 400,
      temperature: 0.7,
      cache_prompt: true,
      stop: [
        "</s>",
        `${name}:`,
        "User:"
      ],
      image_data: [{
        data: imageData,
        id: 10,
      }],
      prompt,
    }),
  });

  if (! res.ok) {
    throw new Error(`LlamaCpp llava chat error (${res.status})`);
  }

  console.log('body', res.body);

  const reader = res.body?.getReader();
  if (res.status !== 200 || ! reader) {
    throw new Error(`LlamaCpp vision error (${res.status})`);
  }

  // Fetch the original image
  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const decoder = new TextDecoder("utf-8");
      try {
        // sometimes the response is chunked, so we need to combine the chunks
        let combined = "";
        let cont = true;
        while (true) {
          const { done, value } = await reader.read();
          if (done || ! cont) break;
          const data = decoder.decode(value);
          const chunks = data
            .split("data:")
            .filter((val) => !!val && val.trim() !== "[DONE]");

          for (const chunk of chunks) {
            // skip comments
            if (chunk.length > 0 && chunk[0] === ":") {
              continue;
            }
            combined += chunk;

            try {
              const json = JSON.parse(combined);
              if (json.stop) {
                cont = false;
              }
              const messagePiece = json.content;
              combined = "";
              if (!!messagePiece) {
                controller.enqueue(messagePiece);
              }
            } catch (error) {
              console.error(error);
            }
          }
        }
      } catch (error) {
        console.error(error);
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

  const sreader = await stream.getReader();

  let combined = "";
  while (true) {
    const { done, value } = await sreader.read();
    if (done) break;
    combined += value;
  }

  return combined;
}

import { buildPrompt } from "@/utils/buildPrompt";
import { ArbiusModel } from "@/features/arbius/arbius";
import { Message } from "./messages";

export async function getArbiusChatResponseStream(messages: Message[], arbiusModel: ArbiusModel) {
  const prompt = buildPrompt(messages);
  const message = await arbiusModel.getArbiusModelResponse(prompt);

  if (!message) {
    throw new Error("Arbius chat error: no message");
  }

  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      try {
        let lastMessage = message;
        const lastChar = lastMessage.length > 0 ? lastMessage[lastMessage.length - 1] : ' ';
        if (lastChar !== '.' && lastChar !== '?' && lastChar !== '!') {
          lastMessage += ".";
        }

        lastMessage.split(' ').map((word) => word + ' ').forEach((word) => {
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
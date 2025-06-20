import { NextApiRequest } from "next";
import { sendToClients } from "./apiHelper";

export const handleSocialMediaActions = async (
  sessionId: string,
  req: NextApiRequest,
  message: string,
  socialMedia: string
): Promise<any> => {
  switch (socialMedia) {
    case "twitter": {
      if (typeof window === 'undefined') {
        const { getTwitterClient } = await import("../socialMedia/twitterClient");
        const twitterClient = getTwitterClient();
        return await twitterClient.postTweet(message);
      }
      return;
    }
    case "tg": {
      if (typeof window === 'undefined') {
        const { getTelegramClient } = await import("../socialMedia/telegramClient");
        const telegramClient = getTelegramClient();
        return await telegramClient.postMessage(message);
      }
      return;
    }
    case "none":
      sendToClients(sessionId, req, { type: "normal", data: message });
      return "Broadcasted to clients";
    default:
      throw new Error("No action taken for social media.");
  }
};

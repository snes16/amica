import { NextApiRequest } from "next";
import { sendToClients } from "./apiHelper";

export const handleSocialMediaActions = async (
  sessionId: string,
  req: NextApiRequest,
  message: string,
  socialMedia: string
): Promise<any> => {
  switch (socialMedia) {
    // case "twitter": {
    //   const { getTwitterClient } = await import("../socialMedia/twitterClient");
    //   const twitterClient = getTwitterClient();
    //   return await twitterClient.postTweet(message);
    // }
    // case "tg": {
    //   const { getTelegramClient } = await import("../socialMedia/telegramClient");
    //   const telegramClient = getTelegramClient();
    //   return await telegramClient.postMessage(message);
    // }
    case "none":
      sendToClients(sessionId, req, { type: "normal", data: message });
      return "Broadcasted to clients";
    default:
      throw new Error("No action taken for social media.");
  }
};

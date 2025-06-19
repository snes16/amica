import { config, defaults, prefixed } from "@/utils/config";
import {
  MAX_STORAGE_TOKENS,
  TimestampedPrompt,
} from "../amicaLife/eventHandler";
import { Message } from "../chat/messages";
import { writeStore } from "./memoryStore";
import { generateSessionId } from "./utils/apiHelper";

export const issueJWT = `/api/jwt`;
export const configUrl = `/api/dataHandler?type=config`;
export const userInputUrl = `/api/dataHandler?type=userInputMessages`;
export const subconsciousUrl = `/api/dataHandler?type=subconscious`;
export const logsUrl = `/api/dataHandler?type=logs`;
export const chatLogsUrl = `/api/dataHandler?type=chatLogs`;

export async function fetcher(method: string, url: URL | string, data?: any) {
  switch (method) {
    case "POST":
      try {
        await fetch(url, {
          method: method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error("Failed to POST server config: ", error);
      }
      break;

    default:
      break;
  }
}

export async function handleConfig(
  type: string,
  data?: Record<string, string>,
  sessionId?: string,
) {
  switch (type) {
    // Call this function at the beginning of your application to load the server config and sync to localStorage if needed.
    case "init":
      let localStorageData: Record<string, string> = {};

      for (const key in defaults) {
        const localKey = prefixed(key);
        const value = localStorage.getItem(localKey);

        if (value !== null) {
          localStorageData[key] = value;
        } else {
          // Append missing keys with default values
          localStorageData[key] = (<any>defaults)[key];
        }
      }

      // Sync update to server config
      const id = generateSessionId();
      localStorage.setItem(prefixed("session_id"), id);
      const response = await fetch(issueJWT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: localStorageData }),
      });

      let token: string = "";
      if (response.ok) {
        const json = await response.json();
        if (json.token) {
          token = json.token;
        }
      }

      return token;

    case "agent_route":
      const agentRouteResponse = await fetch(issueJWT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: data }),
      });

      if (data) {
        writeStore(sessionId!, "config", data);
      }

      let agentRouteToken: string = "";
      if (agentRouteResponse.ok) {
        const json = await agentRouteResponse.json();
        if (json.token) {
          agentRouteToken = json.token;
        }
      }

      return agentRouteToken;

    case "update":
      await fetcher("POST", configUrl, data);
      break;

    default:
      break;
  }
}

export async function handleUserInput(message: string) {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  fetch(`${userInputUrl}&sessionId=${config('session_id')}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemPrompt: config("system_prompt"),
      message: message,
    }),
  });
}

export async function handleChatLogs(messages: Message[]) {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  fetch(`${chatLogsUrl}&sessionId=${config('session_id')}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

export async function handleSubconscious(
  sessionId: string,
  timestampedPrompt: TimestampedPrompt,
) {
  if (config("external_api_enabled") !== "true") {
    return;
  }

  const response = await fetch(`${subconsciousUrl}&sessionId=${sessionId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(timestampedPrompt),
  });

  if (!response.ok) {
    throw new Error("Failed to update subconscious data");
  }
}

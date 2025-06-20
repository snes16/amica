import type { NextApiRequest, NextApiResponse } from "next";

import { config } from "@/utils/config";
import {
  handleSubconscious,
} from "@/features/externalAPI/externalAPI";

import {
  generateSessionId,
  sendError,
  apiLogEntry,
  ApiResponse,
} from "@/features/externalAPI/utils/apiHelper";
import {
  processNormalChat,
  triggerAmicaActions,
  updateSystemPrompt,
} from "@/features/externalAPI/processors/chatProcessor";
import { readStore, updateStore, writeStore } from "@/features/externalAPI/memoryStore";
import { getTokenVersion, verifyConfigJWT } from "@/features/externalAPI/jwt";
import { setServerContext } from "@/features/externalAPI/serverContext";

export const apiLogs: apiLogEntry[] = [];
export const sseClients: Record<string, Array<{ res: NextApiResponse }>> = {};

const JWT_SECRET = process.env.NEXT_PUBLIC_JWT_SECRET as string;

// Main Amica Handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method === "GET") {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return sendError(res, "", "sessionId is required", 400);
    }
    handleSSEConnection(req, res, sessionId)
    return ;
  }

  const { sessionId, inputType, payload, noProcessChat = false } = req.body;
  const timestamp = new Date().toISOString();
  if (!sessionId || typeof sessionId !== "string") {
    return sendError(res, "", "sessionId is required and must be a string", 400);
  }

  // Apply the config globally for the request
  setServerContext({sessionId});
  const configFromToken = validateRequest(sessionId, req, res);
  writeStore(sessionId, "config", configFromToken!);

  if (config("external_api_enabled") !== "true") {
    return sendError(res, sessionId, "API is currently disabled.", 503);
  }

  if (!inputType) {
    return sendError(res, sessionId, "inputType are required.");
  }

  try {
    const { response, outputType } = await processRequest(req, sessionId, inputType, payload);
    apiLogs.push({
      sessionId,
      timestamp,
      inputType,
      outputType,
      response,
    });
    res.status(200).json({ sessionId, outputType, response });
  } catch (error) {
    apiLogs.push({
      sessionId: sessionId,
      timestamp,
      inputType,
      outputType: "Error",
      error: String(error),
    });
    sendError(res, sessionId, String(error), 500);
  }
}

const validateRequest = (sessionId: string, req: NextApiRequest, res: NextApiResponse) => {
  // Check if JWT_SECRET is defined
  if (!JWT_SECRET) {
    return sendError(res, sessionId, "JWT Secret isn't defined", 500);
  }

  // Check for JWT token in the Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token) {
    return sendError(res, sessionId, "No JWT token provided", 401);
  }

  // Verify the JWT token
  try {
    const decoded = verifyConfigJWT(token);
    if (decoded?.tokenVersion !== getTokenVersion()) {
      return sendError(res, sessionId, "JWT token version is outdated", 401);

    }
    return decoded;
  } catch {
    return sendError(res, sessionId, "Invalid JWT token", 401);
  }
}

const processRequest = async (req: NextApiRequest, sessionId: string, inputType: string, payload: any) => {
  switch (inputType) {
    case "Normal Chat Message":
      return { response: await processNormalChat(payload), outputType: "Chat" };
    case "Memory Request":
      return { response: readStore(sessionId, "subconscious"), outputType: "Memory" };
    case "RPC Logs":
      return { response: readStore(sessionId, "logs"), outputType: "Logs" };
    case "RPC User Input Messages":
      return {
        response: readStore(sessionId, "userInputMessages"),
        outputType: "User Input",
      };
    case "Update System Prompt":
      return {
        response: await updateSystemPrompt(sessionId, req, payload),
        outputType: "Updated system prompt",
      };
    case "Brain Message":
      return {
        response: updateStore(sessionId,"subconscious", payload),
        outputType: "Added subconscious stored prompt",
      };
    case "Chat History":
      return { response: readStore(sessionId, "chatLogs"), outputType: "Chat History" };
    case "Reasoning Server":
      return {
        response: await triggerAmicaActions(sessionId, req, payload),
        outputType: "Actions",
      };
    default:
      throw new Error("Invalid input type");
  }
};

// Sub-functions
const handleSSEConnection = (
  req: NextApiRequest,
  res: NextApiResponse,
  sessionId: string,
): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");

  if (!sseClients[sessionId]) {
    sseClients[sessionId] = [];
  }

  sseClients[sessionId].push({ res });

  req.on("close", () => {
    console.log(`Client from session ${sessionId} disconnected`);
    sseClients[sessionId] = sseClients[sessionId].filter((client) => client.res !== res);
    if (sseClients[sessionId].length === 0) {
      delete sseClients[sessionId];
    }
    res.end();
  });
};

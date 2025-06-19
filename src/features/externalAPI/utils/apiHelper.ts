import { randomBytes } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { isAgentRoute } from "@/utils/agentUtils";

export interface ApiResponse {
  sessionId?: string;
  outputType?: string;
  response?: any;
  error?: string;
}

export interface apiLogEntry {
  sessionId: string;
  timestamp: string;
  inputType: string;
  outputType: string;
  response?: any;
  error?: string;
}

export const generateSessionId = (sessionId?: string): string =>
  sessionId || randomBytes(8).toString("hex");

export const sendError = (
  res: NextApiResponse,
  sessionId: string,
  message: string,
  status = 400,
) => res.status(status).json({ sessionId, error: message });

export const sendToClients = async (req: NextApiRequest, message: { type: string; data: any }) => {
  const isAgentRoute = req.url?.startsWith('/api/agent/') ?? false;
  const handlerModule = isAgentRoute
      ? await import('@/pages/api/agent/[id]/amicaHandler')
      : await import('@/pages/api/amicaHandler');
  const sseClients = handlerModule.sseClients;
  
    
  const formattedMessage = JSON.stringify(message);
  sseClients.forEach((client) => client.res.write(`data: ${formattedMessage}\n\n`));
};

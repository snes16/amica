import type { NextApiRequest, NextApiResponse } from 'next';
import { MemoryData, readStore, updateStore } from '@/features/externalAPI/memoryStore';
import { sendError } from '@/features/externalAPI/utils/apiHelper';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type, sessionId } = req.query;

  if (!['config', 'subconscious', 'logs', 'userInputMessages', 'chatLogs'].includes(type as string)) {
    return sendError(res, "", "Invalid type dataHandler type", 400);
  }

  if (!sessionId || typeof sessionId !== "string") {
      return sendError(res, "", "sessionId is required and must be a string", 400);
    }

  try {
    switch (req.method) {
      case 'GET':
        return handleGetRequest(type as keyof MemoryData, sessionId, res);
      case 'POST':
        return handlePostRequest(type as keyof MemoryData, sessionId, req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return sendError(res, "", `Method ${req.method} Not Allowed`, 405);
    }
  } catch (error: any) {
    return sendError(res, "", `Internal Server Error: ${error.message}`, 500);
  }
}

const handleGetRequest = (type: keyof MemoryData, sessionId: string,res: NextApiResponse) => {
    let data;
    if (["config","subconscious","logs","userInputMessages","chatLogs"].includes(type)) {
      data = readStore(sessionId, type);
      res.status(200).json(data);
    } else {
      return sendError(res, "", "Invalid dataHandler type", 400);
    }
  };

  const handlePostRequest = (type: keyof MemoryData, sessionId: string, req: NextApiRequest, res: NextApiResponse) => {
    const { body } = req;
    let response;

    if (["config","subconscious","logs","userInputMessages","chatLogs"].includes(type)) {
      response = updateStore(sessionId, type,body);
      res.status(200).json(response);
    } else {
      return sendError(res, "", "Invalid dataHandler type", 400);
    }
  
    res.status(200).json(response);
  };
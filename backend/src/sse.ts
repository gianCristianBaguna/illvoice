import { Response } from 'express';

export interface SSEClient {
  userId: string;
  res: Response;
}

const clients = new Map<string, SSEClient[]>();

export function addClient(userId: string, res: Response) {
  const existing = clients.get(userId) || [];
  existing.push({ userId, res });
  clients.set(userId, existing);
}

export function removeClient(userId: string, res: Response) {
  const existing = clients.get(userId) || [];
  const filtered = existing.filter(client => client.res !== res);
  if (filtered.length === 0) {
    clients.delete(userId);
  } else {
    clients.set(userId, filtered);
  }
}

export function broadcastToUser(userId: string, data: any) {
  const userClients = clients.get(userId) || [];
  userClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('Failed to send SSE message:', err);
    }
  });
}

export function setupSSEHeaders(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

export function sendSSEKeepAlive(res: Response) {
  res.write(':\n\n');
}

export function sendSSEError(res: Response, error: string) {
  res.write(`event: error\ndata: ${JSON.stringify({ error })}\n\n`);
}

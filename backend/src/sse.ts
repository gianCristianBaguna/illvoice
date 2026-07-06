import { type Request, type Response } from 'express';

interface SSEClient {
  res: Response;
}

const clients = new Map<string, SSEClient[]>();

export function addClient(userId: string, res: Response) {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId)!.push({ res });
}

export function removeClient(userId: string, res: Response) {
  const userClients = clients.get(userId);
  if (userClients) {
    const index = userClients.findIndex(client => client.res === res);
    if (index > -1) {
      userClients.splice(index, 1);
    }
    if (userClients.length === 0) {
      clients.delete(userId);
    }
  }
}

export function broadcastToUser(userId: string, data: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    userClients.forEach(client => {
      try {
        client.res.write(message);
      } catch (err) {
        console.error('Failed to send SSE message:', err);
      }
    });
  }
}

export function setupSSEHeaders(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
}

export function sendSSEKeepAlive(res: Response) {
  res.write(':\n\n');
}

export function sendSSEError(res: Response, error: string) {
  res.write(`error: ${error}\n\n`);
}
import type { IncomingHttpHeaders } from 'node:http';

export interface VercelRequest {
  method?: string;
  body?: any;
  headers: IncomingHttpHeaders;
}

export interface VercelResponse {
  setHeader(name: string, value: string): VercelResponse;
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
}

export function requireMethod(req: VercelRequest, res: VercelResponse, method: 'GET' | 'POST'): boolean {
  if (req.method === method) return true;
  res.setHeader('Allow', method).status(405).json({ error: 'Method not allowed' });
  return false;
}

export function serverError(res: VercelResponse, error: unknown): void {
  console.error('Notification API error:', error);
  res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
}

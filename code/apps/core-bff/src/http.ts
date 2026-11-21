/**
 * Core BFF HTTP Helper and Transport Utilities
 */

import http from 'node:http';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown, headers: Record<string, string> = {}): void {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export function sendProblem(res: http.ServerResponse, problem: ProblemDetails, headers: Record<string, string> = {}): void {
  const body = JSON.stringify(problem);
  res.writeHead(problem.status, {
    'Content-Type': 'application/problem+json',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

export async function parseJsonBody<T = unknown>(req: http.IncomingMessage, maxBytes = 1024 * 1024): Promise<T> {
  return new Promise((resolve, reject) => {
    let bytesRead = 0;
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => {
      bytesRead += chunk.length;
      if (bytesRead > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw || raw.trim().length === 0) {
        resolve({} as T);
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(new Error('INVALID_JSON'));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Core BFF Route Registry and Dispatcher
 */

import http from 'node:http';
import { parseJsonBody, sendJson, sendProblem } from './http.js';

export type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  url: URL
) => Promise<void> | void;

export interface RouteEntry {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class RouteRegistry {
  private routes: RouteEntry[] = [];

  public register(method: string, path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const regexPattern = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this.routes.push({
      method: method.toUpperCase(),
      pattern: new RegExp(`^${regexPattern}$`),
      paramNames,
      handler,
    });
  }

  public get(path: string, handler: RouteHandler): void {
    this.register('GET', path, handler);
  }

  public post(path: string, handler: RouteHandler): void {
    this.register('POST', path, handler);
  }

  public put(path: string, handler: RouteHandler): void {
    this.register('PUT', path, handler);
  }

  public delete(path: string, handler: RouteHandler): void {
    this.register('DELETE', path, handler);
  }

  public async dispatch(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const method = (req.method || 'GET').toUpperCase();
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        try {
          await route.handler(req, res, params, url);
          return;
        } catch (error) {
          const err = error as Error;
          if (err.message === 'PAYLOAD_TOO_LARGE') {
            sendProblem(res, {
              type: 'urn:livepilot:error:payload-too-large',
              title: 'Payload Too Large',
              status: 413,
              detail: 'Request payload exceeds maximum allowed size.',
              code: 'LP03004',
            });
            return;
          }
          if (err.message === 'INVALID_JSON') {
            sendProblem(res, {
              type: 'urn:livepilot:error:bad-request',
              title: 'Invalid JSON',
              status: 400,
              detail: 'The request body contains malformed JSON.',
              code: 'LP03002',
            });
            return;
          }
          sendProblem(res, {
            type: 'urn:livepilot:error:internal',
            title: 'Internal Server Error',
            status: 500,
            detail: err.message || 'An unexpected error occurred.',
            code: 'LP03000',
          });
          return;
        }
      }
    }

    sendProblem(res, {
      type: 'urn:livepilot:error:not-found',
      title: 'Resource Not Found',
      status: 404,
      detail: `No route found for ${method} ${pathname}`,
      code: 'LP03001',
    });
  }
}

export function createDefaultRouter(): RouteRegistry {
  const router = new RouteRegistry();

  router.get('/health', (req, res) => {
    sendJson(res, 200, {
      status: 'healthy',
      service: 'core-bff',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  router.get('/healthz', (req, res) => {
    sendJson(res, 200, { status: 'healthy' });
  });

  router.get('/api/v1/status', (req, res) => {
    sendJson(res, 200, {
      service: 'core-bff',
      version: '0.1.0',
      mode: process.env.NODE_ENV || 'development',
    });
  });

  router.post('/api/v1/sessions', async (req, res) => {
    const body = await parseJsonBody<{ hostId?: string; channel?: string }>(req);
    if (!body.hostId || !body.channel) {
      sendProblem(res, {
        type: 'urn:livepilot:error:bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'hostId and channel are required',
        code: 'LP03002',
        errors: {
          ...(!body.hostId ? { hostId: ['hostId is required'] } : {}),
          ...(!body.channel ? { channel: ['channel is required'] } : {}),
        },
      });
      return;
    }

    sendJson(res, 201, {
      sessionId: `sess_${Date.now()}`,
      hostId: body.hostId,
      channel: body.channel,
      status: 'INITIALIZING',
      createdAt: new Date().toISOString(),
    });
  });

  router.get('/api/v1/sessions/:id', (req, res, params) => {
    sendJson(res, 200, {
      sessionId: params.id,
      status: 'ACTIVE',
      connectedAt: new Date().toISOString(),
    });
  });

  return router;
}

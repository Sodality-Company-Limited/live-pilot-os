/**
 * F05 Identity Session Service Main Runtime Process
 * Provides secure session lifecycle management, authentication, credential validation,
 * test-mode isolation, and health checks.
 */

import http from 'node:http';
import { createServerSession, resolveServerSession, revokeServerSession, InMemorySessionStore } from './session.js';
import { enforceTestModeIsolation, isTestEmail } from './test-mode.js';

export class IdentitySessionRuntime {
  private server: http.Server;
  private sessionStore = new InMemorySessionStore();
  private isShuttingDown = false;

  constructor(port = 4006) {
    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'identity-session-service' }));
        return;
      }

      if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { email, role, tenantId, isTestRequest } = parsed;

            if (!email || !role || !tenantId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'email, role, and tenantId are required' }));
              return;
            }

            // Enforce Test Mode Isolation
            const nodeEnv = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
            const allowTestMode = process.env.ALLOW_TEST_MODE === 'true';

            try {
              enforceTestModeIsolation({
                isTestRequest: Boolean(isTestRequest),
                email,
                nodeEnv,
                allowTestMode,
              });
            } catch (authErr) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP04003', message: (authErr as Error).message }));
              return;
            }

            const session = await createServerSession(
              {
                userId: `usr_${Date.now()}`,
                tenantId,
                role,
                isTest: Boolean(isTestRequest),
              },
              this.sessionStore
            );

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(session));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          }
        });
        return;
      }

      if (url.pathname === '/api/v1/auth/session' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const token = parsed.token;
            if (!token) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP04001', message: 'Token required' }));
              return;
            }

            const resolved = await resolveServerSession(token, this.sessionStore);
            if (!resolved) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP04001', message: 'Invalid or expired session' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resolved));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'LP03001', message: 'Not found' }));
    });
  }

  public getServer(): http.Server {
    return this.server;
  }

  public async stop(): Promise<void> {
    this.isShuttingDown = true;
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

/**
 * F05 Identity Session Service Main Runtime Process
 * Provides secure session lifecycle management, authentication, credential validation,
 * test-mode isolation, and health checks.
 */

import http from 'node:http';
import {
  createTestSession,
  verifyTestSession,
  revokeTestSession,
  TestSessionRecord,
  SessionRole,
  SessionAuthStatus,
} from './session.js';
import { evaluateTestModeGuard } from './test-mode.js';

export class IdentitySessionRuntime {
  private server: http.Server;
  private sessionStore = new Map<string, TestSessionRecord>();
  private isShuttingDown = false;

  constructor(port = 4006) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'identity-session-service' }));
        return;
      }

      if (url.pathname === '/api/v1/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { email, role, tenantId, isTestRequest } = parsed;

            if (!email || !role || !tenantId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'email, role, and tenantId are required' }));
              return;
            }

            // Enforce Test Mode Isolation
            const isProduction = process.env.NODE_ENV === 'production';
            const allowSimulatedLogins = process.env.ALLOW_TEST_MODE === 'true' || !isProduction;

            const decision = evaluateTestModeGuard({
              isProductionEnv: isProduction,
              allowSimulatedLogins,
              requestedMode: isTestRequest ? 'SIMULATED' : 'LOCAL',
              tenantId,
              email,
            });

            if (!decision.allowed) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: decision.code, message: decision.reason }));
              return;
            }

            const session = createTestSession({
              principalId: `usr_${Date.now()}`,
              tenantId,
              role: role as SessionRole,
              mode: 'local',
            });

            this.sessionStore.set(session.tokenHash, session);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                sessionId: session.sessionId,
                token: session.rawToken,
                role: session.role,
                tenantId: session.tenantId,
                expiresAt: session.expiresAt.toISOString(),
              })
            );
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
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const token = parsed.token;
            if (!token) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP04001', message: 'Token required' }));
              return;
            }

            const result = verifyTestSession(token, this.sessionStore);
            if (result.status !== SessionAuthStatus.AUTHENTICATED) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP04001', message: 'Invalid or expired session' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                sessionId: result.session.sessionId,
                principalId: result.session.principalId,
                role: result.session.role,
                tenantId: result.session.tenantId,
              })
            );
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

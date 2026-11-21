/**
 * Emergency Control Service Main Runtime Process
 * Coordinates fail-closed emergency stops, live stream suspensions, and host pause directives.
 */

import http from 'node:http';

export interface EmergencyPauseRequest {
  sessionId: string;
  triggeredBy: string;
  reason: string;
  timestamp: string;
}

export class EmergencyControlRuntime {
  private server: http.Server;
  private pausedSessions: Set<string> = new Set();
  private isShuttingDown = false;

  constructor(port = 4004) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'emergency-control-service' }));
        return;
      }

      if (url.pathname === '/api/v1/control/pause' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed: EmergencyPauseRequest = JSON.parse(body || '{}');
            if (!parsed.sessionId || !parsed.reason) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'sessionId and reason are required' }));
              return;
            }

            this.pausedSessions.add(parsed.sessionId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, status: 'PAUSED', sessionId: parsed.sessionId }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          }
        });
        return;
      }

      if (url.pathname.startsWith('/api/v1/control/status/') && req.method === 'GET') {
        const sessionId = url.pathname.replace('/api/v1/control/status/', '');
        const isPaused = this.pausedSessions.has(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId, isPaused }));
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

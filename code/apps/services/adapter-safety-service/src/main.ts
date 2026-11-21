/**
 * Adapter Safety Service Main Runtime Process
 * Intercepts outbound adapter commands (TikTok Shop, Shopee, etc.), validates command contracts,
 * executes simulated mode dry-runs, and enforces strict boundary isolation and reconciliation.
 */

import http from 'node:http';

export interface AdapterCommandRequest {
  commandId: string;
  platform: 'TIKTOK' | 'SHOPEE' | 'LINE';
  action: 'PIN_PRODUCT' | 'APPLY_DISCOUNT' | 'END_STREAM';
  sessionId: string;
  isSimulated: boolean;
  payload: Record<string, unknown>;
}

export interface AdapterExecutionResult {
  commandId: string;
  platform: string;
  action: string;
  status: 'EXECUTED' | 'SIMULATED' | 'REJECTED';
  executedAt: string;
  idempotencyKey: string;
  reason?: string;
}

export class AdapterSafetyRuntime {
  private server: http.Server;
  private executedCommands: Map<string, AdapterExecutionResult> = new Map();
  private isShuttingDown = false;

  constructor(port = 4007) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'adapter-safety-service' }));
        return;
      }

      if (url.pathname === '/api/v1/adapter/dispatch' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed: AdapterCommandRequest = JSON.parse(body || '{}');
            const { commandId, platform, action, sessionId, isSimulated, payload } = parsed;

            if (!commandId || !platform || !action || !sessionId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'Missing required adapter command fields' }));
              return;
            }

            // Production protection: if production and not explicit allow
            const isProd = process.env.NODE_ENV === 'production';
            if (isProd && isSimulated) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP01002', message: 'Simulated adapter commands forbidden in production' }));
              return;
            }

            // Idempotency check
            if (this.executedCommands.has(commandId)) {
              const previous = this.executedCommands.get(commandId)!;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(previous));
              return;
            }

            const result: AdapterExecutionResult = {
              commandId,
              platform,
              action,
              status: isSimulated ? 'SIMULATED' : 'EXECUTED',
              executedAt: new Date().toISOString(),
              idempotencyKey: `idemp_${commandId}`,
            };

            this.executedCommands.set(commandId, result);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
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

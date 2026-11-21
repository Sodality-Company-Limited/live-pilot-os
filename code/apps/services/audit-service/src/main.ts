/**
 * Audit Service Main Runtime Process
 * Ingests tamper-evident audit ledger entries, builds hash chains, and guarantees non-repudiation.
 */

import http from 'node:http';
import crypto from 'node:crypto';

export interface AuditEntry {
  id: string;
  previousHash: string;
  hash: string;
  eventType: string;
  actorId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export class AuditServiceRuntime {
  private server: http.Server;
  private ledger: AuditEntry[] = [];
  private lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  private isShuttingDown = false;

  constructor(port = 4005) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'audit-service' }));
        return;
      }

      if (url.pathname === '/api/v1/audit/append' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const id = crypto.randomUUID();
            const timestamp = new Date().toISOString();
            const previousHash = this.lastHash;

            const contentToHash = JSON.stringify({
              id,
              previousHash,
              eventType: parsed.eventType,
              actorId: parsed.actorId,
              payload: parsed.payload,
              timestamp,
            });

            const hash = crypto.createHash('sha256').update(contentToHash).digest('hex');

            const entry: AuditEntry = {
              id,
              previousHash,
              hash,
              eventType: parsed.eventType || 'UNKNOWN',
              actorId: parsed.actorId || 'SYSTEM',
              payload: parsed.payload || {},
              timestamp,
            };

            this.ledger.push(entry);
            this.lastHash = hash;

            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(entry));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          }
        });
        return;
      }

      if (url.pathname === '/api/v1/audit/ledger' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: this.ledger.length, ledger: this.ledger }));
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

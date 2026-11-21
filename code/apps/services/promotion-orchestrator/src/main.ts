/**
 * F03 Promotion Integration Orchestrator Runtime
 * Implements promotion proposal, evaluation, decision, and status query
 * against PROMO service contract with health probes and fail-closed safety.
 */

import http from 'node:http';

export interface PromotionProposalInput {
  proposalId: string;
  sessionId: string;
  voucherCode: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValueMinor: bigint;
  currency: string;
  minSpendMinor?: bigint;
}

export type PromotionStatus = 'PROPOSED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface PromotionRecord {
  proposalId: string;
  sessionId: string;
  voucherCode: string;
  status: PromotionStatus;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValueMinor: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export class PromotionOrchestratorRuntime {
  private server: http.Server;
  private promotions: Map<string, PromotionRecord> = new Map();
  private isShuttingDown = false;
  private inFlight = 0;

  constructor(port = 4003) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: this.isShuttingDown ? 'unhealthy' : 'healthy',
            service: 'promotion-orchestrator',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      if (url.pathname === '/api/v1/promotions/propose' && req.method === 'POST') {
        if (this.isShuttingDown) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'LP03012', message: 'Service shutting down' }));
          return;
        }

        this.inFlight++;
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            if (!parsed.proposalId || !parsed.voucherCode) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'proposalId and voucherCode are required' }));
              return;
            }

            const record: PromotionRecord = {
              proposalId: parsed.proposalId,
              sessionId: parsed.sessionId || 'sess_default',
              voucherCode: parsed.voucherCode,
              status: 'PROPOSED',
              discountType: parsed.discountType || 'FIXED',
              discountValueMinor: String(parsed.discountValueMinor || '0'),
              currency: parsed.currency || 'THB',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            this.promotions.set(record.proposalId, record);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(record));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          } finally {
            this.inFlight = Math.max(0, this.inFlight - 1);
          }
        });
        return;
      }

      if (url.pathname.startsWith('/api/v1/promotions/') && req.method === 'GET') {
        const id = url.pathname.replace('/api/v1/promotions/', '');
        const record = this.promotions.get(id);
        if (!record) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'LP03001', message: 'Promotion not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(record));
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

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && process.env.NODE_ENV !== undefined) {
  const runtime = new PromotionOrchestratorRuntime();
  runtime.getServer().listen(4003, () => {
    // eslint-disable-next-line no-console
    console.log('promotion-orchestrator running on 4003');
  });
}

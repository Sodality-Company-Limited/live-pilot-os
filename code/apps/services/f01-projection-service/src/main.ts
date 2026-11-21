/**
 * F01 Projection Service Main Runtime Process
 * Ingests live telemetry & session events, maintains reconstructable materialized projections,
 * tracks cursor checkpoints, and exposes HTTP health & query endpoints.
 */

import http from 'node:http';

export interface IngestedEvent {
  eventId: string;
  sequence: number;
  sessionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface SessionOverviewProjection {
  sessionId: string;
  lastSequence: number;
  activeViewers: number;
  salesCount: number;
  lastUpdated: string;
}

export class F01ProjectionRuntime {
  private server: http.Server;
  private projections: Map<string, SessionOverviewProjection> = new Map();
  private cursorCheckpoints: Map<string, number> = new Map();
  private isShuttingDown = false;

  constructor(port = 4008) {
    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', service: 'f01-projection-service' }));
        return;
      }

      if (url.pathname === '/api/v1/projections/ingest' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          try {
            const event: IngestedEvent = JSON.parse(body || '{}');
            if (!event.eventId || !event.sessionId || event.sequence === undefined) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ code: 'LP03002', message: 'eventId, sessionId, and sequence are required' }));
              return;
            }

            const current = this.projections.get(event.sessionId) || {
              sessionId: event.sessionId,
              lastSequence: 0,
              activeViewers: 0,
              salesCount: 0,
              lastUpdated: new Date().toISOString(),
            };

            // Deduplicate or ignore out-of-order events
            if (event.sequence > current.lastSequence) {
              current.lastSequence = event.sequence;
              if (event.eventType === 'VIEWER_JOIN') current.activeViewers++;
              if (event.eventType === 'VIEWER_LEAVE') current.activeViewers = Math.max(0, current.activeViewers - 1);
              if (event.eventType === 'SALE_COMPLETED') current.salesCount++;
              current.lastUpdated = new Date().toISOString();

              this.projections.set(event.sessionId, current);
              this.cursorCheckpoints.set(event.sessionId, event.sequence);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, current }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          }
        });
        return;
      }

      if (url.pathname.startsWith('/api/v1/projections/session/') && req.method === 'GET') {
        const sessionId = url.pathname.replace('/api/v1/projections/session/', '');
        const projection = this.projections.get(sessionId);
        if (!projection) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ code: 'LP03001', message: 'Projection not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(projection));
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

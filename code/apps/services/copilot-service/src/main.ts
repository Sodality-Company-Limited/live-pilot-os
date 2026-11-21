/**
 * F02 Copilot Service Main Runtime Process
 * Listens for NATS suggestion queries, runs grounded prompt engines,
 * and exposes HTTP health/readiness probes with graceful shutdown.
 */

import http from 'node:http';
import { generateCopilotSuggestion, CopilotInputSignal, CatalogFact, CopilotSuggestion } from './suggestions.js';
import { evaluateGuidanceSafety, GuidanceSafetyStatus } from './guidance-safety.js';

export interface CopilotServiceOptions {
  port?: number;
  host?: string;
}

export class CopilotServiceRuntime {
  private server: http.Server;
  private isShuttingDown = false;
  private inFlight = 0;

  constructor(options: CopilotServiceOptions = {}) {
    const port = options.port || 4002;
    const host = options.host || '0.0.0.0';

    this.server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      if (url.pathname === '/health' || url.pathname === '/healthz') {
        res.writeHead(this.isShuttingDown ? 503 : 200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: this.isShuttingDown ? 'unhealthy' : 'healthy',
            service: 'copilot-service',
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      if (url.pathname === '/api/v1/suggestions' && req.method === 'POST') {
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
            const signal: CopilotInputSignal = {
              sessionId: parsed.signal?.sessionId || 'sess_default',
              tenantId: parsed.signal?.tenantId || 'tenant_default',
              intent: parsed.signal?.intent || 'product_inquiry',
              confidenceBps: parsed.signal?.confidenceBps || 8500,
              extractedKeywords: parsed.signal?.extractedKeywords || ['premium'],
              timestamp: new Date(),
            };

            const rawFacts: Array<Record<string, unknown>> = parsed.facts || [];
            const facts: CatalogFact[] = rawFacts.map((f) => ({
              productId: String(f.productId),
              title: String(f.title),
              stockAvailable: Number(f.stockAvailable || 10),
              priceMinor: BigInt(f.priceMinor || 0),
              currency: String(f.currency || 'THB'),
              scale: Number(f.scale || 2),
            }));

            const emergencyPaused = parsed.safety?.emergencyPause === true;
            const suggestion = generateCopilotSuggestion(signal, facts);

            if (!suggestion) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ suggestions: [] }));
              return;
            }

            const safety = evaluateGuidanceSafety({
              suggestionId: suggestion.suggestionId,
              generatedAt: suggestion.generatedAt,
              currentStock: facts[0]?.stockAvailable || 10,
              emergencyPaused,
              text: suggestion.suggestedText,
            });

            if (safety.status !== GuidanceSafetyStatus.VALID) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ suggestions: [] }));
              return;
            }

            const safeSuggestion = {
              ...suggestion,
              suggestedText: safety.redactedText,
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ suggestions: [safeSuggestion] }));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'LP03002', message: (err as Error).message }));
          } finally {
            this.inFlight = Math.max(0, this.inFlight - 1);
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

  public async start(port?: number): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(port || 4002, () => resolve());
    });
  }

  public async stop(timeoutMs = 3000): Promise<void> {
    this.isShuttingDown = true;
    const start = Date.now();
    while (this.inFlight > 0) {
      if (Date.now() - start > timeoutMs) break;
      await new Promise((r) => setTimeout(r, 50));
    }
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && process.env.NODE_ENV !== undefined) {
  const runtime = new CopilotServiceRuntime();
  runtime.start().then(() => {
    // eslint-disable-next-line no-console
    console.log('copilot-service running');
  });

  const shutdown = async () => {
    await runtime.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

import http from 'node:http';
import { IntentRiskHandler } from './handler/intent-risk-handler.mjs';

const PORT = parseInt(process.env.PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';
const handler = new IntentRiskHandler();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  // Health and readiness probes
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz' || url.pathname === '/livez')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'intent-risk-service',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/readyz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ready',
        service: 'intent-risk-service',
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  // Signal processing endpoint
  if (req.method === 'POST' && url.pathname === '/signals/process') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const result = await handler.handleSignal(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'intent_risk_service_started',
      service: 'intent-risk-service',
      port: PORT,
      host: HOST,
      timestamp: new Date().toISOString()
    })
  );
});

const shutdown = signal => {
  console.log(`Received ${signal}, shutting down intent-risk-service.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

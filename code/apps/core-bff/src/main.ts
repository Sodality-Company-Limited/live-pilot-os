/**
 * Core BFF Service - Bootstrap & Main HTTP Server
 * Ingress gateway routing authenticated requests to backend microservices.
 */

import http from 'node:http';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export function createCoreBffServer(): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health' || url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'core-bff',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
      return;
    }

    if (url.pathname === '/api/v1/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          service: 'core-bff',
          version: '0.1.0',
          mode: process.env.NODE_ENV || 'development',
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'LP03001', message: 'Not found' }));
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && process.env.NODE_ENV !== undefined) {
  const server = createCoreBffServer();
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`core-bff running on http://${HOST}:${PORT}`);
  });

  const handleShutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}, shutting down core-bff...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed, exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

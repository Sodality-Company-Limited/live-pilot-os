/**
 * Identity and Session Service - Main Runtime Entrypoint
 * Configured for DigitalOcean Production/Staging Droplet
 * Implements graceful shutdown, non-root user execution, and health probes.
 */

import http from 'node:http';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export function createServer(): http.Server {
  return http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health' || url.pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          service: 'identity-session-service',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'LP03001', message: 'Route not found' }));
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`identity-session-service running on http://${HOST}:${PORT}`);
  });

  const handleShutdown = (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}, initiating graceful shutdown...`);
    server.close(() => {
      // eslint-disable-next-line no-console
      console.log('HTTP server closed, exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

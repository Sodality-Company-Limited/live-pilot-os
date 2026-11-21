/**
 * Core BFF Service - Bootstrap & Main HTTP Server
 * Ingress gateway routing authenticated requests to backend microservices.
 */

import http from 'node:http';
import { createDefaultRouter, RouteRegistry } from './routes.js';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

export function createCoreBffServer(router: RouteRegistry = createDefaultRouter()): http.Server {
  return http.createServer((req, res) => {
    router.dispatch(req, res).catch((err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'LP03000', message: err.message || 'Internal error' }));
    });
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

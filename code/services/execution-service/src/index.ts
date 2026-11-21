import http from 'node:http';

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3004;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'execution-service', timestamp: new Date().toISOString() }));
    return;
  }

  if (req.url === '/readyz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ready', service: 'execution-service' }));
    return;
  }

  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('# HELP execution_actions_total Total execution actions processed\n# TYPE execution_actions_total counter\nexecution_actions_total 0\n');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, () => {
    console.log(`execution-service listening on port ${port}`);
  });
}

export { server };

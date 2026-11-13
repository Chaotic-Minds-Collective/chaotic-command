import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { contentSecurityPolicy } from './csp.mjs';

// Edge wrapper for Chaotic Command.
// Runs the unchanged server.mjs on an internal loopback port and adds:
//   1. Static routes for brand imagery and the homepage tab script.
//   2. A CSP that additionally allows Google Fonts (styles + font files).
// Everything else is proxied verbatim to server.mjs.
const here = dirname(fileURLToPath(import.meta.url));
const externalPort = Number(process.env.PORT || 3000);
const internalPort = 3123 + (externalPort % 1000);
const CSP = contentSecurityPolicy({ fonts: true });
const staticRoutes = new Map([
  ['/favicon.png', ['favicon.png', 'image/png']],
  ['/brand-icon-128.png', ['brand-icon-128.png', 'image/png']],
  ['/brand-icon-180.png', ['brand-icon-180.png', 'image/png']],
  ['/og-image.png', ['og-image.png', 'image/png']],
  ['/home.js', ['home.js', 'text/javascript; charset=utf-8']]
]);

let stopping = false;
const child = spawn(process.execPath, [resolve(here, 'server.mjs')], {
  // Keep relative DATA_DIR paths anchored to the caller's working directory.
  // The script itself is resolved independently of that directory.
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(internalPort), HOST: '127.0.0.1' },
  stdio: 'inherit'
});
// Wait for the edge and backend to close before reporting shutdown to a supervisor.
let childClosed = false;
let edgeClosed = false;
let exitCode = 0;
let shutdownTimer;
/** Exit only after both servers have closed. */
function finish() {
  if (stopping && childClosed && edgeClosed) {
    clearTimeout(shutdownTimer);
    process.exit(exitCode);
  }
}
/** Stop accepting requests and wait for the backend, forcing shutdown after 30 seconds. */
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  exitCode = code;
  server.close(() => { edgeClosed = true; finish(); });
  server.closeIdleConnections();
  if (!childClosed) child.kill('SIGTERM');
  shutdownTimer = setTimeout(() => {
    exitCode = 1;
    server.closeAllConnections();
    if (!childClosed) child.kill('SIGKILL');
  }, 30000);
  finish();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
child.once('error', error => { console.error('Could not start server.mjs:', error.message); stop(1); });
child.once('close', (code, signal) => {
  childClosed = true;
  if (!stopping) {
    console.error(`server.mjs exited: ${signal || code}`);
    stop(code || 1);
  }
  finish();
});

/** Forward a request to the loopback backend and apply the edge CSP. */
function buildValidatedUrl(baseUrl, requestTarget) {
  try {
    if (requestTarget.includes('/../') || /\/%2e%2e\//i.test(requestTarget)) {
      throw new Error('Invalid path');
    }
    const base = new URL(baseUrl);
    const url = new URL(requestTarget, base);
    if (url.origin !== base.origin) {
      throw new Error('Invalid host');
    }
    return url.href;
  } catch {
    throw new Error('Invalid URL');
  }
}

const proxy = (req, res) => {
  let target;
  try {
    target = new URL(buildValidatedUrl(`http://127.0.0.1:${Number(internalPort)}`, req.url));
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', Connection: 'close' });
    res.end('{"error":"Invalid request target."}');
    return;
  }
  const upstream = http.request({ host: '127.0.0.1', port: internalPort, path: target.pathname + target.search, method: req.method, headers: req.headers }, upstreamRes => {
    const headers = { ...upstreamRes.headers };
    headers['content-security-policy'] = CSP;
    res.writeHead(upstreamRes.statusCode || 502, headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end('{"error":"Service is starting. Try again."}'); } });
  req.pipe(upstream);
};

const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', CSP);
  if ((process.env.APP_ORIGIN || '').startsWith('https:')) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  let path;
  try {
    path = new URL(req.url, 'http://localhost').pathname;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json', Connection: 'close' });
    res.end('{"error":"Invalid request target."}');
    return;
  }
  if (req.method === 'GET' && staticRoutes.has(path)) {
    try {
      const [file, type] = staticRoutes.get(path);
      res.writeHead(200, { 'Content-Type': type });
      res.end(readFileSync(resolve(here, 'web', file)));
    } catch {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end('{"error":"Not found."}');
    }
    return;
  }
  proxy(req, res);
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.once('error', error => { console.error('Edge server failed:', error.message); stop(1); });
server.listen(externalPort, process.env.HOST || '127.0.0.1', () => console.log('Chaotic Command edge listening. Open APP_ORIGIN in your browser.'));

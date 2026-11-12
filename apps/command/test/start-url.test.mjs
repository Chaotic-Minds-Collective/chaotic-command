import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = join(dirname(fileURLToPath(import.meta.url)), '..', 'start.mjs');

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function startWrapper(t, extraEnv = {}) {
  const port = await freePort();
  const dataDir = mkdtempSync(join(tmpdir(), 'cc-start-url-test-'));
  const child = spawn(process.execPath, [entry], {
    env: {
      PATH: process.env.PATH,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATA_DIR: dataDir,
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      ...extraEnv
    },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(async () => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise(resolve => child.once('exit', resolve));
        child.kill('SIGTERM');
        await exited;
      }
    } finally {
      if (process.platform !== 'win32' && child.pid) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const deadline = Date.now() + 20000;
  while (!(output.includes('edge listening') && output.includes('Chaotic Command listening'))) {
    if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) {
      throw new Error(`Wrapper did not start:\n${output}`);
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return { port, url: `http://127.0.0.1:${port}` };
}

/** Send the request line verbatim; fetch() would normalize dot segments first. */
function rawRequest(port, requestLine, headers = []) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => {
      socket.write([requestLine, 'Host: localhost', ...headers, 'Connection: close', '', ''].join('\r\n'));
    });
    let response = '';
    socket.on('data', chunk => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}

test('edge rejects an absolute request target with a different origin', async t => {
  const { port } = await startWrapper(t);
  const response = await rawRequest(port, 'GET http://example.com/api/health HTTP/1.1');
  assert.match(response, /^HTTP\/1\.1 400 /);
});

test('edge rejects literal parent-directory segments in raw request targets', async t => {
  const { port } = await startWrapper(t);
  const response = await rawRequest(port, 'GET /api/../api/health HTTP/1.1');
  assert.match(response, /^HTTP\/1\.1 400 /);
});

test('edge rejects percent-encoded parent-directory segments in raw request targets', async t => {
  const { port } = await startWrapper(t);
  const response = await rawRequest(port, 'GET /api/%2e%2e/api/health HTTP/1.1');
  assert.match(response, /^HTTP\/1\.1 400 /);
});

test('edge forwards query parameters on an allowed path', async t => {
  const { port, url } = await startWrapper(t, {
    DISCORD_CLIENT_ID: 'test-client-id',
    DISCORD_CLIENT_SECRET: 'test-client-secret',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters-long'
  });
  const login = await fetch(`${url}/auth/discord`, { redirect: 'manual' });
  assert.equal(login.status, 302);
  const state = new URL(login.headers.get('location')).searchParams.get('state');
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  assert.ok(state);

  // A valid state reaches the missing-code branch only if the query survives proxying.
  const response = await rawRequest(port, `GET /auth/callback?state=${state}&code= HTTP/1.1`, [`Cookie: ${cookie}`]);
  assert.match(response, /^HTTP\/1\.1 400 /);
  assert.match(response, /Discord sign-in was cancelled\./);
});

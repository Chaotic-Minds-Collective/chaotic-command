import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entry = join(dirname(fileURLToPath(import.meta.url)), '..', 'start.mjs');
const exitTimeout = 5000;

/** Wait for a process to exit without letting a shutdown regression hang the suite. */
function waitForExit(child, timeout = exitTimeout) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.off('exit', onExit);
      child.off('error', onError);
      const error = new Error(`Process ${child.pid} did not exit within ${timeout}ms`);
      error.code = 'EXIT_TIMEOUT';
      reject(error);
    }, timeout);
    const onExit = code => { clearTimeout(timer); child.off('error', onError); resolve(code); };
    const onError = error => { clearTimeout(timer); child.off('exit', onExit); reject(error); };
    child.once('exit', onExit);
    child.once('error', onError);
  });
}

/** Stop the wrapper and remove any backend left in its isolated process group. */
async function stopWrapper(child, timeout = exitTimeout) {
  let forced = false;
  if (child.exitCode === null && child.signalCode === null) {
    const exited = waitForExit(child, timeout);
    child.kill('SIGTERM');
    try {
      await exited;
    } catch (error) {
      if (error.code !== 'EXIT_TIMEOUT') throw error;
      forced = true;
      if (process.platform === 'win32') {
        await new Promise(resolve => execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], { timeout: exitTimeout }, resolve));
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch (killError) { if (killError.code !== 'ESRCH') throw killError; }
      }
      await waitForExit(child);
    }
  }
  if (process.platform !== 'win32' && child.pid) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  return forced;
}

/** Register cleanup before waiting for a wrapper to start. */
function cleanupWrapper(t, child, dataDir) {
  t.after(async () => {
    try {
      assert.equal(await stopWrapper(child), false, 'Wrapper needed forced termination');
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
}

/** Ask the OS for a free loopback port. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** True when nothing is listening on the port. */
function portIsFree(port) {
  return new Promise(resolve => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
}

/** Wait for a killed backend to release its listening socket. */
async function waitForPortToBeFree(port) {
  const deadline = Date.now() + exitTimeout;
  do {
    if (await portIsFree(port)) return true;
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  return false;
}

/** The wrapper's backend uses 3123 + (port % 1000), so that port must be free as well. */
async function freeWrapperPort() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const port = await freePort();
    if (await portIsFree(3123 + (port % 1000))) return port;
  }
  throw new Error('Could not find free ports for the wrapper test.');
}

/** Start the edge wrapper as its own process and wait until both the wrapper and the app server are ready. */
async function startWrapper(t, options = {}) {
  const port = await freeWrapperPort();
  const dataDir = mkdtempSync(join(tmpdir(), 'cc-start-test-'));
  const child = spawn(process.execPath, [entry], {
    cwd: options.cwd,
    env: { PATH: process.env.PATH, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, APP_ORIGIN: `http://127.0.0.1:${port}`, ...options.env },
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  cleanupWrapper(t, child, dataDir);
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const deadline = Date.now() + 20000;
  while (!(output.includes('edge listening') && output.includes('Chaotic Command listening'))) {
    if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) throw new Error(`Wrapper did not start:\n${output}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return { url: `http://127.0.0.1:${port}`, port, child };
}

test('wrapper serves the homepage script with the font-enabled policy', async t => {
  const { url } = await startWrapper(t);
  const response = await fetch(`${url}/home.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/javascript/);
  assert.match(response.headers.get('content-security-policy'), /style-src 'self' https:\/\/fonts\.googleapis\.com/);
  await response.body?.cancel();
});

test('wrapper serves the Apple touch icon without authentication', async t => {
  const { url } = await startWrapper(t);
  const response = await fetch(`${url}/brand-icon-180.png`, { redirect: 'manual' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/png');
  const png = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(png.readUInt32BE(16), 180);
  assert.equal(png.readUInt32BE(20), 180);
  assert.deepEqual(png, readFileSync(join(dirname(entry), 'web', 'brand-icon-180.png')));
});

test('wrapper proxies the homepage and API to the app server with the font-enabled policy', async t => {
  const { url } = await startWrapper(t);
  const page = await fetch(`${url}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Chaotic Minds Command/);
  assert.match(page.headers.get('content-security-policy'), /fonts\.gstatic\.com/);

  const health = await fetch(`${url}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, configured: false });
});

test('wrapper stops its app server when it receives SIGTERM', async t => {
  const { port, child } = await startWrapper(t);
  const exited = waitForExit(child);
  child.kill('SIGTERM');
  assert.equal(await exited, 0);
  assert.equal(await portIsFree(port), true);
  assert.equal(await portIsFree(3123 + (port % 1000)), true);
});

test('cleanup terminates a backend orphaned by the wrapper', { skip: process.platform !== 'linux' }, async t => {
  const { port, child } = await startWrapper(t);
  const exited = waitForExit(child);
  child.kill('SIGKILL');
  await exited;
  assert.equal(await portIsFree(3123 + (port % 1000)), false);
  assert.equal(await stopWrapper(child), false);
  assert.equal(await waitForPortToBeFree(3123 + (port % 1000)), true);
});

test('wrapper contains invalid request targets', async t => {
  const { port, url } = await startWrapper(t);
  const response = await new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1', () => socket.write('GET http://[invalid/ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));
    let data = '';
    socket.on('data', chunk => { data += chunk; });
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
  });
  assert.match(response, /^HTTP\/1\.1 400 /);
  assert.equal((await fetch(`${url}/api/health`)).status, 200);
});

test('relative and default data directories use the caller working directory', async t => {
  for (const dataDir of ['relative-data', '']) {
    const cwd = mkdtempSync(join(tmpdir(), 'cc-start-cwd-'));
    t.after(() => rmSync(cwd, { recursive: true, force: true }));
    const { child } = await startWrapper(t, { cwd, env: { DATA_DIR: dataDir } });
    assert.equal(existsSync(join(cwd, dataDir || '.data', 'command.sqlite')), true);
    const exited = waitForExit(child);
    child.kill('SIGTERM');
    assert.equal(await exited, 0);
  }
});

test('wrapper waits for its backend before exiting', { skip: process.platform !== 'linux' }, async t => {
  const { port, child } = await startWrapper(t);
  const backendPid = Number(readFileSync(`/proc/${child.pid}/task/${child.pid}/children`, 'utf8').trim());
  assert.ok(backendPid > 0);
  process.kill(backendPid, 'SIGSTOP');
  try {
    child.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(child.exitCode, null);
    assert.equal(await portIsFree(3123 + (port % 1000)), false);
    child.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(child.exitCode, null);
    assert.equal(child.signalCode, null);
    assert.equal(await portIsFree(3123 + (port % 1000)), false);
  } finally {
    process.kill(backendPid, 'SIGCONT');
  }
  assert.equal(await waitForExit(child), 0);
  assert.equal(await portIsFree(3123 + (port % 1000)), true);
});

test('cleanup terminates a stalled wrapper and backend', { skip: process.platform !== 'linux' }, async t => {
  const { port, child } = await startWrapper(t);
  const backendPid = Number(readFileSync(`/proc/${child.pid}/task/${child.pid}/children`, 'utf8').trim());
  assert.ok(backendPid > 0);
  process.kill(backendPid, 'SIGSTOP');
  process.kill(child.pid, 'SIGSTOP');
  assert.equal(await stopWrapper(child, 200), true);
  assert.equal(await waitForPortToBeFree(port), true);
  assert.equal(await waitForPortToBeFree(3123 + (port % 1000)), true);
});

test('edge listen failure shuts down the backend', async t => {
  const port = await freeWrapperPort();
  const occupied = createServer();
  await new Promise((resolve, reject) => { occupied.once('error', reject); occupied.listen(port, '127.0.0.1', resolve); });
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  const dataDir = mkdtempSync(join(tmpdir(), 'cc-start-test-'));
  const child = spawn(process.execPath, [entry], {
    env: { PATH: process.env.PATH, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: dataDir, APP_ORIGIN: `http://127.0.0.1:${port}` },
    detached: process.platform !== 'win32',
    stdio: 'ignore'
  });
  cleanupWrapper(t, child, dataDir);
  assert.equal(await waitForExit(child), 1);
  assert.equal(await portIsFree(3123 + (port % 1000)), true);
});

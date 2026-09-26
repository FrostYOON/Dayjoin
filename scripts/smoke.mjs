import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const port = 3300;
const redisEnabled = process.env.REDIS_ENABLED === 'true';
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: fileURLToPath(new URL('../apps/api/', import.meta.url)),
  env: { ...process.env, NODE_ENV: 'test', PORT: String(port), REDIS_ENABLED: String(redisEnabled) },
  stdio: 'ignore',
});
let spawnError;
child.on('error', (error) => { spawnError = error; });
try {
  let response;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error('API exited before becoming ready; run dev:api for diagnostics');
    try {
      response = await fetch(`http://127.0.0.1:${port}/api/v1/health/ready`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) break;
    } catch { /* Wait for startup within the bounded deadline. */ }
    await setTimeout(250);
  }
  assert.equal(response?.status, 200, 'readiness');
  const body = await response.json();
  assert.equal(body.details.postgres.status, 'up');
  assert.equal(body.details.redis?.status, redisEnabled ? 'up' : undefined);
  const live = await fetch(`http://127.0.0.1:${port}/api/v1/health/live`);
  assert.equal(live.status, 200);
  assert.equal(live.headers.get('x-content-type-options'), 'nosniff');
  console.log(`PASS: real PostgreSQL readiness; Redis ${redisEnabled ? 'enabled and healthy' : 'disabled'}; liveness and security headers`);
} finally {
  if (child.exitCode === null && !spawnError) {
    child.kill('SIGTERM');
    const timer = globalThis.setTimeout(() => child.kill('SIGKILL'), 5000);
    timer.unref();
    await new Promise((resolve) => child.once('exit', resolve));
    globalThis.clearTimeout(timer);
  }
}

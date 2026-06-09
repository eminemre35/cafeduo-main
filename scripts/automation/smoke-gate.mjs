#!/usr/bin/env node
/**
 * CI/SDK-friendly prod smoke wrapper. Exit 0 = healthy, 1 = failed.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseUrl = process.env.SMOKE_BASE_URL || 'https://cafeduotr.com';

const smokeScript = path.join(root, 'scripts', 'smoke', 'prod-smoke.mjs');

const child = spawn(process.execPath, [smokeScript, baseUrl], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, SMOKE_BASE_URL: baseUrl },
});

child.on('close', (code) => {
  process.exit(code === 0 ? 0 : 1);
});

child.on('error', (err) => {
  console.error('[smoke-gate] failed to start:', err.message);
  process.exit(1);
});

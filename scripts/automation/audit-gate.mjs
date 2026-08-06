#!/usr/bin/env node
/**
 * Audit gate with allowlist.
 *
 * Fails CI when `npm audit` reports moderate+ vulnerabilities EXCEPT
 * advisories that are documented as non-applicable to this project.
 *
 * Why allowlist exists:
 *   - GHSA-qwww-vcr4-c8h2 (react-router RSC Mode CSRF Bypass):
 *     Only affects React Router's RSC (React Server Components) mode.
 *     CafeDuo is a classic Vite SPA using BrowserRouter — no RSC, no
 *     loaders/actions. Fixing requires React 19 upgrade (RR 8.x peer dep),
 *     tracked as a separate task. Remove from ALLOWLIST after that upgrade.
 *
 * Usage: node scripts/automation/audit-gate.mjs
 * Exit code 0 = gate passed, 1 = actionable vulnerabilities found.
 */
import { spawnSync } from 'node:child_process';

const ALLOWLIST = new Set([
  // react-router RSC-mode CSRF bypass — SPA does not use RSC (see header)
  'GHSA-qwww-vcr4-c8h2',
]);

const MIN_SEVERITY = ['moderate', 'high', 'critical'];

const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8', shell: true });
// npm audit exits 1 when vulnerabilities exist — the JSON report is still on stdout.
if (result.error || !result.stdout) {
  console.error('❌ Audit gate FAILED — could not run npm audit:');
  console.error(result.error?.message ?? result.stderr ?? 'no output from npm audit');
  process.exit(1);
}
const report = JSON.parse(result.stdout);

const vulnerabilities = report.vulnerabilities ?? {};
const actionable = [];

for (const [name, vuln] of Object.entries(vulnerabilities)) {
  const via = Array.isArray(vuln.via) ? vuln.via : [vuln.via];
  for (const entry of via) {
    if (typeof entry !== 'object' || entry === null) continue;
    const severity = entry.severity ?? vuln.severity;
    if (!MIN_SEVERITY.includes(severity)) continue;

    // Advisory id lives in the URL (e.g. https://github.com/advisories/GHSA-xxxx)
    const url = String(entry.url ?? '');
    const ghsaMatch = url.match(/GHSA-[A-Za-z0-9-]+/);
    const advisoryId = ghsaMatch ? ghsaMatch[0] : url;

    if (advisoryId && ALLOWLIST.has(advisoryId)) {
      console.log(`⏭️  Allowlisted (non-applicable): ${name} -> ${advisoryId} (${severity})`);
      continue;
    }
    actionable.push({ name, advisoryId, severity, title: entry.title ?? '' });
  }
}

const summary = report.metadata?.vulnerabilities ?? {};
console.log(
  `\n📊 Audit summary: info=${summary.info ?? 0} low=${summary.low ?? 0} moderate=${summary.moderate ?? 0} high=${summary.high ?? 0} critical=${summary.critical ?? 0}`
);

if (actionable.length > 0) {
  console.error(`\n❌ Audit gate FAILED — ${actionable.length} actionable finding(s):`);
  for (const f of actionable) {
    console.error(`   - ${f.name} [${f.severity}] ${f.advisoryId}: ${f.title}`);
  }
  process.exit(1);
}

console.log('✅ Audit gate passed.');

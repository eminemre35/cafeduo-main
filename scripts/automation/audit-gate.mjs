#!/usr/bin/env node
/**
 * Audit gate — strict.
 *
 * Fails CI when `npm audit` reports moderate+ vulnerabilities.
 * No allowlist: the last exception (GHSA-qwww-vcr4-c8h2, react-router
 * RSC-only CSRF) was resolved by the React 19 + React Router 8 upgrade.
 * If a non-applicable advisory appears again, document it here BEFORE
 * adding it to ALLOWLIST below.
 *
 * Usage: node scripts/automation/audit-gate.mjs
 * Exit code 0 = gate passed, 1 = actionable vulnerabilities found.
 */
import { spawnSync } from 'node:child_process';

const ALLOWLIST = new Set([]);

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

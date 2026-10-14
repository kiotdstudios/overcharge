// Compact, focused test output for the OVERCHARGE publish path.
// Usage: node scripts/check_change.mjs [--preset gameplay|editor|all] [--suite name.mjs ...]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const root = fileURLToPath(new URL('../', import.meta.url));
const presets = {
  gameplay: ['pip_gate_spend.mjs', 'energy_authority.mjs'],
  editor: ['save_publish.mjs'],
  all: ['run_all.mjs'],
};
const args = process.argv.slice(2);
let preset = 'gameplay';
const extra = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--preset' && args[i + 1]) preset = args[++i];
  else if (args[i] === '--suite' && args[i + 1]) extra.push(args[++i]);
  else { console.error(`Unknown or incomplete option: ${args[i]}`); process.exit(2); }
}
if (!Object.hasOwn(presets, preset)) { console.error(`Unknown preset: ${preset}`); process.exit(2); }
const suites = [...new Set([...presets[preset], ...extra.map(s => s.endsWith('.mjs') ? s : `${s}.mjs`)])];
let failed = 0;
for (const suite of suites) {
  if (!/^[\w-]+\.mjs$/.test(suite) || !existsSync(join(root, '_dev', suite))) {
    console.error(`Missing or invalid suite: ${suite}`); failed++; continue;
  }
  const result = spawnSync(process.execPath, [join(root, '_dev', suite)], {
    cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  const summary = [...output.matchAll(/RESULTS:\s*(\d+)\s*passed,\s*(\d+)\s*failed/g)].at(-1);
  const ok = result.status === 0 && (summary ? Number(summary[2]) === 0 : true);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${suite}${summary ? `: ${summary[1]} passed, ${summary[2]} failed` : ''}`);
  if (!ok) {
    failed++;
    const lines = output.trim().split(/\r?\n/);
    console.error(lines.slice(-35).join('\n') || result.error?.message || `exit ${result.status}`);
  }
}
console.log(`${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);


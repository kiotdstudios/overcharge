// _dev/run_all.mjs — run EVERY suite in _dev, discovered from disk.
//
// WHY THIS EXISTS: I hand-maintained a 14-suite gate list in my head and silently omitted
// 5 suites. One of them, completability.mjs, existed precisely to catch "this level can
// never be completed" — and it would have caught level6 shipping without isExit:true
// immediately. Chief found it by playing instead: he charged the exit, it vanished, and
// nothing happened.
//
// A gate list that a human curates will drift. This discovers suites instead, so a new
// suite is gated the moment it lands and an existing one cannot fall out unnoticed.
//
// Usage: node _dev/run_all.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Deliberate exclusions, each with a reason. An empty reason is not allowed.
const SKIP = {
  'run_all.mjs':     'this runner',
  'tile_grammar.mjs':'RETIRED by Chief ruling 2026-09-19 — asserts a rule that was deleted',
};

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs')).sort();

let pass = 0, fail = 0, broken = [], skipped = [];
for (const f of files) {
  if (SKIP[f]) { skipped.push(`${f} — ${SKIP[f]}`); continue; }
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/RESULTS:\s*(\d+)\s*passed,\s*(\d+)\s*failed/);
  if (m) {
    pass += +m[1]; fail += +m[2];
    console.log(`  ${f.replace('.mjs','').padEnd(22)} ${m[1].padStart(4)} passed  ${m[2].padStart(3)} failed`);
    if (+m[2] > 0) broken.push(`${f} (${m[2]} failing)`);
  } else {
    // No RESULTS line. Either a different reporter, or the suite DIED. Distinguish, because
    // a suite that crashes silently is worse than one that fails loudly.
    const died = r.status !== 0;
    console.log(`  ${f.replace('.mjs','').padEnd(22)} ${died ? 'CRASHED / no results' : 'ran, no RESULTS line'}`);
    if (died) broken.push(`${f} (CRASHED, exit ${r.status})`);
  }
}
console.log('');
console.log(`  TOTAL: ${pass} passed, ${fail} failed across ${files.length - Object.keys(SKIP).length} suites`);
if (skipped.length) { console.log('  skipped:'); skipped.forEach(s => console.log('    ' + s)); }
if (broken.length)  { console.log('  needs attention:'); broken.forEach(s => console.log('    ' + s)); }
process.exit(fail === 0 && broken.length === 0 ? 0 : 1);
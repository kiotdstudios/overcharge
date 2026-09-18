// Test the protocol launcher's allow-list against the REAL file.
// Uses execFileSync so no shell mangles the argument, and OVERCHARGE_TEST=1 so the
// interactive pause does not block. Validation is unchanged by that flag.
import { execFileSync } from 'node:child_process';

const HANDLER = 'C:\\Users\\diepowel\\Documents\\_kiro_tools\\protocol_handler.mjs';

// Invoke node directly, exactly as the registry does — no cmd in the path, so the
// test exercises the same argument handling the browser will produce.
const run = (url) => {
  try {
    const out = execFileSync(process.execPath, [HANDLER, url], {
      encoding: 'utf8', env: { ...process.env, OVERCHARGE_TEST: '1' }, timeout: 20000,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? -1, out: (e.stdout || '') + (e.stderr || '') };
  }
};

const MUST_REFUSE = [
  'overcharge://reset',
  'overcharge://push;calc',
  'overcharge://push && calc',
  'overcharge://push|calc',
  'overcharge://../../evil',
  'overcharge://',
  'overcharge://PUSHX',
  'overcharge://pushpush',
  'overcharge://push/extra',
  'overcharge://push?x=1',
  '',
  'javascript:alert(1)',
];
const MUST_ACCEPT = [
  'overcharge://push',
  'overcharge://push/',
  'overcharge://PUSH',      // scheme actions are case-insensitive by design
];

let bad = 0;

console.log('=== MUST BE REFUSED (exit 1, "REFUSED", nothing executed) ===');
for (const u of MUST_REFUSE) {
  const r = run(u);
  const refused = r.code === 1 && /REFUSED/.test(r.out);
  const ranBat = /ACCEPTED/.test(r.out);
  if (!refused || ranBat) bad++;
  console.log(`  ${JSON.stringify(u).padEnd(30)} exit=${String(r.code).padStart(2)}  ${refused && !ranBat ? 'REFUSED  [correct]' : '*** FAILED — ' + (ranBat ? 'IT ACCEPTED THIS' : 'not refused') + ' ***'}`);
}

console.log('\n=== MUST BE ACCEPTED (exit 0, reaches the bat) ===');
for (const u of MUST_ACCEPT) {
  const r = run(u);
  const ok = r.code === 0 && /ACCEPTED/.test(r.out);
  if (!ok) bad++;
  console.log(`  ${JSON.stringify(u).padEnd(30)} exit=${String(r.code).padStart(2)}  ${ok ? 'ACCEPTED  [correct]' : '*** FAILED — did not accept ***'}`);
}

console.log('\n=== registry readback ===');
try {
  const reg = execFileSync('reg', ['query', 'HKCU\\Software\\Classes\\overcharge\\shell\\open\\command', '/ve'], { encoding: 'utf8' });
  console.log(reg.trim().split('\n').map(l => '  ' + l.trim()).join('\n'));
} catch (e) { console.log('  (err) ' + e.message); }

console.log(`\nVERDICT: ${bad === 0 ? 'ALL CASES CORRECT' : bad + ' CASE(S) WRONG'}`);
process.exit(bad === 0 ? 0 : 1);

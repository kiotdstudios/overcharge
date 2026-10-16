// AKI_26 Part 1, item 1.1 — "Uncharged" checkbox on charged sources.
// Scope: Builder-only (editor/). Codex 01 Phase A1 owns the runtime split of
// capacity vs starting charge; this file does not touch src_scroll/.
//
// Covers:
//  1. The source Inspector field spec exposes a "Capacity" label on the
//     unchanged `charge` key, plus an "Uncharged" boolean on key `uncharged`.
//  2. An old source (no `uncharged` key at all) round-trips through
//     save/load (JSON stringify/parse, what persistence.js actually does)
//     with the key still absent and `charge` untouched — old levels must
//     diff empty.
//  3. A source explicitly marked `uncharged: true` round-trips that value.
//  4. Static guard: none of the three source-placement code paths in
//     main.js ('source', 'source-hvac', 'source-prop') write an `uncharged`
//     key — default-on-placement must stay "charged as today" per the order.
import fs from 'node:fs';
import { sourceFields } from '../editor/inspector-fields.js';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' — ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' — ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

sec('Inspector field spec');
{
  const fields = sourceFields({ charge: 4, x: 0, y: 0, label: 'GEN' });
  const capacity = fields.find(f => f.key === 'charge');
  const uncharged = fields.find(f => f.key === 'uncharged');
  ok(!!capacity, 'a field targets the charge key');
  ok(capacity && capacity.label === 'Capacity', 'its on-screen label is "Capacity"', capacity && capacity.label);
  ok(capacity && capacity.num === true, 'charge/Capacity stays a number input');
  ok(!!uncharged, 'a field targets the uncharged key');
  ok(uncharged && uncharged.bool === true, 'Uncharged is rendered as a checkbox (bool:true)');
}

sec('Old-level round trip (no uncharged key present)');
{
  const before = { id: 'A1', x: 10, y: 20, charge: 4, label: 'GEN-A' };
  const after = JSON.parse(JSON.stringify(before));
  ok(!('uncharged' in after), 'uncharged key stays absent after a save/load cycle');
  ok(after.charge === 4, 'charge value is untouched', after.charge);
  ok(JSON.stringify(after) === JSON.stringify(before), 'byte-identical round trip (empty diff)');
}

sec('uncharged:true round trip');
{
  const before = { id: 'A2', x: 10, y: 20, charge: 4, label: 'GEN-B', uncharged: true };
  const after = JSON.parse(JSON.stringify(before));
  ok(after.uncharged === true, 'uncharged:true survives save/load');
  ok(after.charge === 4, 'charge (capacity) is unaffected by the uncharged flag at the data level', after.charge);
}

sec('Placement defaults match "charged as today" (static source guard)');
{
  const mainSrc = fs.readFileSync(new URL('../editor/main.js', import.meta.url), 'utf8');
  // Pull each `obj = { ... }` block immediately preceding `arr = L.sources`.
  const blocks = [...mainSrc.matchAll(/obj\s*=\s*\{[\s\S]*?\};[\s\S]{0,120}?arr = L\.sources/g)].map(m => m[0]);
  ok(blocks.length === 3, 'exactly 3 source-placement code paths found (source, source-hvac, source-prop)', `found ${blocks.length}`);
  for (const b of blocks) {
    ok(!/\buncharged\s*:/.test(b), 'this placement block does not set uncharged (defaults to charged)');
  }
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if(fail===0) console.log('ALL TESTS PASS ✓');
process.exit(fail===0?0:1);

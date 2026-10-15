// AKI_26 Part 1, item 1.2 — level total readout.
// Scope: Builder-only, pure arithmetic (editor/level-economy.js). The actual
// DOM readout is wired in editor/workspace.js's update(); that is a thin
// render of this module's output and is exercised live in the Builder (see
// the Part 1 report), not re-tested here.
import { levelChargeSummary } from '../editor/level-economy.js';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' — ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' — ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

sec('Charged sources only count toward the total');
{
  const level = {
    sources: [
      { id: 'A', charge: 4 },
      { id: 'B', charge: 6, uncharged: true },  // AKI_26 1.1 — starts at 0, excluded
      { id: 'C', charge: 2 },
    ],
    gates: [{ id: 'EXIT', isExit: true, required: 8 }],
    switches: [],
  };
  const s = levelChargeSummary(level);
  ok(s.totalCharge === 6, 'uncharged source (6) is excluded from the total', s.totalCharge);
  ok(s.exitCost === 8, 'exit cost read from the isExit gate', s.exitCost);
  ok(s.mandatoryCost === 8, 'mandatory cost is exit-only here (no switches/plain gates)', s.mandatoryCost);
  ok(s.short === true, '6 available < 8 needed => short');
  ok(s.deficit === 2, 'deficit is 2', s.deficit);
}

sec('Enough charge => no warning');
{
  const level = {
    sources: [{ charge: 10 }],
    gates: [{ isExit: true, required: 8 }],
    switches: [],
  };
  const s = levelChargeSummary(level);
  ok(s.short === false, '10 available >= 8 needed => not short');
  ok(s.deficit === 0, 'deficit is 0 when not short');
}

sec('Barrier gate cost is counted at its switch, not double-counted at the gate');
{
  const level = {
    sources: [{ charge: 20 }],
    gates: [
      { id: 'EXIT', isExit: true, required: 8 },
      { id: 'BARRIER', blockOnly: true, required: 99 },  // not counted directly
    ],
    switches: [{ id: 'SW1', linkedId: 'BARRIER', required: 3 }],
  };
  const s = levelChargeSummary(level);
  ok(s.exitCost === 8, 'exit cost unchanged', s.exitCost);
  ok(s.switchCost === 3, 'switch required (3) counted, not the barrier gate\u2019s own required (99)', s.switchCost);
  ok(s.plainGateCost === 0, 'blockOnly gate contributes 0 to plainGateCost', s.plainGateCost);
  ok(s.mandatoryCost === 11, 'mandatory total is exit(8) + switch(3), not 8+99+3', s.mandatoryCost);
}

sec('A plain gate (neither isExit nor blockOnly) costs itself');
{
  const level = {
    sources: [{ charge: 5 }],
    gates: [{ id: 'G', required: 4 }],
    switches: [],
  };
  const s = levelChargeSummary(level);
  ok(s.plainGateCost === 4, 'plain gate required counted directly', s.plainGateCost);
  ok(s.mandatoryCost === 4, 'mandatory cost is just the plain gate here', s.mandatoryCost);
}

sec('Empty/missing arrays degrade gracefully');
{
  const s = levelChargeSummary({});
  ok(s.totalCharge === 0 && s.mandatoryCost === 0 && s.short === false, 'an empty level reports zero/zero/not-short', JSON.stringify(s));
  const s2 = levelChargeSummary(null);
  ok(s2.totalCharge === 0, 'levelChargeSummary(null) does not throw');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

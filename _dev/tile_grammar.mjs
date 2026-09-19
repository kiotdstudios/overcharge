// TILE GRAMMAR — Chief's rule, asserted so it cannot ship broken.
//
//   "env tile dark a is a regular ground tile, it cant be the top tile;
//    top tile has purple edge (env tile purple a or b) those top edge tiles
//    need to be present when using a dark tile"
//
// Level 1 is the reference: 61/61 top tiles carry a purple edge. Level 3 matches
// it at 74/74. This suite pins that standard for every level.
//
// Run:  node _dev/tile_grammar.mjs [--only level4.json]

import fs from 'node:fs';
import path from 'node:path';

const ROWS = 18;
const solid = v => v === 1 || v >= 10;

const NAMES = {
  1:'legacy_solid',
  10:'tile_dark_a', 11:'tile_dark_b', 12:'tile_purple_a', 13:'tile_purple_b',
  16:'rt_tile_mid_a', 17:'rt_tile_mid_b', 18:'rt_tile_mid_c',
  19:'rt_tile_purple_a', 20:'rt_tile_purple_b', 21:'rt_tile_purple_c',
  22:'rt_tile_light_a', 23:'rt_tile_accent_a',
};

// A top tile must carry a purple edge. Purple City: 12/13. Rooftop: 19/20/21.
const EDGE = new Set([12, 13, 19, 20, 21]);
// Fill-only tiles. Legal anywhere EXCEPT as a top tile.
const FILL = new Set([10, 11, 16, 17, 18]);
// Legacy generic solid. Not part of either tileset — no edge variant exists.
const LEGACY = 1;

let pass = 0, fail = 0;
const ok = (cond, label, detail = '') => {
  if (cond) { pass++; console.log(`  \u2713 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
};
const sec = t => console.log(`\n[ ${t} ]`);

const dir = path.join(process.cwd(), 'src_scroll', 'levels');
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'levels.json'), 'utf8'));
const files = (only ? [only] : manifest.order.map(o => o.file));

console.log('=== TILE GRAMMAR ===');
console.log('Chief\'s rule: a dark/mid fill tile may never be the TOP of a solid column.');
console.log('The top tile must carry the purple edge. Level 1 is the reference.\n');

function analyse(lv) {
  const COLS = lv.cols;
  const at = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? 0 : lv.tiles[r * COLS + c];
  const tops = [], counts = {};
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = at(c, r);
      if (!solid(v)) continue;
      counts[v] = (counts[v] || 0) + 1;
      if (!solid(at(c, r - 1))) tops.push({ c, r, v });
    }
  return { tops, counts, at, COLS };
}

for (const f of files) {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) continue;
  const lv = JSON.parse(fs.readFileSync(p, 'utf8'));
  const { tops, counts } = analyse(lv);

  sec(`${f} — "${lv.name}"`);
  console.log('    tiles used: ' + Object.entries(counts).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${NAMES[k] || '?'}=${v}`).join('  '));

  const fillTops   = tops.filter(t => FILL.has(t.v));
  const legacyTops = tops.filter(t => t.v === LEGACY);
  const edgeTops   = tops.filter(t => EDGE.has(t.v));

  // THE rule, stated POSITIVELY. Phrasing it as "no fill tile on top" passed
  // vacuously for Level 4, where 0 of 67 tops were correct but none were fill
  // either — every tile was the legacy solid. Requiring the edge catches both.
  ok(tops.length > 0 && edgeTops.length === tops.length,
    'every top tile carries a purple edge',
    `${edgeTops.length}/${tops.length}` +
    (fillTops.length ? `  |  ${fillTops.length} fill-as-top, e.g. ${fillTops.slice(0, 5).map(t => `c${t.c}r${t.r}=${t.v}`).join(' ')}` : '') +
    (legacyTops.length ? `  |  ${legacyTops.length} legacy-as-top` : ''));

  // The bigger gap the audit surfaced: whole levels built from the legacy solid,
  // which has no edge variant at all, so the rule cannot even be satisfied there.
  ok(legacyTops.length === 0,
    'the level uses a real tileset, not the legacy generic solid',
    legacyTops.length
      ? `${legacyTops.length} top tile(s) are id 1 (legacy_solid) — no purple edge exists for it, so this level needs retiling before the rule can hold`
      : 'no legacy tiles on any surface');

  // NOT asserted: "an edge tile must never have solid above it". Level 1 — Chief's
  // own reference — has 31 such tiles and Level 3 has 10, so a buried edge is
  // clearly acceptable to him (it happens wherever a wall rises off an old surface).
  // I wrote that assertion, saw it fail on the reference, and deleted it. The
  // reference defines correct, not my guess about what looks right.
}

sec('The reference itself must stay correct');
{
  const lv = JSON.parse(fs.readFileSync(path.join(dir, 'level1.json'), 'utf8'));
  const { tops } = analyse(lv);
  ok(tops.length > 0 && tops.every(t => EDGE.has(t.v)),
    'level1 remains 100% edge-correct (it is the standard other levels are measured against)',
    `${tops.filter(t => EDGE.has(t.v)).length}/${tops.length}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nHOW TO FIX: for each flagged column, the topmost solid tile becomes 12 or 13');
  console.log('(tile_purple_a / tile_purple_b). Everything beneath it stays 10 or 11.');
  console.log('A level built from id 1 needs its solid tiles replaced with the Purple City set.');
}
process.exit(fail === 0 ? 0 : 1);

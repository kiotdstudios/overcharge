// charge_colors.mjs - the charge bar is red when low, yellow in the middle and cyan when high
// (docs/design/GAME_DESIGN_V2.md section 8.4; the first iteration's scheme, commit ddbf42a).
import './support/headless.mjs';
import { chargeColors, chargeBand, CHARGE_BANDS } from '../src_scroll/energy-hud.js';
import { C } from '../src_scroll/constants.js';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const rgb = s => s.match(/\d+/g).map(Number);
const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx === mn) return 0; const d = mx - mn;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };

sec('THE THREE BANDS, with the original steps');
{
  ok(CHARGE_BANDS.mediumFrom === 0.3 && CHARGE_BANDS.highFrom === 0.6, 'steps are 30% and 60%, as in the first iteration');
  ok(chargeBand(0) === 'low', 'an empty bar is red (the band, though nothing is drawn at 0)');
  ok(chargeBand(0.01) === 'low' && chargeBand(0.3) === 'low', 'up to and including 30% is red');
  ok(chargeBand(0.31) === 'medium' && chargeBand(0.6) === 'medium', 'above 30% to 60% is yellow');
  ok(chargeBand(0.61) === 'high' && chargeBand(1) === 'high', 'above 60% to full is cyan');
}

sec('THE COLOURS ARE REALLY RED, YELLOW AND CYAN');
{
  const low = hue(rgb(chargeColors(0.1).bright)), mid = hue(rgb(chargeColors(0.5).bright)), high = hue(rgb(chargeColors(0.9).bright));
  ok(low < 12 || low > 348, 'low is red', `hue ${low.toFixed(0)}`);
  ok(mid > 38 && mid < 58, 'medium is yellow', `hue ${mid.toFixed(0)}`);
  ok(high > 175 && high < 200, 'high is cyan', `hue ${high.toFixed(0)}`);
  ok(chargeColors(0.1).bright === 'rgb(255,68,68)', 'the red matches CHARGE_LOW #ff4444 in constants.js', C.CHARGE_LOW);
  ok(chargeColors(0.5).bright === 'rgb(255,204,0)', 'the yellow matches CHARGE_MED #ffcc00', C.CHARGE_MED);
  ok(chargeColors(0.9).bright === 'rgb(44,225,255)', 'the cyan matches CHARGE_HIGH #44ddff', C.CHARGE_HIGH);
}

sec('NOTHING VIOLET ON THE BAR (violet belongs to the banked pips)');
{
  let violet = 0;
  for (let f = 0; f <= 1.0001; f += 0.01) for (const k of ['body', 'bright', 'edge']) { const h = hue(rgb(chargeColors(f)[k])); if (h > 240 && h < 320) violet++; }
  ok(violet === 0, 'no sampled colour is violet across the whole bar', `${violet} violet samples`);
}

sec('ROBUSTNESS');
{
  ok(chargeBand(-5) === 'low' && chargeBand(7) === 'high', 'fractions are clamped');
  ok(chargeBand(NaN) === 'low' && chargeBand(undefined) === 'low', 'NaN and undefined fall back to red rather than throwing');
  const a = chargeColors(0.5); a.bright = 'x';
  ok(chargeColors(0.5).bright === 'rgb(255,204,0)', 'callers cannot corrupt the palette by editing the result');
  const keys = Object.keys(chargeColors(0.5)).sort().join();
  ok(keys === 'body,bright,edge', 'the shape the HUD draws with is unchanged (body, bright, edge)');
}

sec('IT IS WIRED INTO THE REAL HUD');
{
  const src = fs.readFileSync(new URL('../src_scroll/energy-hud.js', import.meta.url), 'utf8');
  ok(/const colors = chargeColors\(fill\);/.test(src), 'drawEnergyHUD takes its colours from chargeColors(fill)');
  ok(!/108, ?64, ?160/.test(src.slice(src.indexOf('export function chargeColors'), src.indexOf('function sparkLine'))), 'and the old cyan-to-violet blend is gone from it');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

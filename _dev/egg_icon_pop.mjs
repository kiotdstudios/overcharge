// egg_icon_pop.mjs - the Easter egg card's icon pops up: scale curve, the art file, and the achievement entry.
import fs from 'node:fs';
globalThis.Image = class { complete = true; naturalWidth = 64; naturalHeight = 64; set src(v) { this._src = v; } get src() { return this._src; } };
const { eggIconScale } = await import('../src_scroll/ui.js');
const { ACHIEVEMENTS } = await import('../src_scroll/achievements.js');
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
ok(eggIconScale(-0.1) === 0 && eggIconScale(0) === 0, 'before the pop the icon is not drawn (scale 0)');
let peak = 0; for (let i = 0; i <= 100; i++) peak = Math.max(peak, eggIconScale(i * 0.0042));
ok(peak > 1.05 && peak <= 1.2, 'it overshoots a little, then settles (peak between 1.05 and 1.2)', `peak ${peak.toFixed(3)}`);
ok(eggIconScale(0.42) === 1 && eggIconScale(5) === 1, 'and ends at exactly 1');
ok(eggIconScale(0.1) > 0 && eggIconScale(0.1) < eggIconScale(0.3), 'it grows over the first part of the pop');
const g = ACHIEVEMENTS.find(a => a.id === 'good_neighbor');
ok(g && g.egg === true && /^assets\/ui\/achievements\/.+\.png$/.test(g.icon || ''), 'GOOD NEIGHBOR is an Easter egg with an icon path');
const png = fs.existsSync(g.icon) ? fs.readFileSync(g.icon) : null;
ok(!!png && png.readUInt32BE(16) === 64 && png.readUInt32BE(20) === 64, 'the icon art exists and is 64 x 64', g.icon);
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
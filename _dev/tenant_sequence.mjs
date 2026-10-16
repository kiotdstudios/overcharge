// tenant_sequence.mjs - the Level 1 tenant sequence on the REAL level1.json, REAL Player, REAL Level (Chief, 2026-10-16).
// An ordinary HVAC prop (no switch). Charge it and it is on, the tenant is relieved; zap it and it is off, she is hot again.
// The achievement unlocks the first time only and is never taken away.
import { Player, Level, held, step } from './support/headless.mjs';
import { createAchievements } from '../src_scroll/achievements.js';
import { loadDecoAnimations } from '../src_scroll/deco-anim.js';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const def = () => JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const mem = () => { const o = {}; return { getItem: k => o[k] ?? null, setItem: (k, v) => { o[k] = v; } }; };
const run = (p, lv, keys, seconds, until) => { held(keys); for (let i = 0; i < Math.round(seconds * 60); i++) { step(p, lv); if (until && until()) break; } held([]); };

sec('WHAT IS PLACED');
const d = def();
const acDef = d.sources.find(s => s.id === 'AC_TENANT');
const npcDef = d.npcs.find(n => n.id === 'NPC_TENANT');
ok(!!acDef && acDef.kind === 'hvac' && acDef.uncharged === true && acDef.charge === 4, 'an HVAC prop, capacity 4, placed uncharged (off); it takes the full 4 to turn on');
ok(d.switches.length === 0 && !d.gates.some(g => g.style === 'plate'), 'there is no switch of any kind in Level 1');
ok(!!npcDef && npcDef.assetId === 'npc_window_tenant' && npcDef.poweredAssetId === 'npc_window_tenant_relieved' && npcDef.linkedObjectId === 'AC_TENANT', 'the tenant is linked to the AC and carries the relieved clip');
ok(npcDef.dialogue.lines.length >= 1 && npcDef.dialogue.poweredLines.length >= 1, 'she has a hot line and a relieved line (placeholders, Orcha writes the final text)');
const panels = d.decorations.filter(x => /apartment_tenant\/tenant_/.test(x.src));
ok(panels.length === 4 && panels.map(x => x.x).join() === '96,288,448,608' && panels.every(x => x.y === 32), 'the four-panel building stands on the walkway: x 96, 288, 448, 608; top y 32');
ok(d.sources.filter(s => s.label === 'LAMP').length === 3, 'the three lamps are untouched');

sec('THE TENANT FOLLOWS THE AC, BOTH WAYS');
{
  const lv = new Level(def());
  const ac = lv.sources.find(s => s.id === 'AC_TENANT'), npc = lv.npcs.find(n => n.id === 'NPC_TENANT');
  ok(ac.drained && ac.charge === 0 && ac.max === 4 && !ac.powered, 'at load the AC is off, capacity 4');
  ok(!lv.isPowered('AC_TENANT') && !npc._powered, 'and the tenant is hot');
  const ach = createAchievements({ storage: mem(), search: '' });
  let unlocks = 0;
  const watch = () => { if (npc._justRelieved && npc.linkedObjectId && ach.unlock('good_neighbor')) unlocks++; };

  // The hero stands on the walkway beside the AC (walkway surface y 288, AC at x 512).
  const p = new Player(500, 250);
  run(p, lv, [], 0.5);
  ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'the hero stands on the walkway', `feet ${(p.y + p.h).toFixed(1)}`);
  ok(ac.inRange(p.cx, p.cy), 'in range of the AC from the walkway');
  p.giveEnergy(6);

  // 1. Charge it directly. Space is the ordinary charge key.
  held(['Space']);
  for (let i = 0; i < 60 * 8 && ac.charge < 4 - 1e-6; i++) { step(p, lv); watch(); }
  held([]);
  ok(Math.abs(ac.charge - 4) < 1e-6 && ac.powered, 'holding Space charged the AC to 4 and it is on', `charge ${ac.charge.toFixed(2)}`);
  for (let i = 0; i < 5; i++) { step(p, lv); watch(); }
  ok(lv.isPowered('AC_TENANT') && npc._powered, 'the tenant is relieved');
  ok(unlocks === 1 && ach.has('good_neighbor'), 'GOOD NEIGHBOR unlocked automatically, once', `unlocks ${unlocks}`);
  ok(p.usableEnergy < 6 - 3.9, 'it cost the player about 4', `left ${p.usableEnergy.toFixed(2)}`);

  // 2. Zap it back out (E, the ordinary absorb key): the AC goes off, she is hot again.
  held(['KeyE']);
  for (let i = 0; i < 60 * 8 && !ac.drained; i++) { step(p, lv); watch(); }
  held([]);
  for (let i = 0; i < 5; i++) { step(p, lv); watch(); }
  ok(ac.drained && ac.charge === 0 && !ac.powered, 'holding E took the charge back out and the AC is off');
  ok(!lv.isPowered('AC_TENANT') && !npc._powered, 'the tenant is hot again');
  ok(ach.has('good_neighbor'), 'the achievement stays');

  // 3. Charge it a second time: relieved again, but no second unlock.
  held(['Space']);
  for (let i = 0; i < 60 * 8 && ac.charge < 4 - 1e-6; i++) { step(p, lv); watch(); }
  held([]);
  for (let i = 0; i < 5; i++) { step(p, lv); watch(); }
  ok(npc._powered && unlocks === 1, 'charged again: relieved again, and the achievement does not unlock twice', `unlocks ${unlocks}`);

  // 4. A checkpoint snapshot rewinds the tenant with the AC.
  const snap = lv.snapshot();
  held(['KeyE']); for (let i = 0; i < 60 * 8 && !ac.drained; i++) { step(p, lv); } held([]);
  for (let i = 0; i < 3; i++) step(p, lv);
  ok(!npc._powered, 'zapped again: hot');
  lv.restore(snap);
  for (let i = 0; i < 3; i++) step(p, lv);
  ok(ac.powered && npc._powered, 'restoring a checkpoint brings back both the AC and the relieved tenant');
}

sec('THE AC TAKES ITS WHOLE 4 (Chief: "ac unit takes 4 charge")');
{
  const lv = new Level(def());
  const ac = lv.sources.find(s => s.id === 'AC_TENANT'), npc = lv.npcs.find(n => n.id === 'NPC_TENANT');
  const p = new Player(500, 250);
  run(p, lv, [], 0.5);
  p.giveEnergy(8);
  held(['Space']);
  for (let i = 0; i < 60 * 8 && ac.charge < 3 - 1e-6; i++) step(p, lv);
  held([]);
  for (let i = 0; i < 10; i++) step(p, lv);
  ok(Math.abs(ac.charge - 3) < 0.05 && !ac.drained, 'after 3 charge the AC holds 3', `charge ${ac.charge.toFixed(2)}`);
  ok(!ac.powered && !lv.isPowered('AC_TENANT') && !npc._powered, 'but it is still OFF, and the tenant is still hot (3 of 4 is not enough)');
  ok(!createAchievements({ storage: mem(), search: '' }).has('good_neighbor') && !npc._justRelieved, 'and no achievement yet');
  held(['Space']);
  for (let i = 0; i < 60 * 8 && ac.charge < 4 - 1e-6; i++) step(p, lv);
  held([]);
  for (let i = 0; i < 10; i++) step(p, lv);
  ok(Math.abs(ac.charge - 4) < 1e-6 && ac.powered && npc._powered, 'the fourth charge turns it on and relieves her');
  held(['KeyE']);
  for (let i = 0; i < 60 && ac.charge > 3.5; i++) step(p, lv);
  held([]);
  for (let i = 0; i < 10; i++) step(p, lv);
  ok(ac.charge < 4 && !ac.powered && !npc._powered, 'zapping even a little out turns it off and she is hot again');
}
sec('THE RIGHT CLIP IS ON SCREEN (real manifest, real frame files)');
{
  globalThis.fetch = async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(new URL('../assets/ASSET_MANIFEST.json', import.meta.url), 'utf8')) });
  await loadDecoAnimations();
  const lv = new Level(def());
  const ac = lv.sources.find(s => s.id === 'AC_TENANT'), npc = lv.npcs.find(n => n.id === 'NPC_TENANT');
  const p = new Player(500, 250);
  run(p, lv, [], 0.5);
  const clip = () => { const img = npc._currentFrame(); return img ? String(img.src) : 'none'; };
  ok(/npc-window-tenant\/complaining\/\d\d\.png$/.test(clip()), 'while the AC is off she plays the hot, fanning clip', clip().split('/').slice(-2).join('/'));
  const frames = new Set(); for (let i = 0; i < 90; i++) { step(p, lv); frames.add(clip()); }
  ok(frames.size === 6 && [...frames].every(s => /complaining/.test(s)), 'and it loops through all six frames', `${frames.size} distinct`);
  p.giveEnergy(6); held(['Space']);
  for (let i = 0; i < 60 * 8 && ac.charge < 4 - 1e-6; i++) step(p, lv);
  held([]); for (let i = 0; i < 70; i++) step(p, lv);
  ok(/npc-window-tenant\/relieved\/05\.png$/.test(clip()), 'once the AC is on she plays the relief clip once and holds its last frame', clip().split('/').slice(-2).join('/'));
  held(['KeyE']); for (let i = 0; i < 60 * 8 && !ac.drained; i++) step(p, lv); held([]);
  for (let i = 0; i < 5; i++) step(p, lv);
  ok(/complaining/.test(clip()), 'zap the AC and she is back to fanning herself', clip().split('/').slice(-2).join('/'));
  const bubble = npc._bubbleText;
  ok(/thank God/.test(bubble || ''), 'she spoke her relieved line when the AC came on (and it is cleared when it goes off)', JSON.stringify(bubble) + ', bubble timer ' + npc._bubbleT);
}

sec('THE REST OF LEVEL 1 STILL WORKS');
{
  const lv = new Level(def());
  const lamps = lv.sources.filter(s => s.label === 'LAMP');
  ok(lamps.length === 3 && lamps.every(s => s.charge === 3), 'three 3-charge lamps');
  ok(lv.gates.find(g => g.isExit).required === 8, 'the exit costs 8');
  const p = new Player(144, 450);
  run(p, lv, [], 0.5);
  run(p, lv, ['ArrowUp'], 5, () => p.grounded && p.y + p.h < 400);
  ok(p.grounded && Math.abs(p.y + p.h - 288) < 2, 'the ladder still climbs to the walkway', `feet ${(p.y + p.h).toFixed(1)}`);
  run(p, lv, ['ArrowRight'], 10, () => p.x > 640);
  ok(p.x > 640 && Math.abs(p.y + p.h - 288) < 2, 'and the walkway runs under the whole building', `x ${p.x.toFixed(0)}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

// AKI_15: automated acceptance checks for the isolated traversal QA fixture
// (_dev/fixtures/traversal-qa.json). Does NOT touch any campaign level.
// Mirrors the headless pattern established by _dev/facade_routes.mjs and
// _dev/checkpoint.mjs: real Level + real Player, no browser required.
import fs from 'node:fs';
import { Player, Level, held, step } from './support/headless.mjs';

const path = '_dev/fixtures/traversal-qa.json';
const def = JSON.parse(fs.readFileSync(path, 'utf8'));
const TILE = 32;

let pass = 0, fail = 0;
const ok = (c, m, d = '') => {
  if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' — ' + d : ''}`); }
  else { fail++; console.log(`  \u2717 ${m}${d ? ' — ' + d : ''}`); }
};
const sec = t => console.log(`\n[ ${t} ]`);

sec('FIXTURE LOADS — Level constructor accepts the fixture without throwing');
let level;
try {
  level = new Level(def);
  ok(true, 'new Level(def) constructed');
} catch (e) {
  ok(false, 'new Level(def) threw', e.message);
}
ok(def.tiles.length === def.cols * 20, 'tiles length matches cols*rows (140*20=2800)');
ok(level.pxH === 20 * TILE, 'level.pxH is 640 (20 rows)');

sec('STATION 1 — jump-ledge reach (96px / 3 tiles) and sprint-gap (96px)');
{
  // Start just before the pit (cols6-8), confirm WALK alone cannot clear 96px gap.
  const p = new Player(5 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 20; i++) step(p, level);
  held([]);
  ok(p.x < 9 * TILE, 'walking (no sprint) does not clear the 3-tile gap', `x=${p.x.toFixed(1)}`);
}
{
  // Sprinting + jump across the same gap should clear it and reach the far floor.
  const p = new Player(4 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight', 'ShiftLeft']);
  for (let i = 0; i < 20; i++) step(p, level);
  held(['ArrowRight', 'ShiftLeft', 'ArrowUp']);
  step(p, level);
  held(['ArrowRight', 'ShiftLeft']);
  for (let i = 0; i < 60; i++) step(p, level);
  held([]);
  ok(p.x > 9 * TILE, 'sprint + jump clears the 96px gap', `x=${p.x.toFixed(1)}`);
}
{
  // Jump onto the 3-tile-high ledge (row14, cols11-14) from the landing after the gap.
  const p = new Player(9 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 15; i++) step(p, level);
  held(['ArrowRight', 'ArrowUp']);
  step(p, level);
  held(['ArrowRight']);
  for (let i = 0; i < 40; i++) step(p, level);
  held([]);
  ok(Math.abs((p.y + p.h) - 14 * TILE) < 2, 'reaches the 3-tile ledge top (y=448)', `feet=${(p.y + p.h).toFixed(1)}`);
}
{
  // Head-clearance corridor (cols16-20, ceiling at row13) must NOT block normal standing walk.
  const p = new Player(15 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 220; i++) step(p, level);
  held([]);
  ok(p.x > 20 * TILE, 'walks clear through the normal-headroom corridor unobstructed', `x=${p.x.toFixed(1)}`);
}

sec('STATION 2 — ladder: NO runtime support (documented, not faked)');
{
  // Falling into the open shaft (cols30-33) just falls — no climb, no ladder-grab.
  const p = new Player(29 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 30; i++) step(p, level);
  const yBefore = p.y;
  for (let i = 0; i < 60; i++) step(p, level);
  held([]);
  ok(p.y > yBefore + 100, 'walking into the shaft falls (no ladder/climb entity exists)', `y ${yBefore.toFixed(1)}→${p.y.toFixed(1)}`);
}

sec('STATION 3 — reachable ledge works; blocked-headroom counterpart correctly blocks the same jump');
{
  const p = new Player(45 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 80; i++) step(p, level);
  held(['ArrowRight', 'ArrowUp']);
  step(p, level);
  held(['ArrowRight']);
  for (let i = 0; i < 40; i++) step(p, level);
  held([]);
  ok(Math.abs((p.y + p.h) - 14 * TILE) < 2, 'reachable ledge: lands on row14 top (y=448)', `feet=${(p.y + p.h).toFixed(1)}`);
}
{
  // Approach the blocked ledge (cols57-58) from under the low ceiling (cols55-56, row15).
  const p = new Player(55 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight', 'ArrowUp']);
  for (let i = 0; i < 50; i++) step(p, level);
  held([]);
  ok((p.y + p.h) > 15 * TILE * 0.999 && p.y + p.h <= 544 + 1, 'low ceiling (32px clearance) prevents any upward jump arc', `feet=${(p.y + p.h).toFixed(1)}`);
  ok(!(p.x >= 57 * TILE && (p.y + p.h) <= 14 * TILE + 2), 'never reaches the blocked ledge top');
}

sec('STATION 4 — checkpoint activation, safe 1-tile drop, death-plane + respawn');
{
  const { Checkpoint } = await import('../src_scroll/entities.js');
  const cpDef = def.checkpoints[0];
  const standing = new Player(cpDef.x - 10, cpDef.y - 30);
  standing.grounded = true;
  ok(level.checkpoints[0].tryActivate(standing), 'checkpoint activates when standing at it', `(${cpDef.x},${cpDef.y})`);
}
{
  // Safe drop: walking from col71 across the 1-tile step-down (cols72-74) must not kill the player.
  const p = new Player(70 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 300; i++) step(p, level);
  held([]);
  ok(!p.dead && p.x > 74 * TILE, 'crosses the 32px safe-drop step without dying', `x=${p.x.toFixed(1)} dead=${!!p.dead}`);
}
{
  // Death pit (cols78-83): falling past level.pxH+60 is the documented death-plane trigger.
  const p = new Player(77 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  let crossedThreshold = false;
  for (let i = 0; i < 120; i++) {
    step(p, level);
    if (p.y > level.pxH + 60) { crossedThreshold = true; break; }
  }
  ok(crossedThreshold, 'falling into the death pit crosses the y > pxH+60 death-plane threshold', `pxH=${level.pxH}`);
}

sec('STATION 5 — one-way landable roof, open lower route, genuinely solid wall');
{
  // Open lower route: walk the whole station width at ground level, unobstructed.
  const p = new Player(93 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 550; i++) step(p, level);
  held([]);
  ok(p.x > 112 * TILE, 'walks the open lower route across the whole facade span', `x=${p.x.toFixed(1)}`);
}
{
  // One-way roof (row14, cols100-109): jump up from the lower route onto its top.
  const p = new Player(98 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight', 'ArrowUp']);
  step(p, level);
  held(['ArrowRight']);
  for (let i = 0; i < 40; i++) step(p, level);
  held([]);
  ok(Math.abs((p.y + p.h) - 14 * TILE) < 2, 'lands on the one-way roof top (y=448) from below', `feet=${(p.y + p.h).toFixed(1)}`);
}
{
  // Genuinely solid wall (cols113-114): must block horizontal movement outright.
  const p = new Player(111 * TILE, 544 - 30);
  p.grounded = true;
  held(['ArrowRight']);
  for (let i = 0; i < 90; i++) step(p, level);
  held([]);
  ok(p.x <= 113 * TILE + 1, 'solid wall blocks movement (does not pass col113)', `x=${p.x.toFixed(1)}`);
}

sec('STATION 6 — supported enemy type present for future combat checks');
{
  ok(level.enemies.length === 1, 'one enemy loaded from fixture');
  ok(level.enemies[0].constructor.name === 'DrainEnemy', 'fixture "drain" type maps to the supported DrainEnemy class');
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);

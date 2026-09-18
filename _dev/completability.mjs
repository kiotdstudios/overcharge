// O4 — COMPLETABILITY PROOF  (KIRO_ORDER_SHIP_3DAY, approved ORCHA 11)
//
// Answers ONE question per level: can a player actually finish it?
// Reports completable yes/no, margin, and the FIRST blocking reason in plain
// words — Chief reads the message, not the source.
//
// Why this is not just "sum the sources":
//   A closed gate blocks FLOOR TO CEILING. blocksHorizontal() ignores Y
//   deliberately, so a gate seals a horizontal band of the level and the sources
//   BEYOND it are not spendable on the gate itself. Order matters. This walks a
//   reachability CLOSURE outward from spawn, spending only what it can already
//   reach, which is why it can catch a level that has enough total charge but
//   has it stranded on the wrong side of a door.
//
// blockOnly barriers are EXCLUDED from cost: the player cannot discharge into
// one, so its `required` is inert and its linked switch is the real price.
// Counting both double-charges the puzzle.
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const LV   = path.join(ROOT, 'src_scroll', 'levels');
const TILE = 32, ROWS = 18;
const solid = v => v === 1 || v >= 10;          // numeric range, NOT registry membership

let pass = 0, fail = 0;
const ok = (c, msg, detail = '') => {
  if (c) { pass++; console.log(`  \u2713 ${msg}${detail ? ' — ' + detail : ''}`); }
  else   { fail++; console.log(`  \u2717 ${msg}${detail ? ' — ' + detail : ''}`); }
};
const sec = t => console.log(`\n[ ${t} ]`);

// ── the analysis ───────────────────────────────────────────────────────────
export function analyse(d) {
  const cols = d.cols || 0, widthPx = cols * TILE;
  const tiles = d.tiles || [];
  const sources = d.sources || [], gates = d.gates || [], switches = d.switches || [];
  const enemies = d.enemies || [], checkpoints = d.checkpoints || [];
  const spawn = d.playerStart || { x: 0, y: 0 };
  const reasons = [];

  // TERRAIN EXTENT — rightmost column holding any solid tile.
  let lastSolidCol = -1;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < ROWS; r++)
      if (solid(tiles[r * cols + c])) { lastSolidCol = Math.max(lastSolidCol, c); break; }
  const terrainEndX = (lastSolidCol + 1) * TILE;
  const voidFrac = widthPx > 0 ? (widthPx - terrainEndX) / widthPx : 0;

  // Content that sits past where the ground stops.
  const content = [
    ...sources.map(o => ({ what: `source ${o.id}`, x: o.x })),
    ...gates.map(o => ({ what: `gate ${o.id}`, x: o.x })),
    ...switches.map(o => ({ what: `switch ${o.id}`, x: o.x })),
    ...enemies.map((o, i) => ({ what: `enemy ${i + 1}`, x: o.x })),
    ...checkpoints.map((o, i) => ({ what: `checkpoint ${i + 1}`, x: o.x })),
    { what: 'player spawn', x: spawn.x },
  ];
  const beyond = content.filter(o => o.x >= terrainEndX);
  const maxContentX = content.reduce((m, o) => Math.max(m, o.x), 0);

  // ENERGY BUDGET. blockOnly excluded — inert, paid via its switch.
  const totalCharge = sources.reduce((s, o) => s + (o.charge || 0), 0);
  const exits = gates.filter(g => g.isExit);
  const spendGates = gates.filter(g => !g.blockOnly);
  const mandatory = spendGates.reduce((s, g) => s + (g.required || 0), 0)
                  + switches.reduce((s, w) => s + (w.required || 0), 0);
  const margin = totalCharge - mandatory;

  // REACHABILITY CLOSURE. Blockers seal a band; expand outward from spawn,
  // spending only reachable charge, until nothing more can be opened.
  const blockers = gates.filter(g => !g.open).map(g => ({
    id: g.id, x: g.x, w: g.w || 32, required: g.required || 0,
    blockOnly: !!g.blockOnly, isExit: !!g.isExit, opened: false,
  }));
  const openedBy = new Map();                 // gateId -> switch that opens it
  for (const w of switches) if (w.linkedId) openedBy.set(w.linkedId, w);

  const crossable = (a, b) => blockers.filter(k =>
    !k.opened && Math.min(a, b) < k.x + k.w && Math.max(a, b) > k.x);

  let lo = spawn.x, hi = spawn.x;             // reachable interval
  const drained = new Set();
  let energy = 0, progress = true;
  const spent = [];
  while (progress) {
    progress = false;
    // absorb every source inside the reachable band
    for (const s of sources)
      if (!drained.has(s.id) && s.x >= lo - TILE && s.x <= hi + TILE) {
        drained.add(s.id); energy += (s.charge || 0); progress = true;
      }
    // widen to the nearest blocker on each side
    const leftEdge  = Math.max(0, Math.min(...blockers.filter(k => !k.opened && k.x + k.w <= lo).map(k => k.x + k.w), 0));
    const rightWall = Math.min(...blockers.filter(k => !k.opened && k.x >= hi).map(k => k.x), widthPx);
    if (leftEdge < lo) { lo = leftEdge; progress = true; }
    if (rightWall > hi) { hi = rightWall; progress = true; }
    // pay for a blocker touching the reachable band
    for (const k of blockers) {
      if (k.opened) continue;
      const touching = k.x <= hi + TILE && k.x + k.w >= lo - TILE;
      if (!touching) continue;
      const sw = openedBy.get(k.id);
      const price = sw ? (sw.required || 0) : k.required;
      const payer = sw ? `switch ${sw.id}` : `gate ${k.id}`;
      const swReachable = !sw || (sw.x >= lo - TILE && sw.x <= hi + TILE);
      if (!swReachable) continue;
      if (energy >= price) {
        energy -= price; k.opened = true; progress = true;
        spent.push(`${payer} -${price}`);
        hi = Math.max(hi, k.x + k.w + TILE); lo = Math.min(lo, k.x - TILE);
      }
    }
  }

  // Can the player stand at an exit with it open?
  let exitOK = exits.length > 0;
  for (const e of exits) {
    const k = blockers.find(b => b.id === e.id);
    if (k && !k.opened) { exitOK = false; reasons.push(`exit gate ${e.id} could not be opened: needs ${k.required}, only ${energy} reachable charge left after ${spent.join(', ') || 'no spending'}`); }
    else if (crossable(spawn.x, e.x).length) { exitOK = false; reasons.push(`exit gate ${e.id} is sealed behind ${crossable(spawn.x, e.x).map(c => c.id).join(', ')}`); }
  }
  if (!exits.length) reasons.push('level declares NO exit gate, so it can never be completed');

  // EXIT BEHIND SPAWN — objective, not a heuristic. In a left-to-right platformer
  // an exit at a lower x than the spawn means the player finishes by walking
  // BACKWARDS out of the level. Level 3 ships this way: exit x=32, spawn x=64.
  // The reachability closure alone reports it completable — which it literally is,
  // instantly, and that is precisely the defect.
  // CHIEF CORRECTION 2026-09-17 21:19: "player cant reach gate you have to jump on
  // platforms precisely to reach the gate". My first version compared X ONLY and
  // called Level 3 broken. Wrong — its exit sits at (32,192) while spawn is at
  // (64,482), so the gate is 290px ABOVE the player. Being behind in X while high
  // above is a legitimate precise-platforming climb, not a walk-backwards exit.
  //
  // This was my own "narrow check, broad conclusion" failure: an assertion that
  // measured one axis and reported a verdict about reachability. It now fires only
  // when the exit is behind AND at essentially the same elevation, i.e. genuinely
  // walkable without any climb. ELEV_TOL is 2 tiles — a step, not a platform route.
  const ELEV_TOL = 64;
  const behindSpawn = exits.filter(e =>
    e.x + (e.w || 32) <= spawn.x && Math.abs((e.y || 0) - spawn.y) <= ELEV_TOL);
  for (const e of behindSpawn)
    reasons.push(`exit gate ${e.id} is BEHIND the player spawn (exit x=${e.x}, spawn x=${spawn.x}) — the level is completed by walking backwards`);

  // CONTENT COVERAGE — a calibrated heuristic, and labelled as one. "Unfinished"
  // is not provable, but a level declaring 3200px of width while authoring content
  // across only 21% of it is the signature of a stub. Threshold 40%: Level 1 is at
  // 62% and is Chief-approved, Level 3 is at 21%. Deliberately set so it CANNOT
  // fire on a level Chief has already played and accepted.
  const coverage = widthPx > 0 ? maxContentX / widthPx : 0;
  if (beyond.length) reasons.push(`${beyond.length} object(s) sit past where terrain ends (x=${terrainEndX}): ${beyond.slice(0,3).map(o => `${o.what} at x=${o.x}`).join(', ')}`);
  if (margin < 0) reasons.push(`not enough charge: ${totalCharge} available, ${mandatory} required (short by ${-margin})`);
  if (enemies.length > 0 && margin <= 0) reasons.push(`has ${enemies.length} enemy/enemies at margin ${margin} — one hit makes it unsolvable (OVERRIDE 5)`);

  return {
    name: d.name, number: d.number, cols, widthPx, terrainEndX, voidFrac, maxContentX,
    totalCharge, mandatory, margin, enemies: enemies.length, checkpoints: checkpoints.length,
    exitOK, beyond, reasons, energyLeft: energy, spent, coverage, behindSpawn,
    completable: exitOK && margin >= 0 && beyond.length === 0 && behindSpawn.length === 0,
  };
}

// ── run over the shipped manifest ──────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(LV, 'levels.json'), 'utf8'));
const files = (manifest.order || []).map(e => e.file || e);

console.log('=== O4 COMPLETABILITY PROOF ===');
console.log('Reports per level: completable, margin, and the first blocking reason.\n');

const results = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(LV, f), 'utf8'));
  const a = analyse(d); a.file = f; results.push(a);
  console.log(`--- ${f}  "${a.name}" (level ${a.number}) ---`);
  console.log(`    completable : ${a.completable ? 'YES' : 'NO'}`);
  console.log(`    energy      : ${a.totalCharge} available, ${a.mandatory} required, margin ${a.margin}`);
  console.log(`    terrain     : ends x=${a.terrainEndX} of ${a.widthPx} declared (${(a.voidFrac*100).toFixed(0)}% void), content reaches x=${a.maxContentX}`);
  console.log(`    enemies ${a.enemies}, checkpoints ${a.checkpoints}`);
  if (a.spent.length) console.log(`    spending    : ${a.spent.join(', ')}`);
  console.log(`    reason      : ${a.reasons[0] || 'none — completable'}`);
  if (a.reasons.length > 1) a.reasons.slice(1).forEach(r => console.log(`      also      : ${r}`));
  console.log('');
}

sec('Every shipped level is completable');
for (const a of results)
  ok(a.completable, `${a.file} "${a.name}" is completable`, a.reasons[0] || `margin ${a.margin}`);

sec('OVERRIDE 5 — a level with enemies must have POSITIVE margin');
for (const a of results)
  if (a.enemies > 0)
    ok(a.margin > 0, `${a.file} has ${a.enemies} enemy/enemies and margin > 0`, `margin=${a.margin}`);
  else
    ok(true, `${a.file} has no enemies, margin ${a.margin} acceptable (§6.10)`);

sec('Content must not sit past where terrain ends');
for (const a of results)
  ok(a.beyond.length === 0, `${a.file}: all content is on authored terrain`,
     a.beyond.length ? a.beyond.map(o => `${o.what}@${o.x}`).join(', ') : `terrain ends x=${a.terrainEndX}`);

sec('An exit must exist and be openable from spawn');
for (const a of results)
  ok(a.exitOK, `${a.file}: exit exists and is reachable`, a.exitOK ? `${a.energyLeft} charge to spare` : a.reasons[0]);

sec('An exit must not sit BEHIND the player spawn');
for (const a of results)
  ok(a.behindSpawn.length === 0, `${a.file}: exit is ahead of spawn`,
     a.behindSpawn.length ? a.behindSpawn.map(e => `exit ${e.id} at x=${e.x} vs spawn x=${JSON.parse(fs.readFileSync(path.join(LV, a.file),'utf8')).playerStart.x}`).join(', ') : 'ok');

sec('Declared width should match authored terrain (void beyond the ground)');
// Threshold 40%. Level 1 sits at 62% and is Chief-approved, so this cannot fire on
// a level he has already accepted. A stub declaring 3200px while authoring 21% of
// it is what this catches. "Unfinished" is not assertable; this is a smell test.
// Reframed after Chief's correction. The actionable defect is not "too little
// content" — Level 3 is a deliberately compact precise-platforming level — it is
// that `cols` DECLARES more level than the terrain covers, so the camera can scroll
// into open void past the last solid tile. Two valid fixes, both Chief's call:
// reduce `cols`, or extend the terrain. Reported as void fraction, not coverage.
for (const a of results)
  ok(a.voidFrac <= 0.40, `${a.file}: declared width is backed by terrain`,
     `terrain ends x=${a.terrainEndX} of ${a.widthPx} declared (${(a.voidFrac*100).toFixed(0)}% void past the ground) — fix by reducing cols to ${Math.ceil(a.terrainEndX/32)} or extending terrain`);

sec('Level 5 dependency (OVERRIDE 4) — crates require a checkpoint');
for (const a of results) {
  const d = JSON.parse(fs.readFileSync(path.join(LV, a.file), 'utf8'));
  if ((d.crates || []).length > 0)
    ok(a.checkpoints > 0, `${a.file} has crates AND a checkpoint (a mis-pushed crate is otherwise unrecoverable)`, `crates=${(d.crates||[]).length} checkpoints=${a.checkpoints}`);
}

sec('OVERRIDE 1 — every exit gate costs 8');
for (const a of results) {
  const d = JSON.parse(fs.readFileSync(path.join(LV, a.file), 'utf8'));
  for (const g of (d.gates || []).filter(x => x.isExit))
    ok(g.required === 8, `${a.file}: exit ${g.id} costs 8`, `required=${g.required}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);
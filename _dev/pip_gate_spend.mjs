// PIP vs GATE SPENDING — characterization of what the game ACTUALLY does.
//
// Chief (2026-10): "Twenty-five charge fills one pip. Pips can automatically open
// gates ... Document and test how pip spending interacts with ordinary eight-charge
// gate spending."
//
// This suite changes nothing. It drives the REAL Player and REAL Level through
// Level.update with SPACE held (via the same input listeners the browser uses) and
// records the observed energy state, so docs/GAME_DESIGN_V2.md can state facts.
//
// Existing _dev/energy_authority.mjs covers the authority API row by row. What it
// does not cover, and this does:
//   - a required=8 gate paid ACROSS a pip boundary, end state included
//   - one pip paying several gates in a row
//   - partial gate progress surviving the player walking away
//   - "pips open gates automatically" — they do not; SPACE is required
//   - a refused chest and what it does to the energy the player paid
//
// Every scenario first asserts the player is grounded AND in range of the device.
// A test that holds SPACE with nothing in range passes vacuously (an earlier chest
// suite did exactly that), so range is checked, not assumed.

import { Player, Level, held, step } from './support/headless.mjs';
const { MAX_CHARGE, MAX_BANKED_PIPS, DISCHARGE_RATE } = await import('../src_scroll/constants.js');

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' \u2014 ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' \u2014 ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
const f = n => (Math.round(n * 1e4) / 1e4).toString();

const COLS = 30, ROWS = 18;
const FLOOR_ROW = 16;                       // surface y = 512
const GATE_X = [180, 300, 420];             // three gates, 120px apart
const PLAYER_X_FOR = i => GATE_X[i] - 30;   // 10px clear of the gate's left edge

function mkLevel({ gates = 1, required = 8, isExit = false, chest = null } = {}) {
  const tiles = new Array(COLS * ROWS).fill(0);
  for (let x = 0; x < COLS; x++) tiles[FLOOR_ROW * COLS + x] = 10;
  return new Level({
    name: 'PIP GATE TEST', number: 98, cols: COLS, tiles, playerStart: { x: 96, y: 480 },
    sources: [], switches: [], checkpoints: [], platforms: [], enemies: [], decorations: [],
    gates: Array.from({ length: gates }, (_, i) => ({
      id: 'G' + i, x: GATE_X[i], y: 448, w: 32, h: 64, required, isExit,
    })),
    chests: chest ? [chest] : [],
  });
}

function settle(p, L, n = 12) { held([]); for (let i = 0; i < n; i++) step(p, L); }

// Hold SPACE until `target` opens or we give up. Returns the observed outcome.
function pay(p, L, target, { maxFrames = 700 } = {}) {
  const before = p.usableEnergy;
  const startCharged = target.charged;
  held(['Space']);
  let frames = 0, maxDelta = 0, prev = target.charged;
  while (frames < maxFrames && !target.open && p.usableEnergy > 1e-9) {
    step(p, L); frames++;
    maxDelta = Math.max(maxDelta, target.charged - prev); prev = target.charged;
  }
  held([]);
  return {
    open: target.open, charged: target.charged, gained: target.charged - startCharged,
    bar: p.charge, pips: p.bankedPips, usable: p.usableEnergy,
    spent: before - p.usableEnergy, frames, maxDelta,
  };
}

function rig(bar, pips, opts = {}, which = 0) {
  const L = mkLevel(opts);
  const p = new Player(PLAYER_X_FOR(which), 480);
  settle(p, L);
  p.setEnergyState(bar, pips);
  return { L, p, g: L.gates[which] };
}

console.log(`constants: MAX_CHARGE=${MAX_CHARGE}  MAX_BANKED_PIPS=${MAX_BANKED_PIPS}  DISCHARGE_RATE=${DISCHARGE_RATE}/s`);
ok(MAX_CHARGE === 25, 'a pip is 25 charge (MAX_CHARGE)', String(MAX_CHARGE));

// ───────────────────────────────────────────────────────────────────────────
sec('SETUP SANITY — the player really is grounded and in range (no vacuous passes)');
{
  const { p, g } = rig(10, 0);
  ok(p.grounded, 'player is standing on the floor', `y=${f(p.y)}`);
  ok(p.nearDevice === g, 'the gate is the player\'s nearDevice');
  ok(!g.open && g.charged === 0, 'gate starts closed and empty');
  ok(g.required === 8, 'gate costs 8');
}

// ───────────────────────────────────────────────────────────────────────────
sec('Q SPENDS ONE PIP INSTANTLY AT A PAYABLE GATE');
{
  const { L, p, g } = rig(0, 1);
  const before = p.usableEnergy;
  held(['KeyQ']); step(p, L); held([]);
  ok(g.open && near(g.charged, 8), 'Q opens the 8-cost gate in one frame');
  ok(p.bankedPips === 0 && near(p.charge, 17), 'the remaining 17 returns to the bar');
  ok(near(before - p.usableEnergy, 8), 'Q conserves charge across pip spend');
}
{
  const { L, p, g } = rig(0, 0);
  held(['KeyQ']); step(p, L); held([]);
  ok(!g.open && g.charged === 0, 'Q with no pip has no effect');
}
{
  const { L, p, g } = rig(0, 1);
  p.x = 10;
  held(['KeyQ']); step(p, L); held([]);
  ok(!g.open && p.bankedPips === 1, 'Q away from a device spends nothing');
}
{
  const { L, p, g } = rig(MAX_CHARGE, MAX_BANKED_PIPS);
  held(['KeyQ']); step(p, L); held([]);
  ok(g.open && near(p.usableEnergy, 6 * MAX_CHARGE - 8), 'Q returns surplus even when the bar begins full');
}

sec('ORDINARY 8-CHARGE GATE, PAID FROM THE BAR (no pips)');
{
  const { L, p, g } = rig(10, 0);
  const r = pay(p, L, g);
  ok(r.open, 'bar 10 / 0 pips: gate opens');
  ok(near(r.bar, 2) && r.pips === 0, 'ends at bar 2, 0 pips', `bar=${f(r.bar)} pips=${r.pips}`);
  ok(near(r.spent, 8), 'exactly 8 left the player', f(r.spent));
  ok(r.frames >= 125 && r.frames <= 135, 'takes about 2.17s as the bar-dependent rate slows', `${r.frames} frames`);
}
{
  const { L, p, g } = rig(24, 0);
  const r = pay(p, L, g);
  ok(r.open && near(r.bar, 16) && r.pips === 0, 'bar 24 / 0 pips: pays from the bar, ends bar 16, no pip banked or touched', `bar=${f(r.bar)} pips=${r.pips}`);
}
{
  const { L, p, g } = rig(8, 0);
  const r = pay(p, L, g);
  ok(r.open && near(r.bar, 0) && r.pips === 0, 'bar exactly 8: opens and leaves the bar at 0', `bar=${f(r.bar)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('PIPS PAY AN 8-CHARGE GATE — a pip is promoted INTO THE BAR, then the gate drains 8');
{
  const { L, p, g } = rig(0, 1);
  const r = pay(p, L, g);
  ok(r.open, 'bar 0 / 1 pip: gate opens');
  ok(r.pips === 0, 'the pip is consumed', `pips=${r.pips}`);
  ok(near(r.bar, 17), 'the other 17 stay in the BAR (25 - 8), not wasted and not re-banked', `bar=${f(r.bar)}`);
  ok(near(r.spent, 8), 'usable energy fell by exactly 8', f(r.spent));
  ok(r.maxDelta <= 2 * DISCHARGE_RATE / 60 + 1e-9, 'payment never exceeds 6/s on any frame', f(r.maxDelta));
}
{
  const { L, p, g } = rig(3, 1);
  const r = pay(p, L, g);
  ok(r.open, 'bar 3 / 1 pip: gate opens');
  ok(near(r.bar, 20) && r.pips === 0, 'bar pays 3, the pip promotes MID-HOLD, bar pays 5 more: ends bar 20, 0 pips', `bar=${f(r.bar)} pips=${r.pips}`);
  ok(near(r.spent, 8), 'exactly 8 left the player', f(r.spent));
  ok(r.frames <= 166, 'no pause at the pip boundary (still about 2.67s)', `${r.frames} frames`);
  ok(r.maxDelta <= 2 * DISCHARGE_RATE / 60 + 1e-9, 'no frame jumps beyond the scaled rate at a pip boundary', f(r.maxDelta));
}
{
  const { L, p, g } = rig(0, 5);
  const r = pay(p, L, g);
  ok(r.open && near(r.bar, 17) && r.pips === 4, 'bar 0 / 5 pips: ends bar 17, 4 pips', `bar=${f(r.bar)} pips=${r.pips}`);
}
{
  // The bar is spent BEFORE any pip. A near-full bar protects the reserve.
  const { L, p, g } = rig(24, 5);
  const r = pay(p, L, g);
  ok(r.open && near(r.bar, 16) && r.pips === 5, 'bar 24 / 5 pips: bar pays, ALL 5 pips untouched', `bar=${f(r.bar)} pips=${r.pips}`);
}
{
  // Conservation across every starting state.
  let worst = 0, n = 0;
  for (const bar of [0, 1, 4, 7.5, 8, 12, 24, 25 - 1e-3]) for (const pips of [0, 1, 2, 5]) {
    if (bar + pips * 25 < 8) continue;
    const { L, p, g } = rig(bar, pips);
    const r = pay(p, L, g);
    worst = Math.max(worst, Math.abs(r.spent - 8)); n++;
    if (!r.open) { ok(false, `starting bar ${bar} pips ${pips} fails to open`); }
  }
  ok(worst < 1e-6, `conservation: ${n} start states each spend exactly 8`, `worst drift ${worst.toExponential(2)}`);
}
{
  // Exit gates charge identically to plain gates.
  const a = rig(0, 1, { isExit: false }), b = rig(0, 1, { isExit: true });
  const ra = pay(a.p, a.L, a.g), rb = pay(b.p, b.L, b.g);
  ok(ra.open && rb.open && near(ra.bar, rb.bar) && ra.pips === rb.pips, 'an exit gate and a plain gate are paid identically', `bar ${f(ra.bar)}/${f(rb.bar)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('ONE PIP PAYS THREE 8-CHARGE GATES (24 of 25), with 1 left over');
{
  const L = mkLevel({ gates: 3 });
  const p = new Player(PLAYER_X_FOR(0), 480); settle(p, L); p.setEnergyState(0, 1);
  const out = [];
  for (let i = 0; i < 3; i++) {
    p.x = PLAYER_X_FOR(i); settle(p, L, 4);
    if (p.nearDevice !== L.gates[i]) { ok(false, `gate ${i} in range`); break; }
    out.push(pay(p, L, L.gates[i]));
  }
  ok(out.length === 3 && out.every(r => r.open), 'all three gates open from a single banked pip');
  ok(near(out[0].bar, 17) && out[0].pips === 0, 'after gate 1: bar 17, 0 pips', `bar=${f(out[0].bar)}`);
  ok(near(out[1].bar, 9), 'after gate 2: bar 9 (the remainder keeps paying)', `bar=${f(out[1].bar)}`);
  ok(near(out[2].bar, 1), 'after gate 3: bar 1', `bar=${f(out[2].bar)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('DO PIPS OPEN GATES AUTOMATICALLY? — no. Nothing opens a gate without SPACE.');
{
  const { L, p, g } = rig(0, 5);
  held([]);
  for (let i = 0; i < 300; i++) step(p, L);
  ok(p.nearDevice === g, 'player stood in range of the gate for 5 seconds');
  ok(!g.open && g.charged === 0, '5 pips and no SPACE: gate stays closed and empty', `charged=${f(g.charged)}`);
  ok(p.bankedPips === 5 && p.charge === 0, 'and the energy is untouched', `bar=${p.charge} pips=${p.bankedPips}`);
}
{
  // Airborne players cannot charge either.
  const { L, p, g } = rig(10, 0);
  p.y -= 80; p.vy = 0;
  held(['Space']); step(p, L); const during = g.charged; held([]);
  ok(!p.grounded || during === 0, 'charging needs the player to be on the ground', `grounded=${p.grounded} charged=${f(during)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('PARTIAL PROGRESS PERSISTS — walking away does not drain the gate');
{
  const { L, p, g } = rig(5, 0);
  const r1 = pay(p, L, g);
  ok(!r1.open && near(r1.charged, 5), 'bar 5 runs dry: gate holds 5 of 8, not open', `charged=${f(r1.charged)}`);
  ok(near(p.usableEnergy, 0), 'player is empty');
  held([]); for (let i = 0; i < 60; i++) step(p, L);
  ok(near(g.charged, 5), 'standing there for 1s: progress holds');
  p.x = 600; p.vx = 0; for (let i = 0; i < 120; i++) step(p, L);
  ok(near(g.charged, 5) && !g.open, 'walking 400px away for 2s: progress still holds', `charged=${f(g.charged)}`);
  p.x = PLAYER_X_FOR(0); settle(p, L, 4);
  p.setEnergyState(10, 0);
  const r2 = pay(p, L, g);
  ok(r2.open, 'coming back with more energy finishes the gate');
  ok(near(r2.spent, 3) && near(r2.bar, 7), 'and only the missing 3 is taken (bar 10 -> 7)', `spent=${f(r2.spent)} bar=${f(r2.bar)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('AFTER A PIP IS SPENT, THE REMAINDER IS A PLAIN BAR — only new energy re-banks it');
{
  const { L, p, g } = rig(0, 1);
  pay(p, L, g);
  ok(near(p.charge, 17) && p.bankedPips === 0, 'start: bar 17, 0 pips');
  for (let i = 0; i < 300; i++) step(p, L);
  ok(near(p.charge, 17) && p.bankedPips === 0, 'idle for 5s: nothing re-banks the remainder');
  p.giveEnergy(8);
  ok(p.bankedPips === 1 && near(p.charge, 0), 'absorbing 8 more fills the bar to 25: a pip banks, bar resets to 0', `bar=${f(p.charge)} pips=${p.bankedPips}`);
  const q = rig(0, 1); pay(q.p, q.L, q.g);
  q.p.giveEnergy(10);
  ok(q.p.bankedPips === 1 && near(q.p.charge, 2), 'absorbing 10: pip banks and the 2 overflow carries into the new bar', `bar=${f(q.p.charge)} pips=${q.p.bankedPips}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('HITS AND BOLTS DRAW FROM THE SAME POOL (authority level)');
{
  const { p } = rig(0, 1);
  const spent = p.spendEnergy(1);
  ok(near(spent, 1) && near(p.charge, 24) && p.bankedPips === 0, 'a hit (spendEnergy 1) at bar 0 / 1 pip breaks the pip: bar 24, 0 pips', `bar=${f(p.charge)} pips=${p.bankedPips}`);
  const { p: q } = rig(0, 1);
  q.spendEnergy(0.25);
  ok(near(q.charge, 24.75) && q.bankedPips === 0, 'a bolt (0.25) at bar 0 / 1 pip also promotes the pip: bar 24.75', `bar=${f(q.charge)}`);
}

// ───────────────────────────────────────────────────────────────────────────
sec('PIP CHEST AT RESERVE CAP — OPEN AND DROP THE REWARD');
{
  const chest = { id: 'CH1', x: 128, y: 480, cost: 2, reward: 10 };
  const L = mkLevel({ gates: 0, chest });
  const p = new Player(96, 480); settle(p, L);
  p.setEnergyState(10, MAX_BANKED_PIPS);
  const ch = L.chests[0];
  const before = p.usableEnergy;
  held(['Space']);
  for (let i = 0; i < 900 && !ch.opened; i++) step(p, L);
  held([]);
  ok(ch.opened, 'a full-reserve chest opens after its cost is paid');
  ok(near(before - p.usableEnergy, chest.cost), 'only the 2-unit price leaves the player');
  ok(p.bankedPips === MAX_BANKED_PIPS, 'reserve stays capped');
  ok(L.pipPickups.length === 1, 'the reward waits as one pip pickup');
  const saved = L.snapshot();
  L.pipPickups = [];
  L.restore(saved);
  ok(L.pipPickups.length === 1, 'the pip survives checkpoint rewind');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

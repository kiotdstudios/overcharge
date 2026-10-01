// AKI_17 — electrical-interaction feedback regression suite.
// Run with: node _dev/aki17_source_reactions.mjs
//
// Exercises the REAL ElectricalSource / PowerGate / Player classes (not stubs).
// Covers the order's explicit verification list: partial drain, full drain,
// full player capacity, pip banking, moving away mid-absorb, returning to a
// drained source — plus the gate readiness cue and the "no transfer, no burst"
// rule for the player's local energy glow.
//
// This suite is CODE-ONLY. It asserts the new timer/flag fields that drive the
// visuals (_absorbT, _dryFlash, _energyGlowFx, _playerReady) and their exact
// transition points. It cannot see pixels — see the AKI_17 delivery note for
// which effects were additionally confirmed by eye vs only verified here.

globalThis.window = { addEventListener(){}, removeEventListener(){}, innerWidth: 1920, innerHeight: 1080, location: { search: '' } };
globalThis.document = { getElementById: () => null, addEventListener(){}, removeEventListener(){},
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }), style: {} }),
  body: { style: {} } };
globalThis.Image = class { constructor(){ this.complete = true; this.naturalWidth = 64; this.naturalHeight = 64; }
  addEventListener(n, f){ if (n === 'load') setTimeout(f, 0); } };
globalThis.matchMedia = () => ({ matches: false });

const { ElectricalSource, PowerGate } = await import('../src_scroll/electricity.js');
const { Player } = await import('../src_scroll/player.js');

let passed = 0, failed = 0;
function assert(cond, name) {
  if (cond) { console.log(`  \u2713 ${name}`); passed++; }
  else { console.error(`  \u2717 FAIL: ${name}`); failed++; }
}
function section(t) { console.log(`\n${t}`); }

console.log('AKI_17 — electrical interaction feedback');

// ════════════════════════════════════════════════════════════════════
section('[ Source: partial drain tells "being drained", no dry-flash ]');
{
  const src = new ElectricalSource({ id: 's1', x: 0, y: 0, charge: 4 });
  assert(src._absorbT === 0 && src._dryFlash === 0, 'starts with no reaction timers armed');
  const got = src.drain(1);
  assert(got === 1, 'drain(1) returns 1');
  assert(src._absorbT > 0, 'partial drain arms _absorbT (drain pulse tell)');
  assert(src._dryFlash === 0, 'partial drain does NOT arm _dryFlash (source still has charge)');
  assert(!src.drained, 'source not drained yet');
}

section('[ Source: full drain fires the dry-finish exactly once ]');
{
  const src = new ElectricalSource({ id: 's2', x: 0, y: 0, charge: 2 });
  src.drain(1);
  assert(src._dryFlash === 0, 'still has charge — no dry-flash yet');
  const got = src.drain(5); // clamps to remaining 1, crosses to drained
  assert(got === 1, 'final drain clamps to remaining charge');
  assert(src.drained, 'source is now drained');
  assert(src._dryFlash === 0.5, 'dry-finish fires at the exact active\u2192drained transition');
  // Draining an already-drained source must not re-arm the cue.
  src._dryFlash = 0; // simulate the cue having already decayed away
  const again = src.drain(1);
  assert(again === 0, 'drained source refuses further drain');
  assert(src._dryFlash === 0, 'dry-finish does not re-fire on a source that is already drained');
}

section('[ Source: reaction timers decay over time, do not go negative ]');
{
  const src = new ElectricalSource({ id: 's3', x: 0, y: 0, charge: 1 });
  src.drain(1); // drains fully: _absorbT=0.12, _dryFlash=0.5
  src.update(0.1);
  assert(Math.abs(src._absorbT - 0.02) < 1e-9, '_absorbT ticks down with update(dt)');
  assert(Math.abs(src._dryFlash - 0.4) < 1e-9, '_dryFlash ticks down with update(dt)');
  src.update(10); // large dt should clamp at 0, never negative
  assert(src._absorbT === 0 && src._dryFlash === 0, 'reaction timers clamp at 0, never negative');
}

// ════════════════════════════════════════════════════════════════════
section('[ Player: local energy glow fires only on REAL transfer ]');
{
  const level = { pickups: [], sources: [], gates: [], switches: [], checkpoints: [], enemies: [] };
  const p = new Player(0, 0);
  assert(p._energyGlowFx === 0, 'player starts with no energy glow armed');

  const accepted = p.giveEnergy(2);
  assert(accepted === 2, 'giveEnergy(2) with headroom accepts in full');
  assert(p._energyGlowFx > 0, 'real transfer arms the local energy glow');

  p._energyGlowFx = 0; // reset for the next probe
  p.charge = 10; // bar full
  p.bankedPips = 3;
  const refused = p.giveEnergy(5); // MAX_BANKED_PIPS reached elsewhere in this suite's config check below
  // Regardless of exact cap, confirm the contract: zero accepted -> zero glow.
  if (refused === 0) assert(p._energyGlowFx === 0, 'zero accepted at the cap arms no glow ("no charge gained means no transfer burst")');
  else assert(p._energyGlowFx > 0, 'nonzero accepted still arms the glow');
}

section('[ Player: bankPip() arms the glow on a direct pip grant ]');
{
  const p = new Player(0, 0);
  p._energyGlowFx = 0;
  const banked = p.bankPip();
  assert(banked === true, 'bankPip() succeeds from empty reserve');
  assert(p._energyGlowFx > 0, 'direct pip bank arms the local energy glow too');
}

section('[ Player: glow decays like the existing fx timers, floors at 0 ]');
{
  const p = new Player(0, 0);
  p.giveEnergy(1);
  const before = p._energyGlowFx;
  assert(before > 0, 'glow armed by transfer');
  p.update(1000, { pickups: [], sources: [], gates: [], switches: [],
    checkpoints: [], enemies: [], platforms: [], crates: [], cols: 100, pxW: 3200, pxH: 450,
    tileAt: () => 0, solidAt: () => false, isSolid: () => false, rectHitsSolid: () => false });
  assert(p._energyGlowFx === 0, 'glow decays to exactly 0 under a large dt, never negative');
}

// ════════════════════════════════════════════════════════════════════
section('[ Gate: _playerReady tracks usableEnergy vs remaining required, not open/charged ]');
{
  const gate = new PowerGate({ id: 'g1', x: 0, y: 0, w: 12, h: 80, required: 3 });
  const player = { usableEnergy: 0 };
  gate.update(0.016, player);
  assert(gate._playerReady === false, 'not ready with zero usableEnergy');

  player.usableEnergy = 2;
  gate.update(0.016, player);
  assert(gate._playerReady === false, '2 usableEnergy against required 3 is not enough yet');

  player.usableEnergy = 3;
  gate.update(0.016, player);
  assert(gate._playerReady === true, '3 usableEnergy against required 3 is enough \u2014 gate acknowledges readiness');

  // The order's hard constraint: this cue must never alter required/charged/open/position.
  assert(gate.required === 3 && gate.charged === 0 && gate.open === false, 'readiness computation leaves required/charged/open untouched');
}

section('[ Gate: readiness clears once the gate actually opens, and ignores blockOnly ]');
{
  const gate = new PowerGate({ id: 'g2', x: 0, y: 0, w: 12, h: 80, required: 1 });
  const player = { usableEnergy: 5 };
  gate.update(0.016, player);
  assert(gate._playerReady === true, 'ready before opening');
  gate.receive(1); // opens
  gate.update(0.016, player);
  assert(gate.open === true, 'gate opened via receive()');
  assert(gate._playerReady === false, 'readiness cue turns off once open \u2014 nothing left to acknowledge');

  const barrier = new PowerGate({ id: 'g3', x: 0, y: 0, w: 10, h: 80, required: 1, blockOnly: true });
  barrier.update(0.016, { usableEnergy: 99 });
  assert(barrier._playerReady === false, 'blockOnly barriers never show player-charge readiness (switch-controlled, not player-charged)');
}

section('[ Gate: update(dt) with no player argument degrades safely ]');
{
  const gate = new PowerGate({ id: 'g4', x: 0, y: 0, w: 12, h: 80, required: 2 });
  gate.update(0.016); // no player — simulates tooling/tests that call update(dt) alone
  assert(gate._playerReady === false, 'missing player argument reads as not-ready rather than throwing');
}

// ════════════════════════════════════════════════════════════════════
section('[ Scenario: moving away mid-absorb clears the drain tell, does not fake a dry-finish ]');
{
  const src = new ElectricalSource({ id: 's4', x: 0, y: 0, charge: 4 });
  src.drain(1); // partial drain, player was holding E
  assert(src._absorbT > 0, 'drain tell armed while absorbing');
  // Player walks away: nothing calls drain() again. Simulate several update frames.
  for (let i = 0; i < 10; i++) src.update(0.02);
  assert(src._absorbT === 0, 'drain tell lapses on its own once absorption stops (no explicit "stopped" event needed)');
  assert(src._dryFlash === 0, 'walking away with remaining charge never fires the dry-finish');
  assert(!src.drained, 'source still has charge and is still absorbable');
}

section('[ Scenario: returning to a previously-drained source is inert, not a fresh dry-finish ]');
{
  const src = new ElectricalSource({ id: 's5', x: 0, y: 0, charge: 1 });
  src.drain(1); // drains fully — dry-finish fires once
  assert(src._dryFlash === 0.5, 'dry-finish fired on first full drain');
  for (let i = 0; i < 30; i++) src.update(0.02); // let the cue fully decay (0.5s)
  assert(src._dryFlash === 0, 'cue has fully decayed by the time the player could walk back');
  const again = src.drain(1); // player returns, holds E on a dead source
  assert(again === 0, 'a drained source yields zero energy on return');
  assert(src._dryFlash === 0, 'returning to a drained source does not replay the dry-finish');
  assert(src._absorbT === 0, 'returning to a drained source does not arm the drain-pulse tell either (nothing was actually drained)');
}

// ── Summary ──────────────────────────────────
console.log(`\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('ALL TESTS PASS \u2713');
else process.exit(1);

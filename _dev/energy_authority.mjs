// ORDER 004 — CHARGE SYSTEM AUTHORITY regression suite.
// Run with: node _dev/energy_authority.mjs
//
// Exercises the REAL Player / PowerGate / EnergySource classes (not stubs), so
// a pass here means the shipped authority behaves, not a parallel model.
//
// Covers: the 11 required matrix rows, Kiro's three rulings, and the three gaps
// found during the Order 004 audit.

// ── Minimal browser surface (logic-only; no canvas work is performed) ────────
// window RECORDS its listeners so the binding tests can dispatch real synthetic
// keydown/keyup events into the actual input.js module. That means the SPACE /
// K / F assertions below exercise the shipped key handling, not a re-implementation.
const _listeners = {};
globalThis.window = {
  addEventListener(n, f){ (_listeners[n] = _listeners[n] || []).push(f); },
  removeEventListener(n, f){ if (_listeners[n]) _listeners[n] = _listeners[n].filter(x => x !== f); },
  innerWidth: 1920, innerHeight: 1080, location: { search: '' },
};
function fire(type, code) {
  for (const f of (_listeners[type] || [])) f({ code, preventDefault(){} });
}
globalThis.document = { getElementById: () => null, addEventListener(){}, removeEventListener(){},
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }), style: {} }),
  body: { style: {} } };
globalThis.Image = class { constructor(){ this.complete = true; this.naturalWidth = 1152; this.naturalHeight = 384; }
  addEventListener(n, f){ if (n === 'load') setTimeout(f, 0); } };

const { Player } = await import('../src_scroll/player.js');
const { MAX_CHARGE, MAX_BANKED_PIPS } = await import('../src_scroll/constants.js');
const EL = await import('../src_scroll/electricity.js');
const Input = await import('../src_scroll/input.js');

// Key helpers driving the REAL input module.
const keyDown = code => fire('keydown', code);
const keyUp   = code => fire('keyup', code);
const newFrame = () => Input.update();      // copies cur -> prev, so pressed() is edge-only
function releaseAll() { for (const c of ['Space','KeyK','KeyF','KeyE']) keyUp(c); newFrame(); }

let passed = 0, failed = 0;
function assert(condition, name, detail = '') {
  if (condition) { console.log(`  \u2713 ${name}${detail ? ' \u2014 ' + detail : ''}`); passed++; }
  else { console.error(`  \u2717 FAIL: ${name}${detail ? ' \u2014 ' + detail : ''}`); failed++; }
}
function section(t) { console.log(`\n${t}`); }

const P = () => new Player(0, 0);
const near = (a, b) => Math.abs(a - b) < 1e-6;
const show = p => `bar ${+p.charge.toFixed(4)} + ${p.bankedPips} pip`;

// A level stub sufficient for the paths under test.
const mkLevel = () => ({ pickups: [], sources: [], gates: [], switches: [],
  checkpoints: [], enemies: [], platforms: [], cols: 100, pxW: 3200, pxH: 450,
  tileAt: () => 0, solidAt: () => false, isSolid: () => false, rectHitsSolid: () => false });

console.log(`ORDER 004 ENERGY AUTHORITY  (MAX_CHARGE=${MAX_CHARGE}, MAX_BANKED_PIPS=${MAX_BANKED_PIPS})`);

// ════════════════════════════════════════════════════════════════════════════
section('REQUIRED MATRIX');

// Row 1 — Bar 0 + 5 -> Bar 5
{ const p = P(); p.setEnergyState(0, 0); p.giveEnergy(5);
  assert(near(p.charge, 5) && p.bankedPips === 0, 'bar 0 + 5 -> bar 5', show(p)); }

// Row 2 — Bar 8 + 4 -> Bar 2 + 1 pip   (Chief's worked example, verbatim)
{ const p = P(); p.setEnergyState(8, 0); p.giveEnergy(4);
  assert(near(p.charge, 2) && p.bankedPips === 1, 'bar 8 + 4 -> bar 2 + 1 pip', show(p)); }

// Row 3 — Bar 10 + 10.
// RULING 1 (Kiro, 2026-09-11): the order's table said "bar 0 + 1 pip", which
// contradicts the same order's §7 conservation invariant (it would destroy 10
// units). When an example contradicts the stated invariant, the invariant wins.
// Corrected expectation: bar 0 + 2 pips, 20 usable, nothing destroyed.
{ const p = P(); p.setEnergyState(10, 0);
  const before = p.usableEnergy;
  const accepted = p.giveEnergy(10);
  assert(p.charge === 0 && p.bankedPips === 2, 'bar 10 + 10 -> bar 0 + 2 pips [RULING 1]', show(p));
  assert(near(p.usableEnergy, before + accepted), '  ...and energy is conserved',
    `${before} + ${accepted} = ${p.usableEnergy}`); }

// Row 4 — full bar + gain at MAX pips -> remains full, nothing vanishes
{ const p = P(); p.setEnergyState(MAX_CHARGE, MAX_BANKED_PIPS);
  const before = p.usableEnergy;
  const accepted = p.giveEnergy(50);
  assert(p.charge === MAX_CHARGE && p.bankedPips === MAX_BANKED_PIPS,
    'full bar + max pips -> remains full', show(p));
  assert(accepted === 0 && p.usableEnergy === before,
    '  ...refused safely, nothing destroyed', `accepted ${accepted}, usable still ${p.usableEnergy}`); }

// Row 5 — Bar 0 + 1 pip -> Bar MAX + 0 pips, on DEMAND.
// RULING 2: eager per-tick refill is REJECTED; the pull happens at the moment
// something actually spends. Proven here through the public spend authority.
{ const p = P(); p.setEnergyState(0, 1);
  const spent = p.spendEnergy(0);   // zero-cost demand must not move anything
  assert(spent === 0 && p.charge === 0 && p.bankedPips === 1,
    'zero-cost spend does not touch the reserve', show(p));
  const got = p.spendEnergy(1);
  assert(near(got, 1) && near(p.charge, MAX_CHARGE - 1) && p.bankedPips === 0,
    'bar 0 + 1 pip, on demand -> pip promoted to a full bar', show(p)); }

// Row 6 — Gate + full bar -> gate accepts (must never say POWER REQUIRED)
{ const p = P(); p.setEnergyState(MAX_CHARGE, 0);
  const g = new EL.PowerGate({ id: 'G', x: 0, y: 0, w: 32, h: 64, required: 5 });
  const needed = g.required - g.charged;
  assert(p.canAfford(needed) === true, 'gate + full bar -> affordable (no POWER REQUIRED)',
    `usable ${p.usableEnergy} >= needed ${needed}`);
  const moved = p.spendEnergy(needed);
  g.receive(moved);
  assert(near(g.charged, 5) && g.open === true, '  ...and the gate actually opens',
    `charged ${g.charged}/${g.required}, open=${g.open}`); }

// Row 7 — Gate + pip reserve only -> reserve counts as usable energy
{ const p = P(); p.setEnergyState(0, 2);
  const g = new EL.PowerGate({ id: 'G', x: 0, y: 0, w: 32, h: 64, required: 5 });
  assert(p.usableEnergy === 2 * MAX_CHARGE, 'bar 0 + 2 pips -> usable 20', String(p.usableEnergy));
  assert(p.canAfford(g.required), 'gate + pip reserve -> affordable from reserve alone');
  const moved = p.spendEnergy(g.required);
  g.receive(moved);
  assert(near(moved, 5) && g.open === true, '  ...reserve is consumed and the gate opens',
    `moved ${moved}, ${show(p)}`); }

// Row 8 — drain to 0 + pip -> auto refill under demand
{ const p = P(); p.setEnergyState(1, 1);
  const spent = p.spendEnergy(3);   // 1 from the bar, then promote the pip
  assert(near(spent, 3) && near(p.charge, MAX_CHARGE - 2) && p.bankedPips === 0,
    'drain across a pip boundary refills automatically', `spent ${spent}, ${show(p)}`); }

// Row 9 — multiple energy sources, one authority
{ const a = P(); a.setEnergyState(0, 0);
  a.giveEnergy(3);                                  // source absorption
  a.giveEnergy(2);                                  // charge pickup
  a.giveEnergy(2);                                  // dev-key energy
  const b = P(); b.setEnergyState(0, 0); b.giveEnergy(7);   // one lump
  assert(a.usableEnergy === b.usableEnergy && a.usableEnergy === 7,
    'many sources == one authority (identical result)', `${a.usableEnergy} vs ${b.usableEnergy}`);
  // Crossing the bank boundary must also agree between paths.
  const c = P(); c.setEnergyState(0, 0);
  for (let i = 0; i < 12; i++) c.giveEnergy(1);
  const d = P(); d.setEnergyState(0, 0); d.giveEnergy(12);
  assert(c.charge === d.charge && c.bankedPips === d.bankedPips,
    '  ...including across a bank boundary', `${show(c)} vs ${show(d)}`); }

// Row 10 — save/load preserves charge state
{ const p = P(); p.setEnergyState(4, 3);
  const saved = { charge: p.charge, bankedPips: p.bankedPips };   // what main.js snapshots
  const q = P(); q.setEnergyState(saved.charge, saved.bankedPips);
  assert(near(q.charge, 4) && q.bankedPips === 3, 'save/load preserves charge state', show(q));
  assert(q.usableEnergy === p.usableEnergy, '  ...usable energy identical after reload',
    `${q.usableEnergy} vs ${p.usableEnergy}`); }

// ════════════════════════════════════════════════════════════════════════════
section('AUDIT GAPS (fixed under Order 004)');

// GAP 1 — a spend authority exists and mirrors giveEnergy
{ const p = P();
  assert(typeof p.spendEnergy === 'function', 'GAP 1: spendEnergy() authority exists');
  assert(typeof p.spendPip === 'function', 'GAP 1: spendPip() authority exists');
  assert(typeof p.setEnergyState === 'function', 'GAP 1: setEnergyState() authority exists'); }

// GAP 1b — spend never goes negative and never fabricates energy
{ const p = P(); p.setEnergyState(2, 0);
  const spent = p.spendEnergy(999);
  assert(near(spent, 2) && p.charge === 0 && p.bankedPips === 0,
    'overspend returns only what existed, bar floors at 0', `spent ${spent}, ${show(p)}`);
  assert(p.spendEnergy(5) === 0, 'spending from empty returns 0');
  assert(p.charge === 0 && p.bankedPips === 0, '  ...and leaves no negative state', show(p));
  assert(p.spendEnergy(-5) === 0, 'negative spend is ignored'); }

// GAP 2 — takeDamage must see the banked reserve (was: 30 usable took 0 damage)
{ const p = P(); p.setEnergyState(0, 3);
  const lvl = mkLevel();
  const before = p.usableEnergy;
  const lost = p.takeDamage(lvl, 3);
  assert(near(lost, 3) && near(before - p.usableEnergy, 3),
    'GAP 2: takeDamage drains the reserve, not just the bar',
    `usable ${before} -> ${p.usableEnergy} (lost ${lost})`);
  const dropped = lvl.pickups.reduce((s, k) => s + k.value, 0);
  assert(near(dropped, lost), '  ...pickups dropped == energy deducted (conserved)',
    `dropped ${dropped} vs lost ${lost}`); }

// GAP 2b — scatter reaches the reserve and conserves on a fractional bar
{ const p = P(); p.setEnergyState(0, 1);
  const lvl = mkLevel();
  p.scatter(lvl);
  assert(p.dead === false, 'GAP 2: scatter survives on reserve alone', show(p));
  assert(near(p.usableEnergy, MAX_CHARGE - 1), '  ...exactly 1 unit deducted', String(p.usableEnergy));

  const q = P(); q.setEnergyState(0.5, 0);
  const lvl2 = mkLevel();
  const beforeQ = q.usableEnergy;
  q.scatter(lvl2);
  const droppedQ = lvl2.pickups.reduce((s, k) => s + k.value, 0);
  assert(near(droppedQ, beforeQ - q.usableEnergy),
    '  ...fractional bar does not create energy (old bug: dropped 1 for 0.5)',
    `deducted ${beforeQ - q.usableEnergy}, dropped ${droppedQ}`); }

// GAP 2c — no energy at all is still death
{ const p = P(); p.setEnergyState(0, 0);
  p.scatter(mkLevel());
  assert(p.dead === true, 'no bar and no pips -> death (unchanged)'); }

// GAP 3 — restore validation
{ const p = P();
  const clean = p.setEnergyState(999, 99);
  assert(clean === false, 'GAP 3: out-of-range restore reports it was corrected');
  assert(p.charge === MAX_CHARGE && p.bankedPips === MAX_BANKED_PIPS,
    '  ...clamped into the legal envelope', show(p));
  assert(p.energyHeadroom >= 0, '  ...energyHeadroom no longer goes negative',
    String(p.energyHeadroom));

  const q = P();
  assert(q.setEnergyState(-5, -2) === false, 'negative restore is corrected');
  assert(q.charge === 0 && q.bankedPips === 0, '  ...clamped to zero', show(q));

  const r = P();
  assert(r.setEnergyState(NaN, undefined) === false, 'NaN/undefined restore is corrected');
  assert(r.charge === 0 && r.bankedPips === 0, '  ...defaults to empty', show(r));

  const s = P();
  assert(s.setEnergyState(3, 2.7) === false, 'fractional pip count is corrected');
  assert(s.bankedPips === 2, '  ...pips floored to whole batteries', show(s));

  const t = P();
  assert(t.setEnergyState(4, 2) === true, 'a legal restore reports clean'); }

// ════════════════════════════════════════════════════════════════════════════
section('RULINGS (Kiro, 2026-09-11)');

// RULING 2 — a bare tick must NOT move the reserve (the b558d1b regression)
{ const p = P(); p.setEnergyState(0, 1);
  const lvl = mkLevel();
  for (let i = 0; i < 12; i++) { try { p.update(1 / 60, lvl); } catch { /* input/render stubs */ } }
  assert(p.charge === 0 && p.bankedPips === 1,
    'RULING 2: idle ticks leave bar 0 + 1 pip untouched', show(p)); }

// RULING 2b — and pips can therefore actually accumulate
{ const p = P(); p.setEnergyState(0, 0);
  for (let i = 0; i < 3; i++) p.giveEnergy(MAX_CHARGE);
  const lvl = mkLevel();
  for (let i = 0; i < 12; i++) { try { p.update(1 / 60, lvl); } catch { /* stubs */ } }
  assert(p.bankedPips === 3, 'RULING 2: banked pips survive idle ticks (regression guard)', show(p)); }

// RULING 3 — whole-pip spend with surplus returned to the bar
{ const p = P(); p.setEnergyState(0, 1);
  const battery = p.spendPip();
  assert(battery === MAX_CHARGE, 'RULING 3: spendPip yields exactly one full battery', String(battery));
  assert(p.bankedPips === 0 && p.charge === 0, '  ...pip consumed, active bar untouched', show(p));
  // Gate needs 3 of the 10 — surplus 7 must come back, not evaporate.
  const g = new EL.PowerGate({ id: 'G', x: 0, y: 0, w: 32, h: 64, required: 3 });
  const transfer = Math.min(battery, g.required - g.charged);
  g.receive(transfer);
  const surplus = battery - transfer;
  p.giveEnergy(surplus);
  assert(g.open === true && near(p.usableEnergy, 7),
    '  ...gate opens on 3 and the surplus 7 returns to the player',
    `gate open=${g.open}, ${show(p)}`);
  assert(near(transfer + p.usableEnergy, MAX_CHARGE), '  ...battery fully accounted for (conserved)',
    `${transfer} delivered + ${p.usableEnergy} returned = ${MAX_CHARGE}`); }

// spendPip with no reserve must be a no-op
{ const p = P(); p.setEnergyState(5, 0);
  assert(p.spendPip() === 0, 'spendPip with no reserve yields 0');
  assert(near(p.charge, 5) && p.bankedPips === 0, '  ...and changes nothing', show(p)); }

// ════════════════════════════════════════════════════════════════════════════
section('CONSERVATION INVARIANT (§7) — randomized');

// Any interleaving of gains and spends must conserve energy exactly, and never
// leave an out-of-range state. This is the guard that would have caught the
// original banking bug and the scatter leak.
{ let worst = 0, illegal = 0;
  for (let seed = 0; seed < 400; seed++) {
    const p = P(); p.setEnergyState(0, 0);
    let credited = 0, debited = 0;
    let x = seed * 2654435761 % 2147483647;
    const rnd = () => (x = (x * 1103515245 + 12345) % 2147483647) / 2147483647;
    for (let step = 0; step < 40; step++) {
      if (rnd() < 0.55) {
        const amt = rnd() * 14;
        credited += p.giveEnergy(amt);            // only what was accepted
      } else {
        debited += p.spendEnergy(rnd() * 14);     // only what was actually spent
      }
      if (p.charge < -1e-9 || p.charge > MAX_CHARGE + 1e-9 ||
          p.bankedPips < 0 || p.bankedPips > MAX_BANKED_PIPS) illegal++;
    }
    worst = Math.max(worst, Math.abs(p.usableEnergy - (credited - debited)));
  }
  assert(worst < 1e-6, '400 randomized gain/spend runs conserve energy exactly',
    `worst drift ${worst.toExponential(2)}`);
  assert(illegal === 0, 'state never leaves the legal envelope', `${illegal} violations`); }

// ════════════════════════════════════════════════════════════════════════════
section('ORDER SPACE_CHARGE — key bindings (drives the real input.js)');

// Rig a grounded player standing at a gate. nearDevice is what _updateContext
// would have set; physics is not needed to test the binding + transfer.
function atGate(required = 8, charge = MAX_CHARGE, pips = 0) {
  const p = P();
  p.setEnergyState(charge, pips);
  p.grounded = true;
  const g = new EL.PowerGate({ id: 'G', x: 0, y: 0, w: 32, h: 64, required });
  p.nearDevice = g;
  p.nearSource = null;
  p.nearEnemy  = null;
  return { p, g };
}
const lvl = () => mkLevel();

// ── SPACE charges a gate ────────────────────────────────────────────────────
{ releaseAll();
  const { p, g } = atGate(8);
  const before = p.usableEnergy;
  keyDown('Space');
  p._updateDischarge(1 / 60, lvl());
  const moved = g.charged;
  assert(moved > 0, 'SPACE: holding near a gate transfers energy', `charged ${moved.toFixed(4)}`);
  assert(near(before - p.usableEnergy, moved),
    '  ...deducted exactly what the gate received (conserved)',
    `player -${(before - p.usableEnergy).toFixed(4)} / gate +${moved.toFixed(4)}`);
  assert(p.discharging === true, '  ...player enters the charging state');
  releaseAll(); }

// ── one press does NOT complete a gate (the whole point of the order) ───────
{ releaseAll();
  const { p, g } = atGate(8);
  keyDown('Space');
  p._updateDischarge(1 / 60, lvl());   // a single frame of holding
  assert(g.open === false, 'SPACE: a single frame cannot open the gate', `charged ${g.charged.toFixed(4)}/8`);
  assert(g.charged < 8, '  ...transfer is rate-limited, not instant', `${g.charged.toFixed(4)} < 8`);
  // Sustained holding DOES eventually open it.
  for (let i = 0; i < 600 && !g.open; i++) p._updateDischarge(1 / 60, lvl());
  assert(g.open === true, '  ...but sustained holding opens it', `charged ${g.charged}/8`);
  releaseAll(); }

// ── releasing SPACE stops the transfer ─────────────────────────────────────
{ releaseAll();
  const { p, g } = atGate(8);
  keyDown('Space');
  p._updateDischarge(1 / 60, lvl());
  const after1 = g.charged;
  keyUp('Space'); newFrame();
  p._updateDischarge(1 / 60, lvl());
  assert(near(g.charged, after1), 'SPACE released: transfer stops', `still ${g.charged.toFixed(4)}`);
  assert(p.discharging === false, '  ...and the charging state clears');
  releaseAll(); }

// ── F is UNBOUND: no instant fill, no effect at all ────────────────────────
{ releaseAll();
  const { p, g } = atGate(8, MAX_CHARGE, 3);
  const before = p.usableEnergy;
  assert(typeof p._updatePipSpend === 'undefined',
    'F: the _updatePipSpend handler no longer exists');
  keyDown('KeyF');
  // Everything the update loop would run for input this frame.
  p._updateAttack(1 / 60, lvl());
  p._updateDischarge(1 / 60, lvl());
  assert(g.charged === 0 && g.open === false,
    'F: pressing F transfers nothing to the gate', `charged ${g.charged}, open ${g.open}`);
  assert(p.usableEnergy === before, '  ...and costs the player nothing', `usable still ${p.usableEnergy}`);
  assert(p.bankedPips === 3, '  ...reserve untouched (no pip consumed)', `${p.bankedPips} pips`);
  releaseAll(); }

// ── spendPip() authority SURVIVES even though its key binding is gone ──────
{ const p = P(); p.setEnergyState(0, 1);
  assert(typeof p.spendPip === 'function' && p.spendPip() === MAX_CHARGE,
    'F unbound, but spendPip() authority is retained (order §2)'); }

// ── K attacks; SPACE does not ──────────────────────────────────────────────
{ releaseAll();
  const p = P(); p.setEnergyState(MAX_CHARGE, 0); p.grounded = true;
  let hits = 0;
  const enemy = { alive: true, hp: 3, maxHp: 3, cx: 0, cy: 0, x: 0, y: 0,
                  hit(){ hits++; this.hp--; } };
  p.nearEnemy = enemy; p.nearDevice = null; p.nearSource = null;
  p._attackCooldown = 0;

  keyDown('KeyK');
  p._updateAttack(1 / 60, lvl());
  assert(hits === 1, 'K: pressing K near an enemy lands one hit', `hits ${hits}`);
  releaseAll();

  p._attackCooldown = 0; hits = 0;
  keyDown('Space');
  p._updateAttack(1 / 60, lvl());
  assert(hits === 0, 'SPACE: no longer attacks (K owns attack)', `hits ${hits}`);
  releaseAll(); }

// ── K does not charge a gate, and costs no energy ──────────────────────────
{ releaseAll();
  const { p, g } = atGate(8);
  const before = p.usableEnergy;
  keyDown('KeyK');
  p._updateAttack(1 / 60, lvl());
  p._updateDischarge(1 / 60, lvl());
  assert(g.charged === 0, 'K: does not charge a gate', `charged ${g.charged}`);
  assert(p.usableEnergy === before, '  ...and never touches energy', `usable ${p.usableEnergy}`);
  releaseAll(); }

// ── SPACE-charging works while standing at a source (removed guard) ────────
{ releaseAll();
  const { p, g } = atGate(8);
  p.nearSource = new EL.ElectricalSource({ id: 'S', x: 400, y: 0, charge: 4 });
  keyDown('Space');
  p._updateDischarge(1 / 60, lvl());
  assert(g.charged > 0,
    'SPACE charges even while near a source (old nearSource guard removed)',
    `charged ${g.charged.toFixed(4)}`);
  releaseAll(); }

// ── charging draws on the banked reserve when the bar runs dry ─────────────
{ releaseAll();
  const { p, g } = atGate(8, 0, 2);     // empty bar, 2 stored batteries
  assert(p.canAfford(8), 'reserve alone satisfies the gate requirement', `usable ${p.usableEnergy}`);
  keyDown('Space');
  for (let i = 0; i < 600 && !g.open; i++) p._updateDischarge(1 / 60, lvl());
  assert(g.open === true, 'SPACE: gate opens using the reserve', `charged ${g.charged}/8, ${show(p)}`);
  assert(near(20 - p.usableEnergy, 8), '  ...exactly 8 left the player', `spent ${20 - p.usableEnergy}`);
  releaseAll(); }
// ════════════════════════════════════════════════════════════════════════════
console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('ALL TESTS PASS \u2713');
process.exit(failed === 0 ? 0 : 1);

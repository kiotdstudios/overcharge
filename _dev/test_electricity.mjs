// Electricity system unit tests — run with: node _dev/test_electricity.mjs
// Tests pure logic only (no canvas/DOM required)

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${name}`);
    failed++;
  }
}

// ── Stub classes (no imports needed — logic only) ──────────────────
const ABSORB_RADIUS   = 56;
const INTERACT_RADIUS = 50;

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

class Source {
  constructor(x, y, charge) {
    this.x = x; this.y = y; this.w = 28; this.h = 28;
    this.charge = charge; this.max = charge; this.drained = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  inRange(px, py) { return dist(px, py, this.cx, this.cy) < ABSORB_RADIUS; }
  drain(amount) {
    if (this.drained) return 0;
    const actual = Math.min(this.charge, amount);
    this.charge -= actual;
    if (this.charge <= 0) { this.charge = 0; this.drained = true; }
    return actual;
  }
}

class Gate {
  constructor(x, y, w, h, required) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.required = required; this.charged = 0; this.open = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  inRange(px, py) { return dist(px, py, this.cx, this.cy) < INTERACT_RADIUS; }
  receive(amount) {
    const take = Math.min(amount, this.required - this.charged);
    this.charged += take;
    if (this.charged >= this.required) { this.open = true; return true; }
    return false;
  }
  blocks(rx, ry, rw, rh) {
    if (this.open) return false;
    return !(rx + rw <= this.x || rx >= this.x + this.w ||
             ry + rh <= this.y || ry >= this.y + this.h);
  }
}

class Sw {
  constructor(x, y, required) {
    this.x = x; this.y = y; this.w = 22; this.h = 22;
    this.required = required; this.charged = 0; this.on = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  inRange(px, py) { return dist(px, py, this.cx, this.cy) < INTERACT_RADIUS; }
  receive(amount) {
    this.charged += amount;
    if (this.charged >= this.required) { this.on = true; return true; }
    return false;
  }
}

// ── Tests ─────────────────────────────────────────────────────────
console.log('\n[ ElectricalSource ]');
{
  const src = new Source(100, 100, 3);
  assert(!src.drained,                         'starts active');
  assert(src.inRange(130, 120),                'player at 130,120 is in range');
  assert(!src.inRange(200, 200),               'player far away not in range');
  const gained = src.drain(2);
  assert(gained === 2,                         'drain(2) returns 2');
  assert(src.charge === 1,                     'charge reduced to 1');
  assert(!src.drained,                         'not drained yet');
  const gained2 = src.drain(5);
  assert(gained2 === 1,                        'drain(5) clamps to remaining 1');
  assert(src.charge === 0,                     'charge is 0');
  assert(src.drained,                          'now drained');
  assert(src.drain(1) === 0,                   'drained source returns 0');
}

console.log('\n[ PowerGate ]');
{
  const gate = new Gate(400, 300, 12, 80, 3);
  assert(!gate.open,                           'starts locked');
  assert(gate.blocks(395, 320, 10, 20),        'blocks overlapping rect');
  assert(!gate.blocks(200, 300, 10, 20),       'does not block non-overlapping rect');
  assert(!gate.receive(2),                     'receive(2) not enough — gate stays closed');
  assert(gate.charged === 2,                   'partial charge tracked');
  assert(gate.receive(1),                      'receive(1) fills to 3 — returns true');
  assert(gate.open,                            'gate is now open');
  assert(!gate.blocks(395, 320, 10, 20),       'open gate does not block');
}

console.log('\n[ Switch ]');
{
  const sw = new Sw(320, 360, 1);
  assert(!sw.on,                               'starts off');
  assert(sw.inRange(340, 375),                 'player nearby is in range');
  assert(!sw.receive(0.5),                     'partial charge not enough');
  assert(!sw.on,                               'still off');
  assert(sw.receive(0.5),                      'topped up to 1 — returns true');
  assert(sw.on,                                'switch is now on');
}

console.log('\n[ Level 1 Puzzle Simulation ]');
{
  // Simulate the Level 1 solve path: absorb source → discharge gate
  const src  = new Source(144, 356, 3);
  const gate = new Gate(730, 288, 12, 96, 3);
  let playerCharge = 0;
  const MAX = 10;

  // Absorb all 3
  const gained = src.drain(3);
  playerCharge = Math.min(MAX, playerCharge + gained);
  assert(playerCharge === 3,                   'L1: player has 3 after absorb');

  // Discharge to gate
  const needed = gate.required - gate.charged;
  assert(playerCharge >= needed,               'L1: player has enough to open gate');
  playerCharge -= needed;
  gate.receive(needed);
  assert(gate.open,                            'L1: exit gate opens');
  assert(playerCharge === 0,                   'L1: player spent all charge');
}

console.log('\n[ Level 2 Puzzle Simulation ]');
{
  // Simulate the correct solve path for Level 2
  const srcA    = new Source(160, 356, 2);
  const srcB    = new Source(560, 356, 2);
  const barrier = new Gate(384, 320, 32, 80, 1);
  const exit    = new Gate(730, 288, 12, 96, 3);
  const sw      = new Sw(320, 362, 1);
  let pc = 0;

  // Step 1: absorb Source A
  pc += srcA.drain(2);
  assert(pc === 2,                             'L2: charge = 2 after Source A');

  // Step 2: wrong path — try to open exit directly (needs 3, have 2)
  assert(pc < exit.required,                   'L2: cannot open exit directly');

  // Step 3: discharge switch (costs 1)
  const swNeeded = sw.required - sw.charged;
  pc -= swNeeded;
  const swActivated = sw.receive(swNeeded);
  assert(swActivated,                          'L2: switch activated');
  assert(pc === 1,                             'L2: charge = 1 after switch');

  // Barrier opens via switch
  if (sw.on) barrier.open = true;
  assert(barrier.open,                         'L2: barrier opens from switch');
  assert(!barrier.blocks(390, 330, 10, 20),    'L2: can now pass through barrier');

  // Step 4: absorb Source B
  pc += srcB.drain(2);
  assert(pc === 3,                             'L2: charge = 3 after Source B');

  // Step 5: discharge exit
  const exitNeeded = exit.required - exit.charged;
  assert(pc >= exitNeeded,                     'L2: enough charge for exit');
  pc -= exitNeeded;
  exit.receive(exitNeeded);
  assert(exit.open,                            'L2: exit opens');
}

// ── Summary ──────────────────────────────────
console.log(`\n─────────────────────────────────────`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('ALL TESTS PASS ✓');
else process.exit(1);

// ── blockOnly gate should not be targetable by player ──
console.log('\n[ blockOnly barrier ]');
{
  class BOnlyGate {
    constructor() {
      this.blockOnly = true;
      this.open = false;
      this.required = 1;
      this.charged = 0;
      this.x = 396; this.y = 0; this.w = 10; this.h = 384;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    receive(a) { this.charged += a; if (this.charged >= this.required) { this.open = true; return true; } return false; }
    blocks(rx,ry,rw,rh) {
      if (this.open) return false;
      return !(rx+rw<=this.x||rx>=this.x+this.w||ry+rh<=this.y||ry>=this.y+this.h);
    }
  }

  const barrier = new BOnlyGate();
  // Player should not target blockOnly gates directly (simulated)
  const playerTargets = [barrier].filter(g => !g.blockOnly);
  assert(playerTargets.length === 0,           'blockOnly gate filtered from player targeting');
  // But switch can open it
  barrier.receive(1);
  assert(barrier.open,                         'switch can still open blockOnly gate via receive()');
  assert(!barrier.blocks(390, 200, 20, 30),    'open blockOnly gate no longer blocks');
}

// ── Level 3 puzzle simulation ──
console.log('\n[ Level 3 Puzzle Simulation ]');
{
  const srcA = new Source(96,  356, 2);
  const srcB = new Source(616, 356, 2);
  const exit = new Gate(730, 288, 12, 96, 3);
  let pc = 0;

  // Get hit once (lose 1 charge) then recover
  pc += srcA.drain(2);                   // absorb A
  assert(pc === 2, 'L3: absorb A → 2');
  pc -= 1;                               // drain enemy hit
  assert(pc === 1, 'L3: hit → 1');
  pc += 1;                               // recover pickup
  assert(pc === 2, 'L3: recovery → 2');
  pc += srcB.drain(2);                   // absorb B
  assert(pc === 4, 'L3: absorb B → 4');
  const needed = exit.required - exit.charged;
  pc -= needed;
  exit.receive(needed);
  assert(exit.open, 'L3: exit opens with excess charge');
}

// ── Level 4 puzzle simulation ──
console.log('\n[ Level 4 Puzzle Simulation ]');
{
  const src  = new Source(32, 100, 4);
  const exit = new Gate(714, 64, 12, 96, 4);
  let pc = 0;

  pc += src.drain(4);
  assert(pc === 4, 'L4: full absorb → 4');
  // Hit by 1 enemy during traversal
  pc -= 1;
  assert(pc === 3, 'L4: hit en route → 3');
  // Pickup falls into pit — lost (can happen in L4)
  assert(pc < exit.required, 'L4: not enough after losing pickup in pit');
  // Player must avoid hits to succeed — simulation: clean run
  pc = 0;
  pc += src.drain(4);
  const needed = exit.required - exit.charged;
  pc -= needed;
  exit.receive(needed);
  assert(exit.open, 'L4: exit opens on clean run');
}

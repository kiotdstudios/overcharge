// Level 7 — "CHAIN"
// Two-step switch chain: each switch costs 1 charge and opens the next zone.
// 3 sources (2 each), 2 barriers, 2 switches, exit needs 4.
// Math: 6 total - 1(sw1) - 1(sw2) = 4 = exit.  Zero waste — every charge counts.
// Sequence: absorb A → activate SW1 → absorb B → activate SW2 → absorb C → charge exit.
// Drain enemy guards the SW1 approach; patrol enemy locks down the right zone.

const _ = 0, S = 1, P = 2;

export const LEVEL7 = {
  name:   'CHAIN',
  number: 7,

  // prettier-ignore
  tiles: [
    ...Array(9 * 25).fill(0),       // rows 0–8
    ...[_,_,_,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_,P,P,P,_,_,_,_], // row 9 — two flanking platforms
    ...Array(2 * 25).fill(0),       // rows 10–11
    ...Array(2 * 25).fill(1),       // rows 12–13 solid ground
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    { id: 'src_a', x: 96,  y: 356, charge: 2, label: 'SOURCE A' },
    { id: 'src_b', x: 400, y: 356, charge: 2, label: 'SOURCE B' },
    { id: 'src_c', x: 634, y: 356, charge: 2, label: 'SOURCE C' },
  ],

  gates: [
    { id: 'wall_1',    x: 334, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'wall_2',    x: 580, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'gate_exit', x: 730, y: 0, w: 12, h: 384, required: 4, isExit: true },
  ],

  switches: [
    { id: 'sw_1', x: 252, y: 362, required: 1, linkedId: 'wall_1', label: 'BARRIER 1' },
    { id: 'sw_2', x: 490, y: 362, required: 1, linkedId: 'wall_2', label: 'BARRIER 2' },
  ],

  enemies: [
    // Drain guards the path from Source A to SW1
    { type: 'drain',  x: 170, y: 360, patrolLeft: 110, patrolRight: 315, speed: 70 },
    // Patrol locks down the right zone past wall_2
    { type: 'patrol', x: 598, y: 358, patrolLeft: 580, patrolRight: 712, speed: 76 },
  ],
};

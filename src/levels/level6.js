// Level 6 — "HIGH WIRE"
// Source is on an elevated row-6 platform — player must climb up, absorb,
// then drop back to ground and navigate two patrol enemies to reach the exit.
// No switch: pure platforming + enemy timing. Exit needs all 4 charge.
//
// Ascent path:  ground → row-9 stepping stone (cols 2-4) → row-6 platform (cols 2-14)
// Descent path: walk off right end of row-6 (col 14) → fall to ground near patrol 2
// Challenge: patrol 2 covers the drop zone — timing the fall is key.

const _ = 0, S = 1, P = 2;

export const LEVEL6 = {
  name:   'HIGH WIRE',
  number: 6,

  // prettier-ignore
  tiles: [
    ...Array(6 * 25).fill(0),       // rows 0–5
    ...[_,_,P,P,P,P,P,P,P,P,P,P,P,P,P,_,_,_,_,_,_,_,_,_,_], // row 6 — wide elevated platform (cols 2-14)
    ...Array(2 * 25).fill(0),       // rows 7–8
    ...[_,_,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_], // row 9 — left stepping stone (cols 2-4)
    ...Array(2 * 25).fill(0),       // rows 10–11
    ...Array(2 * 25).fill(1),       // rows 12–13 solid ground
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    // Col 8 on row-6 platform; surface y=192, so source.y = 192-28 = 164
    { id: 'src_main', x: 256, y: 164, charge: 4, label: 'GENERATOR' },
  ],

  gates: [
    { id: 'gate_exit', x: 730, y: 0, w: 12, h: 384, required: 4, isExit: true },
  ],

  switches: [],

  enemies: [
    // Patrol 1: left ground — blocks ground approach and the stepping stone zone
    { type: 'patrol', x: 150, y: 358, patrolLeft: 50,  patrolRight: 345, speed: 58 },
    // Patrol 2: right ground — covers the drop zone from the platform and the exit approach
    { type: 'patrol', x: 500, y: 358, patrolLeft: 440, patrolRight: 712, speed: 72 },
  ],
};

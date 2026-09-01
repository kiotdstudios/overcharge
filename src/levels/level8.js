// Level 8 — "PRESSURE"
// 3 sources (2 each), 1 switch, exit needs 5.  Math: 6 - 1(sw) = 5.  Zero waste.
// Source B is on the elevated row-6 platform, guarded by a drain enemy up there.
// Getting hit and losing a charge without recovering the pickup = fail state.
//
// Ascent: ground → row-9 cols 6-8 (step under platform) → jump to row-6 cols 8-12
// Note: row-9 step is at col 6-8, aligning with the row-6 platform left edge (col 8).

const _ = 0, S = 1, P = 2;

export const LEVEL8 = {
  name:   'PRESSURE',
  number: 8,

  // prettier-ignore
  tiles: [
    ...Array(6 * 25).fill(0),       // rows 0–5
    ...[_,_,_,_,_,_,_,_,P,P,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_], // row 6  — elevated platform (cols 8-12)
    ...Array(2 * 25).fill(0),       // rows 7–8
    ...[_,_,_,_,_,_,P,P,P,_,_,_,_,_,_,P,P,P,P,_,_,_,_,_,_], // row 9  — left step (6-8) + right step (15-18)
    ...Array(2 * 25).fill(0),       // rows 10–11
    ...Array(2 * 25).fill(1),       // rows 12–13 solid ground
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    { id: 'src_a', x: 80,  y: 356, charge: 2, label: 'SOURCE A' },
    // Col 10 on row-6 platform: x=10*32=320, y=6*32-28=164
    { id: 'src_b', x: 320, y: 164, charge: 2, label: 'SOURCE B' },
    // Past the barrier
    { id: 'src_c', x: 584, y: 356, charge: 2, label: 'SOURCE C' },
  ],

  gates: [
    { id: 'wall_m',    x: 458, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'gate_exit', x: 730, y: 0, w: 12, h: 384, required: 5, isExit: true },
  ],

  switches: [
    { id: 'sw_m', x: 370, y: 362, required: 1, linkedId: 'wall_m', label: 'OPEN WALL' },
  ],

  enemies: [
    // Drain 1 patrols between Source A and SW — player must dodge to reach the switch
    { type: 'drain',  x: 160, y: 360, patrolLeft: 90,  patrolRight: 358, speed: 72 },
    // Drain 2 guards Source B on the elevated platform; y = 6*32-24 = 168
    { type: 'drain',  x: 320, y: 168, patrolLeft: 258, patrolRight: 400, speed: 66 },
    // Patrol guards the right zone past the barrier + source C
    { type: 'patrol', x: 524, y: 358, patrolLeft: 460, patrolRight: 712, speed: 80 },
  ],
};

// Level 10 — "FULL DISCHARGE"
// Everything at once: pit, 4-tier ladder, 4 enemies, 3 sources, 1 switch.
// Math: A(2) + B(2) + C(2) = 6.  SW costs 1.  Exit needs 5.  6-1=5.
// Buffer of 1: getting hit once and failing to recover a pickup = fail state.
//
// Left ground: cols 0-5.  Right ground: cols 19-24.  Pit: cols 6-18.
// Row-6 platforms: cols 1-4 (left), 7-10 (center-left), 14-17 (center-right).
// Row-9 platforms: same cols as row-6 (stacking ladders on left and center).
//
// Route:
//   1. Absorb A (left ground) → dodge Drain 1
//   2. Climb: ground → row-9 left → row-6 left → jump to row-6 center-left
//   3. Dodge Patrol 2 → absorb B → jump to row-6 center-right
//   4. Fall to right ground (~x 660) → dodge Drain 3 → absorb C → activate SW
//   5. Barrier opens → dodge Patrol 4 → charge exit (5)

const _ = 0, S = 1, P = 2;

export const LEVEL10 = {
  name:   'FULL DISCHARGE',
  number: 10,

  // prettier-ignore
  tiles: [
    ...Array(6 * 25).fill(0),       // rows 0–5
    ...[_,P,P,P,P,_,_,P,P,P,P,_,_,_,P,P,P,P,_,_,_,_,_,_,_], // row 6  — cols 1-4, 7-10, 14-17
    ...Array(2 * 25).fill(0),       // rows 7–8
    ...[_,P,P,P,P,_,_,P,P,P,P,_,_,_,P,P,P,P,_,_,_,_,_,_,_], // row 9  — same layout as row 6
    ...Array(2 * 25).fill(0),       // rows 10–11
    ...[S,S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S,S], // row 12 — left+right ground
    ...[S,S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S,S], // row 13
  ],

  playerStart: { x: 32, y: 354 },

  sources: [
    // Left ground
    { id: 'src_a', x: 80,  y: 356, charge: 2, label: 'SOURCE A' },
    // Row-6 center-left (col 8): x=8*32=256, y=6*32-28=164
    { id: 'src_b', x: 256, y: 164, charge: 2, label: 'SOURCE B' },
    // Right ground, past barrier
    { id: 'src_c', x: 660, y: 356, charge: 2, label: 'SOURCE C' },
  ],

  gates: [
    { id: 'barrier_exit', x: 642, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'gate_exit',    x: 730, y: 0, w: 12, h: 384, required: 5, isExit: true },
  ],

  switches: [
    // Right ground, before the barrier — player must dodge enemies to reach it
    { id: 'sw_exit', x: 620, y: 362, required: 1, linkedId: 'barrier_exit', label: 'OPEN WALL' },
  ],

  enemies: [
    // Drain 1: guards Source A and the left approach; y = 384-24 = 360
    { type: 'drain',  x: 110, y: 360, patrolLeft: 50,  patrolRight: 200, speed: 76 },
    // Patrol 2: guards Source B on row-6 center-left; y = 6*32-26 = 166
    { type: 'patrol', x: 260, y: 166, patrolLeft: 224, patrolRight: 336, speed: 68 },
    // Drain 3: right ground — guards SW and the approach to Source C
    { type: 'drain',  x: 580, y: 360, patrolLeft: 540, patrolRight: 650, speed: 74 },
    // Patrol 4: right ground — covers Source C and the final approach to exit
    { type: 'patrol', x: 665, y: 358, patrolLeft: 652, patrolRight: 712, speed: 84 },
  ],
};

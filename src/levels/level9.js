// Level 9 — "FAULT LINE"
// Central pit splits the floor into left and right ground blocks.
// Row-6 platform bridges the pit — reach it via stepping stones, fight through
// a patrol enemy guarding Source B, then descend to the right side.
// Switch on the right opens the barrier to the exit.
// Math: A(3) + B(2) = 5.  SW costs 1.  Exit needs 4.  5 - 1 = 4.
//
// Left ground: cols 0-5.  Right ground: cols 19-24.  Pit: cols 6-18.
// Row-9 stones: left (cols 5-7), center (cols 9-12, optional), right (cols 15-18).
// Row-6 bridge: cols 7-13.

const _ = 0, S = 1, P = 2;

export const LEVEL9 = {
  name:   'FAULT LINE',
  number: 9,

  // prettier-ignore
  tiles: [
    ...Array(6 * 25).fill(0),       // rows 0–5
    ...[_,_,_,_,_,_,_,P,P,P,P,P,P,P,_,_,_,_,_,_,_,_,_,_,_], // row 6  — bridge platform (cols 7-13)
    ...Array(2 * 25).fill(0),       // rows 7–8
    ...[_,_,_,_,_,P,P,P,_,P,P,P,P,_,_,P,P,P,P,_,_,_,_,_,_], // row 9  — cols 5-7, 9-12, 15-18
    ...Array(2 * 25).fill(0),       // rows 10–11
    ...[S,S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S,S], // row 12 — left+right ground
    ...[S,S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S,S], // row 13
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    // Left ground — start area
    { id: 'src_a', x: 64,  y: 356, charge: 3, label: 'SOURCE A' },
    // Col 11 on the row-6 bridge: x=11*32=352, y=6*32-28=164
    { id: 'src_b', x: 352, y: 164, charge: 2, label: 'SOURCE B' },
  ],

  gates: [
    { id: 'barrier_r', x: 666, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'gate_exit', x: 730, y: 0, w: 12, h: 384, required: 4, isExit: true },
  ],

  switches: [
    { id: 'sw_r', x: 628, y: 362, required: 1, linkedId: 'barrier_r', label: 'OPEN WALL' },
  ],

  enemies: [
    // Drain guards Source A on the left
    { type: 'drain',  x: 140, y: 360, patrolLeft: 80,  patrolRight: 240, speed: 70 },
    // Patrol covers the row-6 bridge, guarding Source B; y = 6*32-26 = 166
    { type: 'patrol', x: 320, y: 166, patrolLeft: 224, patrolRight: 432, speed: 65 },
    // Drain guards the switch and right ground approach
    { type: 'drain',  x: 636, y: 360, patrolLeft: 580, patrolRight: 712, speed: 76 },
  ],
};

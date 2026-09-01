// Level 2 — "Split Decision"
// Puzzle: Source A gives 2 charge. Exit needs 3. You can't reach exit directly.
//   Wrong path: try to dump 2 into exit → not enough, stuck.
//   Correct path: spend 1 on the switch → barrier drops → absorb Source B (2) → 3 total → exit.
// Teaches: sacrifice charge to unlock more charge. Order of operations matters.

const _ = 0;
const S = 1;
const P = 2;

export const LEVEL2 = {
  name:   'SPLIT DECISION',
  number: 2,

  // Full solid ground — barrier is entirely the PowerGate (no tilemap gaps)
  // prettier-ignore
  tiles: [
    ...Array(25).fill(0), // row 0
    ...Array(25).fill(0), // row 1
    ...Array(25).fill(0), // row 2
    ...Array(25).fill(0), // row 3
    ...Array(25).fill(0), // row 4
    ...Array(25).fill(0), // row 5
    ...Array(25).fill(0), // row 6
    // row 7 — platform right-side (shortcut to Source B area)
    ...[_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,P,P,P,_,_,_,_,_],
    ...Array(25).fill(0), // row 8
    // row 9 — platform left-side (over switch area)
    ...[_,_,_,_,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    ...Array(25).fill(0), // row 10
    ...Array(25).fill(0), // row 11
    ...Array(25).fill(1), // row 12 — ground (solid all the way)
    ...Array(25).fill(1), // row 13
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    { id: 'src_a', x: 144, y: 356, charge: 2, label: 'SOURCE A' },
    { id: 'src_b', x: 548, y: 356, charge: 2, label: 'SOURCE B' },
  ],

  gates: [
    // Full-height barrier — can ONLY be opened by the switch, not discharged into directly
    {
      id: 'barrier_mid', x: 396, y: 0, w: 10, h: 384,
      required: 1, isExit: false, blockOnly: true
    },
    // Exit gate
    {
      id: 'gate_exit', x: 730, y: 0, w: 12, h: 384,
      required: 3, isExit: true
    },
  ],

  switches: [
    {
      id: 'sw_barrier', x: 290, y: 362,
      required: 1, linkedId: 'barrier_mid', label: 'OPEN WALL'
    },
  ],

  enemies: [],
};

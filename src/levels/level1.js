// Level 1 — "First Spark"
// Teach: find a source → absorb → walk to gate → discharge → exit
// No enemies, no splits. One source, one exit.
import { COLS } from '../constants.js';

const _ = 0;  // empty
const S = 1;  // solid
const P = 2;  // one-way platform

// 25 columns × 14 rows = 350 tiles
// Row index: 0 = top, 13 = bottom
const row = (...v) => v;

export const LEVEL1 = {
  name:   'FIRST SPARK',
  number: 1,

  // prettier-ignore
  tiles: [
    // Row  0
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  1
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  2
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  3
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  4
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  5
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  6
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  7
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row  8  (upper platforms — optional route)
    ...row(_,_,_,_,_,_,_,P,P,P,_,_,_,_,_,P,P,P,_,_,_,_,_,_,_),
    // Row  9
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row 10  (lower platforms)
    ...row(_,_,_,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_,_,P,P,P,_,_,_),
    // Row 11
    ...row(_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_),
    // Row 12  — ground
    ...row(S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S),
    // Row 13  — ground fill
    ...row(S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S),
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    // Fuse box near start — 3 charge
    { id: 'src_fusebox', x: 144, y: 356, charge: 3, label: 'FUSE BOX' },
  ],

  gates: [
    // Exit gate — requires all 3 charge, right side of level
    {
      id: 'gate_exit', x: 730, y: 0, w: 12, h: 384,
      required: 3, isExit: true, label: 'EXIT'
    },
  ],

  switches: [],
  enemies:  [],
};

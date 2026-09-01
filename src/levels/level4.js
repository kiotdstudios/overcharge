// Level 4 — "CARRY CURRENT"
// A pit splits the floor. Player must climb and traverse platforms to carry
// charge from the high left source to the exit gate on the right.
// Two enemies patrol the mid crossing platforms.
// Teaches: charge management under pressure, platform traversal.
//
// Jump physics: JUMP_FORCE=-430, GRAVITY=900 → max height ≈ 102px ≈ 3.2 tiles
// All vertical platform steps are 3 rows = 96px — just within reach.
// Horizontal gaps between same-row platforms are 5 tiles = 160px — needs a run-jump.
//
// Layout (rows 0-13, 25 cols):
//
//   Row 3:  [P,P,P,P] . . . . . . . . . . . . . . . . [P,P,P,P]
//   Row 6:  . [P,P,P] . . . . [P,P,P] . . . [P,P,P] . . . . . .
//   Row 9:  . [P,P,P] . . . . [P,P,P] . . . [P,P,P] . . . . . .
//   Row 12: [S,S,S,S,S] . . pit . . . . . . . [S,S,S,S,S]
//
// Paths:
//   To source:  ground-left → row9 cols1-3 (up3) → row6 cols1-3 (up3) → row3 cols0-3 (up3)
//   To exit:    row6 cols1-3 → row6 cols7-9 (hop right) → row6 cols13-15 (hop right)
//               → row3 cols21-24 (up3 + hop right) → walk to exit gate

const _ = 0;
const S = 1;
const P = 2;

export const LEVEL4 = {
  name:   'CARRY CURRENT',
  number: 4,

  // prettier-ignore
  tiles: [
    // Row 0
    ...Array(25).fill(_),
    // Row 1
    ...Array(25).fill(_),
    // Row 2
    ...Array(25).fill(_),
    // Row 3 — high ledge: source on left (cols 0-3), exit approach on right (cols 21-24)
    ...[P,P,P,P,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,P,P,P,P],
    // Row 4
    ...Array(25).fill(_),
    // Row 5
    ...Array(25).fill(_),
    // Row 6 — mid crossing platforms (enemies patrol here)
    ...[_,P,P,P,_,_,_,P,P,P,_,_,_,P,P,P,_,_,_,_,_,_,_,_,_],
    // Row 7
    ...Array(25).fill(_),
    // Row 8
    ...Array(25).fill(_),
    // Row 9 — lower stepping stones (direct above pit edges)
    ...[_,P,P,P,_,_,_,P,P,P,_,_,_,P,P,P,_,_,_,_,_,_,_,_,_],
    // Row 10
    ...Array(25).fill(_),
    // Row 11
    ...Array(25).fill(_),
    // Row 12 — ground: left block (cols 0-4) + right block (cols 20-24); pit in center
    ...[S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S],
    // Row 13
    ...[S,S,S,S,S,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,S,S,S,S,S],
  ],

  playerStart: { x: 32, y: 354 },

  sources: [
    // High left ledge (row 3 platform, surface y=96) — must climb to reach
    // Source y=52 → bottom at y=96 = sits flush on the platform surface
    { id: 'src_main', x: 48, y: 52, charge: 4, label: 'SOURCE' },
  ],

  gates: [
    // Exit gate on the right wall — player reaches via row 3 right ledge
    {
      id:       'gate_exit',
      x:        714, y: 0, w: 12, h: 384,
      required: 4, isExit: true
    },
  ],

  switches: [],

  enemies: [
    // DrainEnemy on row 6 left-center platform (cols 7-9, surface y=192)
    // enemy.y = 192 - 24 = 168, patrol within platform bounds
    {
      type:        'drain',
      x:           224,
      y:           168,
      patrolLeft:  224,
      patrolRight: 310,
      speed:       55,
    },
    // PatrolEnemy on row 6 right-center platform (cols 13-15, surface y=192)
    // enemy.y = 192 - 26 = 166
    {
      type:        'patrol',
      x:           416,
      y:           166,
      patrolLeft:  416,
      patrolRight: 500,
      speed:       45,
    },
  ],
};

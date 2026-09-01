// Level 3 — "Don't Get Hit"
// Introduces the DrainEnemy. Contact steals 1 charge and scatters it as a pickup.
// Puzzle: Two sources guarded by a patrolling drain enemy.
//   Player must time their approach, absorb during the enemy's patrol window,
//   and recover any scattered pickups if hit.
//   Exit needs 3 charge, sources provide 2+2=4 — buffer exists but can't waste it all.

const _ = 0;
const S = 1;
const P = 2;

// Ground Y: row 12 = y=384. Enemy ground level: y = 384 - 24 = 360.
const GROUND_ENEMY_Y = 360;

export const LEVEL3 = {
  name:   "DON'T GET HIT",
  number: 3,

  // prettier-ignore
  tiles: [
    ...Array(25).fill(0), // row 0
    ...Array(25).fill(0), // row 1
    ...Array(25).fill(0), // row 2
    ...Array(25).fill(0), // row 3
    ...Array(25).fill(0), // row 4
    ...Array(25).fill(0), // row 5
    ...Array(25).fill(0), // row 6
    // row 7 — upper safe platforms (alternate route over enemy patrol)
    ...[_,_,_,_,_,P,P,P,_,_,_,_,P,P,P,_,_,_,_,P,P,P,_,_,_],
    ...Array(25).fill(0), // row 8
    // row 9 — lower step platforms
    ...[_,_,P,P,P,_,_,_,_,P,P,P,_,_,_,_,P,P,P,_,_,_,_,_,_],
    ...Array(25).fill(0), // row 10
    ...Array(25).fill(0), // row 11
    ...Array(25).fill(1), // row 12
    ...Array(25).fill(1), // row 13
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    // Source A — left, relatively safe (enemy starts away from it)
    { id: 'src_a', x: 96,  y: 356, charge: 2, label: 'SOURCE A' },
    // Source B — right, inside patrol zone — riskier
    { id: 'src_b', x: 616, y: 356, charge: 2, label: 'SOURCE B' },
  ],

  gates: [
    {
      id: 'gate_exit', x: 730, y: 0, w: 12, h: 384,
      required: 3, isExit: true
    },
  ],

  switches: [],

  enemies: [
    // Drain enemy patrols center — creates timing windows around both sources
    {
      type:         'drain',
      x:            300,
      y:            GROUND_ENEMY_Y,
      patrolLeft:   170,
      patrolRight:  680,
      speed:        70,
    },
  ],
};

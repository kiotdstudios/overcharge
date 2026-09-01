// Level 5 — "RELAY"
// Combines switch sacrifice with a drain enemy for the first time.
// Source A (2) left. Drain enemy patrols the path to Switch (1) → barrier drops.
// Source B (2) past barrier. Exit needs 3. Math: 4 - 1(sw) = 3. Zero waste.

const _ = 0, S = 1, P = 2;

export const LEVEL5 = {
  name:   'RELAY',
  number: 5,

  // prettier-ignore
  tiles: [
    ...Array(8 * 25).fill(0),       // rows 0–7
    ...[_,_,_,_,P,P,P,_,_,_,_,_,_,_,_,_,P,P,P,_,_,_,_,_,_], // row 8 — two small platforms
    ...Array(3 * 25).fill(0),       // rows 9–11
    ...Array(2 * 25).fill(1),       // rows 12–13 solid ground
  ],

  playerStart: { x: 48, y: 354 },

  sources: [
    { id: 'src_a', x: 96,  y: 356, charge: 2, label: 'SOURCE A' },
    { id: 'src_b', x: 560, y: 356, charge: 2, label: 'SOURCE B' },
  ],

  gates: [
    { id: 'wall_a',    x: 390, y: 0, w: 10, h: 384, required: 1, blockOnly: true },
    { id: 'gate_exit', x: 730, y: 0, w: 12, h: 384, required: 3, isExit: true },
  ],

  switches: [
    { id: 'sw_a', x: 290, y: 362, required: 1, linkedId: 'wall_a', label: 'OPEN WALL' },
  ],

  enemies: [
    // Drain enemy patrols the path between Source A and the switch
    { type: 'drain', x: 200, y: 360, patrolLeft: 140, patrolRight: 360, speed: 65 },
  ],
};

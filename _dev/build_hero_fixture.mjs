import { writeFileSync } from 'node:fs';
const cols = 40, rows = 18;
const tiles = Array(cols * rows).fill(0);
for (let row = 14; row < rows; row++) for (let col = 0; col < cols; col++) tiles[row * cols + col] = 16;
for (let col = 6; col <= 12; col++) tiles[8 * cols + col] = 2;
// A solid ceiling beside the usable ladder demonstrates blocked head clearance.
for (let col = 17; col <= 20; col++) tiles[10 * cols + col] = 16;
tiles[13 * cols + 24] = 16;
const def = {
  name: 'HERO MECHANICS QA', number: 0, cols, rows, tiles,
  playerStart: { x: 64, y: 418 },
  decorations: [
    { src: 'assets/objects/night-city-props/ladder/ladder.png', x: 256, y: 256, w: 32, h: 192 },
    { src: 'assets/objects/night-city-props/ladder/ladder.png', x: 576, y: 320, w: 32, h: 128 },
    { src: 'assets/objects/night-city-props/grapple-anchor/anchor.png', x: 736, y: 224, w: 48, h: 48 },
  ],
  sources: [{ id: 'qa-source', x: 128, y: 420, charge: 30, label: 'POWER' }],
  gates: [{ id: 'qa-exit', x: 1120, y: 384, w: 32, h: 64, label: 'QA EXIT', required: 2, isExit: true }],
  enemies: [{ type: 'drain', x: 864, y: 424 }],
  checkpoints: [{ x: 704, y: 426 }], switches: [], crates: [], platforms: [], chests: [],
};
writeFileSync(new URL('./fixtures/hero-mechanics.json', import.meta.url), JSON.stringify(def, null, 2) + '\n');
console.log('Wrote isolated hero mechanics fixture; campaign levels unchanged.');

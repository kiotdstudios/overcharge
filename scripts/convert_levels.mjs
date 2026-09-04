// convert_levels.mjs — mechanically converts .js level modules into .json siblings.
// Does NOT modify or delete the .js originals. Run: node scripts/convert_levels.mjs
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');

async function convert(srcRel, dstRel) {
  const srcAbs = join(ROOT, srcRel);
  const mod = await import(pathToFileURL(srcAbs).href);
  const key = Object.keys(mod).find(k => k.startsWith('LEVEL'));
  if (!key) { console.error('No LEVEL* export in ' + srcRel); return; }
  const data = mod[key];
  const dstAbs = join(ROOT, dstRel);
  writeFileSync(dstAbs, JSON.stringify(data, null, 2));
  const size = JSON.stringify(data).length;
  console.log(srcRel + ' -> ' + dstRel + '  (' + size + ' bytes, export: ' + key + ')');
}

await convert('src_scroll/levels/level1.js', 'src_scroll/levels/level1.json');
await convert('src_scroll/levels/level2.js', 'src_scroll/levels/level2.json');
console.log('Done. Originals untouched.');

// node tenant_fetch.mjs <jobId> <name> <lastIndex>   -> tenant/<name>/fNN.png (index 0 is the input frame)
import { mkdir, writeFile } from 'node:fs/promises';
const [job, name, last] = process.argv.slice(2);
const dir = `C:/Users/diepowel/Documents/_kiro_tools/tenant/${name}`;
await mkdir(dir, { recursive: true });
let ok = 0;
for (let i = 0; i <= Number(last); i++) {
  for (let t = 0; t < 4; t++) {
    const r = await fetch(`https://api.pixellab.ai/mcp/images/${job}/download?index=${i}`);
    if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 300) { await writeFile(`${dir}/f${String(i).padStart(2, '0')}.png`, b); ok++; break; } }
    await new Promise(s => setTimeout(s, 500));
  }
}
console.log(name, 'downloaded', ok, 'of', Number(last) + 1);

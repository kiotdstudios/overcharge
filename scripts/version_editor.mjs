// Run before committing Builder changes; also called by build_info.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [];
function collect(dir) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) collect(path);
    else if (/\.(js|css)$/.test(entry.name)) files.push(path);
  }
}
collect('editor');
collect('src_scroll');
files.sort();
const hash = createHash('sha256');
for (const path of files) hash.update(path).update('\0').update(readFileSync(join(root, path)));
const version = hash.digest('hex').slice(0, 16);
const imports = Object.fromEntries(files.filter(path => path.endsWith('.js')).map(path => [`./${path}`, `./${path}?v=${version}`]));
const block = `<!-- BEGIN GENERATED EDITOR MODULE VERSIONS -->\n<script type="importmap">\n${JSON.stringify({ imports }, null, 2)}\n</script>\n<!-- END GENERATED EDITOR MODULE VERSIONS -->\n<script type="module" src="editor/main.js?v=${version}"></script>`;
const path = join(root, 'editor.html');
let html = readFileSync(path, 'utf8');
const existing = /<!-- BEGIN GENERATED EDITOR MODULE VERSIONS -->[\s\S]*?<!-- END GENERATED EDITOR MODULE VERSIONS -->\s*<script type="module" src="editor\/main\.js[^"\n]*"><\/script>/;
const original = /<script type="module" src="editor\/main\.js[^"\n]*"><\/script>/;
if (!existing.test(html) && !original.test(html)) throw new Error('Builder entry script not found');
html = html.replace(existing.test(html) ? existing : original, block);
html = html.replace(/href="editor\/workspace\.css[^"\n]*"/, `href="editor/workspace.css?v=${version}"`);
writeFileSync(path, html);
console.log(`Builder module version: ${version} (${files.length} modules)`);
// The game also imports the shared collision modules; refresh both graphs.
const gamePath = join(root, 'index.html');
const gameBlock = block.replaceAll('EDITOR MODULE', 'GAME MODULE').replace('<script type="module" src="editor/main.js?v=', '<script type="module" src="src_scroll/main.js?v=');
const gameExisting = /<!-- BEGIN GENERATED GAME MODULE VERSIONS -->[\s\S]*?<!-- END GENERATED GAME MODULE VERSIONS -->\s*<script type="module" src="(?:src_scroll|editor)\/main\.js[^"\n]*"><\/script>/;
const gameOriginal = /<script type="module" src="src_scroll\/main\.js[^"\n]*"><\/script>/;
let gameHtml = readFileSync(gamePath, 'utf8');
if (!gameExisting.test(gameHtml) && !gameOriginal.test(gameHtml)) throw new Error('Game entry script not found');
gameHtml = gameHtml.replace(gameExisting.test(gameHtml) ? gameExisting : gameOriginal, gameBlock);
writeFileSync(gamePath, gameHtml);

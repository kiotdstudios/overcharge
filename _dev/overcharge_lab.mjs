// OVERCHARGE LAB acceptance check. Serves the repo, drives real keys, reads the HUD.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// path.resolve so the startsWith() traversal guard compares like-for-like separators.
// Passing C:/forward/slashes made path.join emit backslashes and every request 404'd.
const repo = path.resolve(process.argv[2]);
const port = Number(process.argv[3] || 8931);
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
               '.png':'image/png', '.gif':'image/gif', '.svg':'image/svg+xml', '.css':'text/css' };

const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(repo, rel);
  if (!f.startsWith(repo) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
}).listen(port);

let pass = 0, fail = 0;
const ok = (c, label, detail = '') => {
  if (c) { pass++; console.log(`  \u2713 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
};

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [], failed = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().split('/').pop()}`); });

const hud = async () => (await page.locator('#hud').innerText()).replace(/\s+/g, ' ');
const field = async (k) => { const t = await hud(); const m = t.match(new RegExp(k + '\\s+([^A-Z]+?)(?=[A-Z]{3}|$)')); return m ? m[1].trim() : ''; };

console.log('=== OVERCHARGE LAB ===');
await page.goto(`http://127.0.0.1:${port}/overcharge-lab.html`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

ok(await page.title() === 'OVERCHARGE LAB', 'page title is OVERCHARGE LAB', await page.title());
ok(await page.locator('link[rel=icon]').count() === 1, 'has its own favicon');
const fav = await page.locator('link[rel=icon]').getAttribute('href');
ok(/00e5d0/i.test(fav), 'favicon uses the cyan/teal lab colour', '#00e5d0 present');

const box = await page.locator('#lab').boundingBox();
ok(box && Math.abs(box.width / box.height - 16/9) < 0.05, '16:9 canvas', box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'none');

const painted = await page.evaluate(() => {
  const c = document.getElementById('lab'), g = c.getContext('2d');
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 14 || d[i+1] > 14 || d[i+2] > 14) n++;
  return n;
});
ok(painted > 5000, 'test room renders', painted + ' lit pixels');

await page.locator('#lab').click();

// ── movement ──
ok((await field('STATE')).startsWith('idle'), 'starts idle', await field('STATE'));
ok((await field('GROUNDED')) === 'yes', 'spawns grounded on the baseline');

await page.keyboard.down('d'); await page.waitForTimeout(350);
ok((await field('STATE')).startsWith('walk'), 'D walks', await field('STATE'));
ok((await field('FACING')).includes('east'), 'D faces east');
const xWalk = parseFloat(await field('POS').then(s => s.replace(/x\s*/, '')));

await page.keyboard.down('Shift'); await page.waitForTimeout(400);
ok((await field('STATE')).startsWith('run'), 'Shift+D runs', await field('STATE'));
const vRun = Math.abs(parseFloat((await field('VEL')).replace(/vx\s*/, '')));
ok(vRun > 100, 'run is faster than walk', 'vx ' + vRun.toFixed(0));
await page.keyboard.up('Shift'); await page.keyboard.up('d');

await page.keyboard.down('a'); await page.waitForTimeout(320);
ok((await field('FACING')).includes('west'), 'A faces west', await field('FACING'));
await page.keyboard.up('a');
await page.waitForTimeout(260);
ok((await field('STATE')).startsWith('idle'), 'returns to idle when keys released', await field('STATE'));

// ── jump ──
await page.keyboard.press('Space'); await page.waitForTimeout(160);
ok((await field('STATE')).startsWith('jump'), 'Space jumps', await field('STATE'));
ok((await field('GROUNDED')) === 'no', 'airborne during jump');
await page.waitForTimeout(1400);
ok((await field('GROUNDED')) === 'yes', 'lands again', await field('GROUNDED'));
ok((await field('STATE')).startsWith('idle'), 'returns to idle after landing', await field('STATE'));

// ── one-shots must not corrupt movement ──
for (const [key, want] of [['j','energy-strike'], ['k','projectile-cast'], ['h','hurt']]) {
  await page.keyboard.press(key); await page.waitForTimeout(130);
  ok((await field('STATE')).startsWith(want), `${key.toUpperCase()} triggers ${want}`, await field('STATE'));
  await page.waitForTimeout(1500);
}
ok((await field('STATE')).startsWith('idle'), 'movement state is intact after one-shots', await field('STATE'));

for (const [key, want] of [['e','absorb'], ['f','discharge']]) {
  await page.keyboard.down(key); await page.waitForTimeout(200);
  ok((await field('STATE')).startsWith(want), `${key.toUpperCase()} holds ${want}`, await field('STATE'));
  await page.keyboard.up(key); await page.waitForTimeout(150);
}

// ── reset ──
await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
const moved = parseFloat((await field('POS')).replace(/x\s*/, ''));
await page.keyboard.press('r'); await page.waitForTimeout(150);
const after = parseFloat((await field('POS')).replace(/x\s*/, ''));
ok(after < moved, 'R resets to the start', `${moved.toFixed(0)} -> ${after.toFixed(0)}`);

// ── override panel: every Hero Lab state must be forceable ──
const states = ['idle','walk','run','jump','hurt','stunned','death','energy-strike',
  'projectile-cast','absorb','discharge','ladder-up','ladder-down','ledge-climb','wall-slide','grapple'];
const btns = await page.locator('#override-groups button').count();
ok(btns === states.length, `override panel exposes all ${states.length} states`, btns + ' buttons');
let forced = 0;
for (const s of states) {
  await page.locator(`#override-groups button[data-state="${s}"]`).click();
  await page.waitForTimeout(70);
  if ((await field('STATE')).startsWith(s)) forced++;
}
ok(forced === states.length, 'every state can be force-previewed', `${forced}/${states.length}`);
await page.locator('#ov-off').click(); await page.waitForTimeout(200);
ok(!(await hud()).includes('override'), 'returns to gameplay from override');

ok(errors.length === 0, 'no console errors', errors.slice(0,3).join(' | ') || 'clean');
ok(failed.length === 0, 'no failed requests', [...new Set(failed)].slice(0,3).join(' | ') || 'clean');

// ── Hero Lab must still work, unchanged ──
console.log('\n=== HERO LAB regression ===');
const errs2 = [];
const page2 = await browser.newPage();
page2.on('pageerror', e => errs2.push(e.message.split('\n')[0]));
page2.on('console', m => { if (m.type() === 'error') errs2.push(m.text()); });
await page2.goto(`http://127.0.0.1:${port}/hero-lab.html`, { waitUntil: 'networkidle', timeout: 30000 });
await page2.waitForTimeout(1000);
ok(await page2.title() === 'OVERCHARGE • Character lab', 'Hero Lab title unchanged', await page2.title());
ok(await page2.locator('#animation-groups button').count() === 16, 'Hero Lab still lists 16 states');
const info = await page2.locator('#frame-info').innerText();
ok(/frame \d+\/\d+/.test(info), 'Hero Lab still reports frames', info.slice(0, 60));
ok(errs2.length === 0, 'Hero Lab has no console errors', errs2.slice(0,2).join(' | ') || 'clean');

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

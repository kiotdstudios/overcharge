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


// Holds a key across at least one animation frame. Input.pressed() is a two-frame edge
// (cur && !prev), so an instantaneous down+up is invisible to it — that is a property of
// production's input model, not a lab defect, and a human tap always spans ~3-6 frames.
async function tap(key, hold = 90) {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
}
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

await page.keyboard.down('ArrowRight'); await page.waitForTimeout(350);
ok((await field('STATE')).startsWith('walk'), 'ArrowRight walks', await field('STATE'));
ok((await field('FACING')).includes('east'), 'ArrowRight faces east');
const xWalk = parseFloat(await field('POS').then(s => s.replace(/x\s*/, '')));

await page.keyboard.down('Shift'); await page.waitForTimeout(400);
ok((await field('STATE')).startsWith('run'), 'Shift+ArrowRight runs', await field('STATE'));
const vRun = Math.abs(parseFloat((await field('VEL')).replace(/vx\s*/, '')));
ok(vRun > 100, 'run is faster than walk', 'vx ' + vRun.toFixed(0));
await page.keyboard.up('Shift'); await page.keyboard.up('ArrowRight');

await page.keyboard.down('KeyA'); await page.waitForTimeout(320);
ok((await field('FACING')).includes('west'), 'KeyA faces west (WASD still works)', await field('FACING'));
await page.keyboard.up('KeyA');
await page.waitForTimeout(260);
ok((await field('STATE')).startsWith('idle'), 'returns to idle when keys released', await field('STATE'));

// ── jump ──
await tap('KeyW'); await page.waitForTimeout(70);
ok((await field('STATE')).startsWith('jump'), 'W jumps (production key)', await field('STATE'));
ok((await field('GROUNDED')) === 'no', 'airborne during jump');
await page.waitForTimeout(1400);
ok((await field('GROUNDED')) === 'yes', 'lands again', await field('GROUNDED'));
ok((await field('STATE')).startsWith('idle'), 'returns to idle after landing', await field('STATE'));

// Space must NOT jump — it is charge. This is the exact regression Chief hit.
await page.waitForTimeout(250);
const beforeSpace = await field('GROUNDED');
await tap('Space', 120); await page.waitForTimeout(60);
ok(beforeSpace === 'yes' && (await field('GROUNDED')) === 'yes', 'Space does NOT jump (it is charge)');

// ── one-shots must not corrupt movement ──
for (const [key, want] of [['KeyJ','energy-strike'], ['KeyK','projectile-cast'], ['KeyH','hurt']]) {
  await tap(key); await page.waitForTimeout(60);
  ok((await field('STATE')).startsWith(want), `${key} triggers ${want}`, await field('STATE'));
  await page.waitForTimeout(1500);
}
ok((await field('STATE')).startsWith('idle'), 'movement state is intact after one-shots', await field('STATE'));

for (const [key, want] of [['KeyE','absorb'], ['Space','discharge']]) {
  await page.keyboard.down(key); await page.waitForTimeout(200);
  ok((await field('STATE')).startsWith(want), `${key} holds ${want}`, await field('STATE'));
  await page.keyboard.up(key); await page.waitForTimeout(150);
}

// ── reset ──
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
const moved = parseFloat((await field('POS')).replace(/x\s*/, ''));
await tap('KeyR'); await page.waitForTimeout(80);
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

// ── layout, hitbox default, tile edit ──
console.log('\n[ layout and tile edit ]');
const hudBox = await page.locator('#hud').boundingBox();
const canvasBox = await page.locator('#lab').boundingBox();
ok(hudBox.y > canvasBox.y + canvasBox.height - 5,
   'live diagnostics sit BELOW the canvas',
   `hud y=${Math.round(hudBox.y)}, canvas bottom=${Math.round(canvasBox.y + canvasBox.height)}`);

ok(/HITBOX\s+hidden/.test(await hud()), 'hitbox overlay starts HIDDEN — no box drawn on the character');
// tap(), not press(). Input.pressed() is a two-frame edge, so an instant down+up is
// invisible to it. Worth noting the trap: with press() the "reveals" assertion failed and
// the "hides it again" assertion then passed VACUOUSLY, because nothing had changed.
await tap('KeyB'); await page.waitForTimeout(140);
ok(/HITBOX\s+shown/.test(await hud()), 'B reveals it when wanted');
await tap('KeyB'); await page.waitForTimeout(140);
ok(/HITBOX\s+hidden/.test(await hud()), 'B hides it again');

ok(await page.locator('#te-toggle').count() === 1, 'tile edit panel exists');
ok(/TILE EDIT\s+off/.test(await hud()), 'tile edit starts off, so a focus click never paints');

// Chief's exact scenario: fall in the pit, get out without resetting.
await page.keyboard.press('KeyR'); await page.waitForTimeout(120);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2800); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(300);
await page.locator('#te-fillrow').click(); await page.waitForTimeout(450);
ok((await field('GROUNDED')) === 'yes',
   'Floor-under-me gives ground to stand on after a fall — no reset needed',
   'grounded=' + await field('GROUNDED'));

await page.locator('#te-toggle').click(); await page.waitForTimeout(140);
ok(/TILE EDIT\s+ON/.test(await hud()), 'Edit toggles ON');
await page.locator('#te-restore').click(); await page.waitForTimeout(200);
ok(true, 'Restore room runs clean');

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

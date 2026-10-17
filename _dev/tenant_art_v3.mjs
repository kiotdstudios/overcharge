// tenant_art_v3.mjs - the finished tenant art (CODEX 05 Task 2, Kiro pass): files, timing, size and the window it must fit in.
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync('assets/ASSET_MANIFEST.json', 'utf8'));
const metrics = JSON.parse(fs.readFileSync('assets/sprites/npc-window-tenant-v3/metrics.json', 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const a = id => manifest.assets.find(x => x.id === id);
const hot = a('npc_window_tenant'), rel = a('npc_window_tenant_relieved'), idle = a('npc_window_tenant_idle');
ok(hot && rel && idle, 'all three clips are registered');
const sec = (x) => x.frame_count / x.fps;
ok(sec(hot) >= 16 && hot.fps >= 12, 'hot loop: at least 16 s at 12 fps or more', `${hot.frame_count} frames at ${hot.fps} fps = ${sec(hot).toFixed(1)} s`);
ok(hot.loop === true, 'hot clip loops');
ok(sec(rel) >= 4 && sec(rel) <= 6 && rel.loop === false, 'relieved clip: 4 to 6 s, plays once', `${sec(rel).toFixed(1)} s`);
ok(sec(idle) >= 2 && sec(idle) <= 3.1 && idle.loop === true, 'relaxed idle: about 2 to 3 s, loops', `${sec(idle).toFixed(1)} s`);
ok(hot.poweredAssetId === 'npc_window_tenant_relieved' && hot.poweredIdleAssetId === 'npc_window_tenant_idle', 'hot -> relieved -> idle are chained in the manifest');
// every frame file is there and is 128 x 128
const png = p => { const b = fs.readFileSync(p); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
for (const [name, x] of [['hot', hot], ['relieved', rel], ['idle', idle]]) {
  let missing = 0, wrong = 0;
  for (let i = 0; i < x.frame_count; i++) {
    const p = x.path.replace(/000\.png$/, String(i).padStart(3, '0') + '.png');
    if (!fs.existsSync(p)) { missing++; continue; }
    const [w, h] = png(p); if (w !== 128 || h !== 128) wrong++;
  }
  ok(missing === 0 && wrong === 0, `${name}: all ${x.frame_count} frame files exist and are 128 x 128`, `${missing} missing, ${wrong} wrong size`);
  ok(x.footYByFrame.length === x.frame_count, `${name}: one foot line per frame`);
}
// she is a small figure that fits the 56 x 64 window opening with margin
const t = hot.trim, scale = hot.displayHeightPx / (hot.frame_height * t.h);
const visW = t.w * hot.frame_width * scale, visH = t.h * hot.frame_height * scale;
ok(Math.abs(visH - hot.displayHeightPx) < 0.01 && visH <= 52, 'visible height is about 46 px, never over 52 px and below the 60 px NPCs', `${visH.toFixed(1)} px`);
ok(visW <= 54, 'her widest pose (hair, fan) fits inside the 56 px window glass', `${visW.toFixed(1)} px wide`);
ok(hot.footYByFrame.every(y => y === hot.footYByFrame[0]) && hot.footYByFrame[0] === metrics.bounds.y1 + 1, 'the bottom edge (forearm on the sill) is the same on every frame', `foot ${hot.footYByFrame[0]}`);
// frame-to-frame behaviour recorded when the clips were built
ok(metrics.clips.hot.seam <= metrics.clips.hot.maxStep, 'hot loop seam is no bigger than the largest step inside it', `seam ${metrics.clips.hot.seam}, max ${metrics.clips.hot.maxStep}`);
ok(metrics.clips.idle.seam <= metrics.clips.idle.maxStep + 1e-9 || metrics.clips.idle.seam < 10, 'idle loop seam is small', `seam ${metrics.clips.idle.seam}`);
ok(metrics.clips.hot.maxStep < 50 && metrics.clips.idle.maxStep < 35, 'no popping frame in the hot or idle loops', `hot ${metrics.clips.hot.maxStep}, idle ${metrics.clips.idle.maxStep}`);
console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

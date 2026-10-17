// Build the finished apartment_plain kit from Codex's review panels (CODEX 05 Task 1, Kiro pass).
// Fixes: course alignment across panels, panel-edge seams, colour to the street wall, and a real 56 x 64 tenant window.
import { open, ROOT } from './apt_lib.mjs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
const DEST = ROOT + '/assets/objects/night-city-buildings/apartment_plain/';
await rm(DEST, { recursive: true, force: true }); await mkdir(DEST + 'previews', { recursive: true });
const { page, close } = await open(3392);
const out = await page.evaluate(async () => {
  const SRC = '/assets/objects/night-city-buildings/apartment_plain_review/';
  const names = ['wall_01','wall_02','wall_03','wall_04','wall_05','wall_06','wall_07','wall_08','left_end','right_end'];
  const P = {}; for (const n of names) P[n] = await IMG.data(SRC + n + '.png');
  const lum = p => p[0]*.3 + p[1]*.5 + p[2]*.2;
  const clone = d => { const o = IMG.mk(d.width, d.height); o.data.set(d.data); return o; };
  const info = {};
  // ---- 1. course alignment: warp rows >= 104 of the off-phase panels onto the reference courses (panels 01, 03, 04)
  const REF = [111,119,128,136,144,153,161,169,177,185,194,201,210,218,226];
  const prof = d => { const a = []; for (let y = 0; y < d.height; y++) { let s = 0, c = 0; for (let x = 8; x < 150; x++) { const p = IMG.px(d, x, y); if (p[3] > 0) { s += lum(p); c++; } } a.push(c ? s / c : 0); } return a; };
  function warp(d, name) {
    const pr = prof(d); const anchors = [[104,104]];
    let last = 104;
    for (const r of REF) {
      let best = null; for (let s = r - 2; s <= r + 1; s++) { if (s <= last) continue; if (best === null || pr[s] < pr[best]) best = s; }
      // only trust a clear mortar (dark row); otherwise assume the previous offset
      const prev = anchors[anchors.length - 1]; const off = prev[0] - prev[1];
      const mean = pr.slice(r - 6, r + 6).reduce((a, b) => a + b) / 12;
      const s = (best !== null && pr[best] < mean * 0.82) ? best : r + off;
      anchors.push([s, r]); last = s;
    }
    const lastA = anchors[anchors.length - 1], o = clone(d); const offs = anchors.map(a => a[0] - a[1]);
    for (let y = 104; y < d.height; y++) {
      let s;
      if (y >= lastA[1]) s = y + (lastA[0] - lastA[1]);
      else { let i = 0; while (i < anchors.length - 2 && y >= anchors[i + 1][1]) i++; const [s0, d0] = anchors[i], [s1, d1] = anchors[i + 1]; s = s0 + (y - d0) * (s1 - s0) / (d1 - d0); }
      s = Math.max(0, Math.min(d.height - 1, Math.round(s)));
      for (let x = 0; x < d.width; x++) IMG.put(o, x, y, IMG.px(d, x, s));
    }
    info['warp_' + name] = offs.join(',');
    return o;
  }
  const W = {}; for (const n of names) W[n] = clone(P[n]);
  for (const n of ['wall_02','wall_05','wall_06','wall_07','wall_08']) W[n] = warp(P[n], n);
  // ---- 2. edge seams: the panel outline columns (purple / black) become a copy of the brick next to them
  const fixEdges = (d, left, right) => {
    for (let y = 0; y < d.height; y++) {
      if (left) { const a = IMG.px(d, 3, y), b = IMG.px(d, 4, y); IMG.put(d, 0, y, a); IMG.put(d, 1, y, b); IMG.put(d, 2, y, a); }
      if (right) { const w = d.width, a = IMG.px(d, w - 4, y), b = IMG.px(d, w - 5, y); IMG.put(d, w - 1, y, a); IMG.put(d, w - 2, y, b); IMG.put(d, w - 3, y, a); }
    }
  };
  for (const n of ['wall_01','wall_02','wall_03','wall_04','wall_05','wall_06','wall_07','wall_08']) fixEdges(W[n], true, true);
  fixEdges(W.left_end, false, true); fixEdges(W.right_end, true, false);
  // the first/last opaque rows of some panels are transparent: copy the next row so stacking has no hairline
  for (const n of names) { const d = W[n]; for (const y of [0, d.height - 1]) for (let x = 0; x < d.width; x++) if (IMG.px(d, x, y)[3] < 255) IMG.put(d, x, y, IMG.px(d, x, y === 0 ? 1 : d.height - 2)); }
  // ---- 3. tenant window panel, built from wall_04: erase its window, draw an exact 56 x 64 opening
  function makeTenant(srcPanel, GX) {
  const T = clone(srcPanel);
  for (let y = 33; y <= 101; y++) for (let x = GX - 10; x <= GX + 66; x++) IMG.put(T, x, y, IMG.px(srcPanel, x, y + 66));   // 66 = two 33-row course repeats
  const GY = 44, GW = 56, GH = 64;                      // glass opening: x 52..107, y 44..107
  const C = { out: [2,0,5], hi: [62,164,201], hi2: [55,123,168], mid: [36,55,120], mid2: [30,51,113], dk: [10,12,41], dk2: [7,5,25] };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) IMG.put(T, x, y, c); };
  // lintel y 36..43 (x 46..113)
  const X0 = GX - 6, X1 = GX + GW + 5;
  rect(X0, 36, X1, 36, C.out); rect(X0, 37, X1, 37, C.hi2); rect(X0, 38, X1, 38, C.hi2); rect(X0, 39, X1, 41, C.mid); rect(X0, 42, X1, 42, C.mid2); rect(X0, 43, X1, 43, C.dk);
  // jambs, 6 wide each side
  for (let y = GY; y < GY + GH; y++) {
    const L = [C.out, C.hi2, C.mid, C.mid, C.mid2, C.dk2], R = [C.dk2, C.mid2, C.mid, C.mid, C.hi2, C.out];
    for (let i = 0; i < 6; i++) { IMG.put(T, X0 + i, y, L[i]); IMG.put(T, GX + GW + i, y, R[i]); }
  }
  // sill: top line at y 108 (the line the tenant stands on), x 44..115
  rect(X0 - 2, 108, X1 + 2, 108, C.hi); rect(X0 - 2, 109, X1 + 2, 110, C.hi2); rect(X0 - 2, 111, X1 + 2, 112, C.mid2); rect(X0 - 2, 113, X1 + 2, 113, C.out); rect(X0, 114, X1, 114, C.dk);
  // glass: an empty room lit by a lamp. Warm only in the lower two thirds, a dusky ceiling above.
  const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]]; const bay = (x, y) => (BAYER[y & 3][x & 3] + .5) / 16;
  const RAMP = [[16,11,30],[36,20,32],[66,36,30],[104,58,34],[146,82,42]];
  let warm = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const gx = GX + x, gy = GY + y;
    let v = 0.04 + 0.60 * Math.pow(y / GH, 1.25);                        // dusky ceiling, brighter floor
    const dx = (x - 40) / 30, dy = (y - 22) / 26; v += 0.30 * Math.max(0, 1 - Math.hypot(dx, dy));   // a lamp glow upper right
    if (y > 54) v -= 0.18;                                                // floor line, darker
    if (y === 54 || y === 55) v += 0.16;                                  // skirting highlight
    v = Math.max(0, Math.min(0.999, v));
    const k = v * (RAMP.length - 1), i0 = Math.floor(k), f = k - i0;
    const c = (f > bay(x, y) ? RAMP[Math.min(RAMP.length - 1, i0 + 1)] : RAMP[i0]);
    IMG.put(T, gx, gy, c);
    if (c[0] > c[2] + 10) warm++;
  }
  // inner glass shadow from the frame (top and left), keeps the opening reading as recessed
  for (let x = 0; x < GW; x++) { IMG.put(T, GX + x, GY, [14,10,22]); IMG.put(T, GX + x, GY + 1, [22,14,28]); }
  for (let y = 0; y < GH; y++) IMG.put(T, GX, GY + y, [14,10,22]);
  return { T, box: { glass: { x: GX, y: GY, w: GW, h: GH }, sillTopLineY: 108, lintel: [X0, 36, X1, 43], sill: [X0 - 2, 108, X1 + 2, 114], frameOuter: [X0 - 2, 36, X1 + 2, 114] } };
  }
  const mt = makeTenant(W.wall_04, 52); W.wall_tenant = mt.T; info.tenantWindow_wall = mt.box;
  const lt = makeTenant(W.left_end, 74); W.left_end_tenant = lt.T; info.tenantWindow_left_end = lt.box;

  // ---- 4. colour: grade the brick toward the street wall (27,31,69), leave lit-window pixels alone
  const protectedPx = p => p[0] > 90 && p[0] > p[2];                       // warm glow / warm interior
  const wallMean = d => { let r = 0, g = 0, b = 0, n = 0; for (let y = 112; y < 226; y++) for (let x = 10; x < d.width - 10; x++) { const p = IMG.px(d, x, y); if (p[3] === 255) { r += p[0]; g += p[1]; b += p[2]; n++; } } return [r / n, g / n, b / n]; };
  const TARGET = [27, 31, 69];
  const grade = (d, name) => {
    const m = wallMean(d), gain = TARGET.map((t, i) => t / m[i]);
    for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) {
      const p = IMG.px(d, x, y); if (p[3] === 0 || protectedPx(p)) continue;
      IMG.put(d, x, y, [Math.min(255, Math.round(p[0] * gain[0])), Math.min(255, Math.round(p[1] * gain[1])), Math.min(255, Math.round(p[2] * gain[2])), p[3]]);
    }
    info['gain_' + name] = gain.map(v => +v.toFixed(3)).join(',');
  };
  const final = {};
  const order = ['wall_01','wall_02','wall_03','wall_04','wall_05','wall_06','wall_07','wall_08','wall_tenant','left_end','left_end_tenant','right_end'];
  for (const n of order) { final[n] = clone(W[n]); grade(final[n], n); }
  // ---- 5. audit
  const hueOf = (r, g, b) => { const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn; if (!d) return 0; let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; return (h * 60 + 360) % 360; };
  const audit = {};
  for (const n of order) {
    const d = final[n]; let r = 0, g = 0, b = 0, cnt = 0, blue = 0, hx = 0, hy = 0, warmN = 0, op = 0;
    for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) {
      const p = IMG.px(d, x, y); if (p[3] === 0) continue; op++; if (p[0] > p[2] + 10) warmN++;
      if (y >= 112 && y < 226 && x >= 10 && x < d.width - 10) { cnt++; r += p[0]; g += p[1]; b += p[2]; if (p[2] > p[0] && p[2] > p[1]) blue++; const h = hueOf(p[0], p[1], p[2]) * Math.PI / 180; hx += Math.cos(h); hy += Math.sin(h); }
    }
    audit[n] = { wall_mean_rgb: [r/cnt, g/cnt, b/cnt].map(v => +v.toFixed(1)), blue_dominant_pct: +(100 * blue / cnt).toFixed(1), mean_hue: +(((Math.atan2(hy, hx) * 180 / Math.PI) + 360) % 360).toFixed(0), warm_pct_of_opaque: +(100 * warmN / op).toFixed(2) };
  }
  // ---- 6. previews
  const blit = (dst, src, ox, oy) => { for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) { const p = IMG.px(src, x, y); if (p[3] > 0 && ox + x < dst.width && oy + y < dst.height) IMG.put(dst, ox + x, oy + y, p); } };
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const tile = (list, label) => { let w = 0; for (const n of list) w += final[n].width; const d = IMG.mk(w, 256); let x = 0; for (const n of list) { blit(d, final[n], x, 0); x += final[n].width; } return d; };
  const mids = ['wall_01','wall_02','wall_03','wall_04','wall_05','wall_06','wall_07','wall_08','wall_tenant'];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rows = [];
  for (let k = 0; k < 3; k++) rows.push(tile(['left_end', ...shuffle(mids).slice(0, 5), 'right_end']));
  const sheet = IMG.mk(rows[0].width, 256 * 3 + 8); for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 70; sheet.data[i+1] = 70; sheet.data[i+2] = 80; sheet.data[i+3] = 255; }
  rows.forEach((r, i) => blit(sheet, r, 0, i * 260));
  const contact = IMG.mk(5 * 160 + 4, 2 * 256 + 4); for (let i = 0; i < contact.data.length; i += 4) { contact.data[i] = 70; contact.data[i+1] = 70; contact.data[i+2] = 80; contact.data[i+3] = 255; }
  mids.forEach((n, i) => blit(contact, final[n], (i % 5) * 160, Math.floor(i / 5) * 258));
  const before = tile(['wall_01','wall_05','wall_06','wall_07','wall_08'].map(n => n));   // placeholder uses finals for layout; the 'before' strip is built below from the raw review panels
  const raw = IMG.mk(5 * 160, 256); ['wall_01','wall_05','wall_06','wall_07','wall_08'].forEach((n, i) => blit(raw, P[n], i * 160, 0));
  const result = { info, audit, files: {}, previews: {} };
  for (const n of order) result.files[n] = IMG.url(final[n], 1);
  result.previews = { tiling_proof_random_orders: IMG.url(sheet, 1), contact_sheet: IMG.url(contact, 1), before_after_strip: IMG.url((() => { const d = IMG.mk(5 * 160, 520); for (let i = 0; i < d.data.length; i += 4) { d.data[i] = 70; d.data[i+1] = 70; d.data[i+2] = 80; d.data[i+3] = 255; } blit(d, raw, 0, 0); ['wall_01','wall_05','wall_06','wall_07','wall_08'].forEach((n, i) => blit(d, final[n], i * 160, 264)); return d; })(), 1) };
  return result;
});
const save = async (path, url) => writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
for (const [n, u] of Object.entries(out.files)) await save(DEST + (n === 'wall_tenant' ? 'wall_tenant_window' : n === 'left_end_tenant' ? 'left_end_tenant_window' : n) + '.png', u);
for (const [n, u] of Object.entries(out.previews)) await save(DEST + 'previews/' + n + '.png', u);
await writeFile(DEST + 'palette_audit.json', JSON.stringify({ target: { mean_rgb: [27, 31, 69], blue_dominant_pct_min: 95, hue: [230, 242], rule: 'brick mean within 8 of target per channel; warm < 8% of opaque pixels' }, panels: out.audit }, null, 2));
await writeFile(DEST + 'build_info.json', JSON.stringify(out.info, null, 2));
console.log(JSON.stringify({ info: out.info, audit: out.audit }, null, 1));
await close();

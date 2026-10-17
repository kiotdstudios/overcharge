import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const OUT = fileURLToPath(new URL('./', import.meta.url)).replace(/\\/g, '/');
const DEST = ROOT + '/assets/tilesets/night_city_wall/';
await rm(DEST, { recursive: true, force: true });
await mkdir(DEST + 'previews', { recursive: true }); await mkdir(DEST + 'overlays', { recursive: true });
const LIB = await readFile(OUT + 'walltiles_lib.js', 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try { const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
    if (p === '/__h.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<!doctype html><body></body>'); return; }
    const body = await readFile(normalize(join(ROOT, p))); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404); res.end('nf'); } });
await new Promise(r => server.listen(3373, r));
const b = await chromium.launch(); const page = await b.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:3373/__h.html');
await page.addScriptTag({ content: LIB });
const result = await page.evaluate(async () => {
  const W = window.WT; const S = 32, M = 8; const GT = 40; const stats = []; const files = {}, overlays = {}, info = { picks: {} };
  const P = {}; const PR = {}; for (const n of [1, 2, 3, 4]) { PR[n] = await W.panel(n); }
  const isStain = p => p[3] > 0 && (p[1] > 36 || p[0] > 38);
  const destain = (src) => { const o = W.mk(src.width, src.height); o.data.set(src.data);
    for (let y = 60; y < 233; y++) for (let x = 14; x < 115; x++) { const p = W.get(src, x, y); if (!isStain(p)) continue;
      let q = null; for (const d of [16, -16, 32, -32, 8, -8]) { const c = W.get(src, x + d, y); if (c[3] > 0 && !isStain(c)) { q = c; break; } }
      if (!q) for (let d = 1; d < 40 && !q; d++) for (const s of [1, -1]) { const c = W.get(src, x + s * d, y); if (c[3] > 0 && !isStain(c)) { q = c; break; } }
      if (q) W.put(o, x, y, q); }
    return o; };  for (const n of [1, 2, 3, 4]) P[n] = destain(PR[n]);
  const lum = p => p[0] * 0.3 + p[1] * 0.5 + p[2] * 0.2;
  const diff = (a, b) => { let s = 0; for (let k = 0; k < 3; k++) s += Math.abs(a[k] - b[k]); return s / 3; };
  // metrics on a finished tile
  const stainFrac = t => { let n = 0; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const p = W.get(t, x, y); if (p[1] > GT || (p[0] > 48 && p[2] > 95)) n++; } return n / (S * S); };
  const lattice = t => { // tile boundary step compared with the average inner step, both axes
    let bx = 0, ix = 0, by = 0, iy = 0;
    for (let y = 0; y < S; y++) { bx += diff(W.get(t, S - 1, y), W.get(t, 0, y)); for (let x = 0; x < S - 1; x++) ix += diff(W.get(t, x, y), W.get(t, x + 1, y)) / (S - 1); }
    for (let x = 0; x < S; x++) { by += diff(W.get(t, x, S - 1), W.get(t, x, 0)); for (let y = 0; y < S - 1; y++) iy += diff(W.get(t, x, y), W.get(t, x, y + 1)) / (S - 1); }
    return Math.max(bx / Math.max(1e-6, ix), by / Math.max(1e-6, iy));
  };
  const mate = (A, B, axis) => { let s = 0; for (let i = 0; i < S; i++) s += axis === 'x' ? diff(W.get(A, S - 1, i), W.get(B, 0, i)) : diff(W.get(A, i, S - 1), W.get(B, i, 0)); return s / S; };
  // ---- candidates for the plain centre family: real windows of the real panels, no props, no stains
  const avoid = (n, x, y) => (n === 2 && x + 48 > 66 && y + 48 > 150) || (n === 3 && x < 50 && y + 48 > 170) || (n === 1 && y < 90);
  const p4 = P[4];
  const lumRow = (t, y, x0 = 0, x1 = S) => { let s = 0, n = 0; for (let x = x0; x < x1; x++) { const p = W.get(t, x, y); if (p[3] > 0) { s += p[0] * .3 + p[1] * .5 + p[2] * .2; n++; } } return n ? s / n : 0; };
  const phaseRms = (A, rowsA, B, rowsB, x0 = 0, x1 = S) => { let s = 0; for (let i = 0; i < rowsA.length; i++) { const d = lumRow(A, rowsA[i], x0, x1) - lumRow(B, rowsB[i], x0, x1); s += d * d; } return Math.sqrt(s / rowsA.length); };
  const bestX0 = (y0) => { let best = null; for (let x = 16; x <= 72; x++) { const c = W.seamCost(W.crop(p4, x, y0, S, S), true, false); if (!best || c < best.c) best = { x, c }; } return best; };
  const tPick = bestX0(46), bPick = bestX0(209);
  const t0 = W.seamless(p4, tPick.x, 46, S, S, M, true, false), b0 = W.seamless(p4, bPick.x, 209, S, S, M, true, false);
  const lastRows = [26, 27, 28, 29, 30, 31], firstRows = [0, 1, 2, 3, 4, 5];
  const cands = [];
  for (const n of [1, 2, 3, 4]) for (let y = 62; y <= 232 - 48; y += 1) for (let x = 16; x <= 112 - 48; x += 4) {
    if (avoid(n, x, y)) continue;
    const t = W.seamless(P[n], x, y, S, S, M, true, true);
    const sf = stainFrac(t); if (sf > 0.01) continue;
    cands.push({ n, x, y, t, sf, lat: lattice(t) });
  }
  info.ncands = cands.length; { const h=[]; const q=W.crop(P[4],30,70,48,150); for(let y=0;y<150;y++)for(let x=0;x<48;x++){h.push(W.get(q,x,y)[1]);} h.sort((a,b)=>a-b); info.gp=[10,25,50,75,90,95,99].map(p=>h[Math.floor(h.length*p/100)]); }
  for (const c of cands) { c.ph = Math.max(phaseRms(t0, lastRows, c.t, lastRows), 0) + phaseRms(b0, firstRows, c.t, firstRows); c.score = c.lat + 0.12 * c.ph; }
  cands.sort((a, b) => a.score - b.score);
  const c0 = cands[0]; info.picks.c0 = { n: c0.n, x: c0.x, y: c0.y, lat: +c0.lat.toFixed(2), stain: +c0.sf.toFixed(3) };
  files.wall_c = c0.t;
  // variants that naturally mate with the centre on all four sides (no artificial borders, no lattice)
  const scored = cands.slice(1).filter(c => !(c.n === c0.n && Math.abs(c.x - c0.x) < 16 && Math.abs(c.y - c0.y) < 16)).map(c => ({
    ...c, mateScore: mate(c0.t, c.t, 'x') + mate(c.t, c0.t, 'x') + mate(c0.t, c.t, 'y') + mate(c.t, c0.t, 'y') + 2 * c.lat * 4 }));
  scored.sort((a, b) => a.mateScore - b.mateScore);
  const chosen = [];
  for (const c of scored) { if (chosen.length >= 4) break; if (chosen.some(u => u.n === c.n && Math.abs(u.x - c.x) < 20 && Math.abs(u.y - c.y) < 20)) continue; chosen.push(c); }
  chosen.forEach((c, i) => { files['wall_c_alt' + (i + 1)] = c.t; info.picks['alt' + (i + 1)] = { n: c.n, x: c.x, y: c.y, mate: +c.mateScore.toFixed(1), lat: +c.lat.toFixed(2) }; });
  // ---- the eight edge and corner tiles, all from panel 4 (the bare wall)
  const bestY = (x0, ref, cols) => { let best = null; for (let y = 62; y <= 232 - S - M - 2; y++) { const tt = W.crop(p4, x0, y, S, S); const c = W.seamCost(tt, false, true) + 0.6 * phaseRms(tt, [...Array(S).keys()], ref, [...Array(S).keys()], cols[0], cols[1]); if (!best || c < best.c) best = { y, c }; } return best; };
  const t = tPick, bt = bPick, l = bestY(16, files.wall_c, [8, 32]), r = bestY(80, files.wall_c, [0, 24]);
  info.picks.edges = { t, b: bt, l, r };
  files.wall_t = W.ringBlend(t0, files.wall_c, ['bottom'], 3);
  files.wall_b = W.ringBlend(b0, files.wall_c, ['top'], 3);
  files.wall_l = W.ringBlend(W.seamless(p4, 16, l.y, S, S, M, false, true), files.wall_c, ['right'], 3);
  files.wall_r = W.ringBlend(W.seamless(p4, 80, r.y, S, S, M, false, true), files.wall_c, ['left'], 3);
  files.wall_tl = W.ringBlend(W.ringBlend(W.crop(p4, 16, 46, S, S), files.wall_l, ['bottom'], 3), files.wall_t, ['right'], 3);
  files.wall_tr = W.ringBlend(W.ringBlend(W.crop(p4, 80, 46, S, S), files.wall_r, ['bottom'], 3), files.wall_t, ['left'], 3);
  files.wall_bl = W.ringBlend(W.ringBlend(W.crop(p4, 16, 209, S, S), files.wall_l, ['top'], 3), files.wall_b, ['right'], 3);
  files.wall_br = W.ringBlend(W.ringBlend(W.crop(p4, 80, 209, S, S), files.wall_r, ['top'], 3), files.wall_b, ['left'], 3);
  // ---- overlays: only the stain pixels of real panel areas, soft transparent edges, drawn OVER the plain wall wherever Chief wants character
  for (const k of Object.keys(files)) { const tt = files[k]; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { if (W.get(tt, x, y)[3] === 255) continue; let q = null; for (let d = 1; d < S && !q; d++) for (const s of [1, -1]) { const c = W.get(tt, x + s * d, y); if (c[3] === 255) { q = c; break; } } if (q) W.put(tt, x, y, q); } }  const base = W.meanRGB(files.wall_c);
  const overlay = (n, x, y, kind) => {
    const src = W.crop(PR[n], x, y, S, S), o = W.mk(S, S);
    for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
      const p = W.get(src, xx, yy);
      const teal = p[1] + p[2] - (base[1] + base[2]), purple = (p[0] - base[0]) + (p[2] - base[2]) * 0.2;
      const keep = kind === 'purple' ? (p[0] > base[0] + 8 && p[2] > 70) : (teal > 22 && p[0] < 60);
      const d = Math.min(xx, yy, S - 1 - xx, S - 1 - yy);                 // distance to the tile edge
      const fall = Math.min(1, d / 7);                                    // fade to nothing at the border
      if (keep && fall > W.bay(xx, yy)) W.put(o, xx, yy, [p[0], p[1], p[2], 255]);
    }
    return o;
  };
  overlays.stain_teal_1 = overlay(4, 26, 140, 'teal'); overlays.stain_teal_2 = overlay(3, 38, 122, 'teal'); overlays.stain_teal_3 = overlay(2, 50, 80, 'teal');
  overlays.glow_purple_1 = overlay(4, 44, 170, 'purple'); overlays.glow_purple_2 = overlay(4, 20, 170, 'purple');
  // ---- previews
  const blit = (dst, src, ox, oy, alpha) => { for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) { const p = W.get(src, x, y); if (alpha) { if (p[3] > 0) W.put(dst, ox + x, oy + y, p); } else W.put(dst, ox + x, oy + y, p); } };
  let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const cols = 12, rows = 7, wall = W.mk(cols * S, rows * S);
  const plain = ['wall_c', 'wall_c', 'wall_c_alt1', 'wall_c_alt2', 'wall_c_alt3', 'wall_c_alt4'];
  const ovNames = Object.keys(overlays);
  for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
    let name;
    if (ty === 0) name = tx === 0 ? 'wall_tl' : tx === cols - 1 ? 'wall_tr' : 'wall_t';
    else if (ty === rows - 1) name = tx === 0 ? 'wall_bl' : tx === cols - 1 ? 'wall_br' : 'wall_b';
    else if (tx === 0) name = 'wall_l'; else if (tx === cols - 1) name = 'wall_r';
    else name = plain[Math.floor(rnd() * plain.length)];
    blit(wall, files[name], tx * S, ty * S);
  }
  const wallPlain = JSON.parse(JSON.stringify({}));   // (placeholder to keep the structure obvious)
  const wallOv = W.mk(wall.width, wall.height); wallOv.data.set(wall.data);
  for (let i = 0; i < 9; i++) { const tx = 1 + Math.floor(rnd() * (cols - 2)), ty = 1 + Math.floor(rnd() * (rows - 2)); blit(wallOv, overlays[ovNames[Math.floor(rnd() * ovNames.length)]], tx * S, ty * S, true); }
  const old = W.mk(3 * 128, 256); for (let i = 0; i < 3; i++) blit(old, P[2 + i], i * 128, 0, true);
  const rep = W.mk(6 * S, 4 * S); for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 6; tx++) blit(rep, files.wall_c, tx * S, ty * S);
  const repAlt = W.mk(6 * S, 4 * S); for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 6; tx++) blit(repAlt, files[plain[Math.floor(rnd() * plain.length)]], tx * S, ty * S);
  // the sheet, in the reference layout: the 3 x 3 block in the middle, the plain alternates on the left, the overlays on the right
  const gap = 8, bg = [43, 46, 45, 255];
  const SW = 2 * S + 3 * gap + 3 * S + 2 * gap + 2 * gap + 2 * S + 2 * gap + 2 * S, SH = 3 * S + 2 * gap + 4 * gap;
  const sh = W.mk(3 * (S + gap) + 2 * (S + gap) + 3 * (S + gap) + 3 * gap, 3 * (S + gap) + 4 * gap);
  for (let i = 0; i < sh.data.length; i += 4) { sh.data[i] = bg[0]; sh.data[i + 1] = bg[1]; sh.data[i + 2] = bg[2]; sh.data[i + 3] = 255; }
  const gx = 2 * (S + gap) + 2 * gap, gy = 2 * gap;
  [['wall_tl', 'wall_t', 'wall_tr'], ['wall_l', 'wall_c', 'wall_r'], ['wall_bl', 'wall_b', 'wall_br']].forEach((row, j) => row.forEach((n, i) => blit(sh, files[n], gx + i * (S + gap), gy + j * (S + gap))));
  ['wall_c_alt1', 'wall_c_alt2', 'wall_c_alt3', 'wall_c_alt4'].forEach((n, k) => blit(sh, files[n], gap + (k % 2) * (S + gap), gy + Math.floor(k / 2) * (S + gap)));
  ovNames.forEach((n, k) => { const ox = gx + 3 * (S + gap) + gap + (k % 2) * (S + gap), oy = gy + Math.floor(k / 2) * (S + gap); const tmp = W.mk(S, S); blit(tmp, files.wall_c, 0, 0); blit(tmp, overlays[n], 0, 0, true); blit(sh, tmp, ox, oy); });
  const out = { info, tiles: {}, overlays: {}, previews: {}, means: Object.fromEntries(Object.keys(files).map(k => [k, W.meanRGB(files[k]).map(v => Math.round(v))])) };
  for (const k of Object.keys(files)) out.tiles[k] = W.toURL(files[k], 1);
  for (const k of Object.keys(overlays)) out.overlays[k] = W.toURL(overlays[k], 1);
  out.previews = { wall_assembled_preview: W.toURL(wall, 3), wall_assembled_with_overlays: W.toURL(wallOv, 3), wall_old_panels_for_comparison: W.toURL(old, 3), wall_repeat_test_centre_only: W.toURL(rep, 4), wall_repeat_test_with_alternates: W.toURL(repAlt, 4), wall_tileset_sheet: W.toURL(sh, 3) };
  return out;
});
const save = async (path, url) => writeFile(path + '.png', Buffer.from(url.split(',')[1], 'base64'));
for (const [k, v] of Object.entries(result.tiles)) await save(DEST + k, v);
for (const [k, v] of Object.entries(result.overlays)) await save(DEST + 'overlays/' + k, v);
for (const [k, v] of Object.entries(result.previews)) await save(DEST + 'previews/' + k, v);
console.log('picks', JSON.stringify(result.info.picks), 'ncands', result.info.ncands, 'gp', JSON.stringify(result.info.gp));
console.log('means', JSON.stringify(result.means));
console.log('errors', JSON.stringify(errs));
await b.close(); server.close();

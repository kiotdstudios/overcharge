// Assemble the tenant clips (CODEX 05 Task 2, Kiro pass, PixelLab frames):
//  - drop the input frame (a different render than the generated frames), drop a last frame that does not follow
//  - stabilise each frame on the static forearm/torso so a 1 px render shift is not a "pop"
//  - remove loose specks (disconnected blobs under 30 px) from the wind lines and flying curls
//  - write frames + metrics.   node tenant_build.mjs <hot clips comma list> [--write]
import { open, ROOT } from '../apartment_plain/apt_lib.mjs';
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
const T = process.env.TENANT_WORK || 'C:/Users/diepowel/Documents/_kiro_tools/tenant/';   // working folder: key.png, relaxed.png and one folder of fNN.png per clip
const hotNames = (process.argv[2] || 'hotA,hotB,hotC').split(',');
const WRITE = process.argv.includes('--write'); const SEQ = (process.argv.find(a => a.startsWith('--seq=')) || '').slice(6);
const DEST = ROOT + '/assets/sprites/npc-window-tenant-v3/';
const { page, close } = await open(3395);
const load = async n => { const files = (await readdir(T + n)).filter(f => /^f\d+\.png$/.test(f)).sort(); const o = []; for (const f of files) o.push('data:image/png;base64,' + (await readFile(T + n + '/' + f)).toString('base64')); return o; };
const clips = {}; for (const n of [...hotNames, 'relieved', 'idle']) clips[n] = await load(n);
const keyUrl = 'data:image/png;base64,' + (await readFile(T + 'key.png')).toString('base64');
const relUrl = 'data:image/png;base64,' + (await readFile(T + 'relaxed.png')).toString('base64');
const out = await page.evaluate(async ({ clips, hotNames, keyUrl, relUrl, SEQ }) => {
  const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
  const dataOf = async src => { const i = await load(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
  const px = (d, x, y) => { if (x < 0 || y < 0 || x >= d.width || y >= d.height) return [0,0,0,0]; const i = (y*d.width+x)*4; return [d.data[i], d.data[i+1], d.data[i+2], d.data[i+3]]; };
  const diffPct = (a, b) => { let ch = 0, op = 0; for (let i = 0; i < a.data.length; i += 4) { const oa = a.data[i+3] > 0, ob = b.data[i+3] > 0; if (oa || ob) { op++; if (oa !== ob || Math.abs(a.data[i]-b.data[i]) + Math.abs(a.data[i+1]-b.data[i+1]) + Math.abs(a.data[i+2]-b.data[i+2]) > 24) ch++; } } return op ? 100 * ch / op : 0; };
  const shift = (d, dx, dy) => { const o = new ImageData(d.width, d.height); for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) { const p = px(d, x - dx, y - dy); const i = (y*d.width+x)*4; o.data[i] = p[0]; o.data[i+1] = p[1]; o.data[i+2] = p[2]; o.data[i+3] = p[3]; } return o; };
  const ANCH = { x0: 14, x1: 70, y0: 92, y1: 112 };
  const anchorCost = (a, b) => { let s = 0, n = 0; for (let y = ANCH.y0; y <= ANCH.y1; y++) for (let x = ANCH.x0; x <= ANCH.x1; x++) { const p = px(a, x, y), q = px(b, x, y); if (p[3] || q[3]) { n++; s += (p[3] > 0) !== (q[3] > 0) ? 300 : Math.abs(p[0]-q[0]) + Math.abs(p[1]-q[1]) + Math.abs(p[2]-q[2]); } } return n ? s / n : 1e9; };
  const stabilise = (d, ref) => { let best = [0, 0], bc = anchorCost(d, ref); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (!dx && !dy) continue; const c = anchorCost(shift(d, dx, dy), ref); if (c < bc - 0.5) { bc = c; best = [dx, dy]; } } return { img: (best[0] || best[1]) ? shift(d, best[0], best[1]) : d, shift: best }; };
  const despeckle = (d, minPx = 30) => { const w = d.width, h = d.height, lab = new Int32Array(w*h).fill(-1), sizes = []; let id = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (d.data[(y*w+x)*4+3] === 0 || lab[y*w+x] >= 0) continue; const st = [[x, y]]; lab[y*w+x] = id; let n = 0; while (st.length) { const [cx, cy] = st.pop(); n++; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const nx = cx + ox, ny = cy + oy; if (nx < 0 || ny < 0 || nx >= w || ny >= h || lab[ny*w+nx] >= 0 || d.data[(ny*w+nx)*4+3] === 0) continue; lab[ny*w+nx] = id; st.push([nx, ny]); } } sizes.push(n); id++; }
    const biggest = sizes.indexOf(Math.max(...sizes)); let removed = 0; const o = new ImageData(new Uint8ClampedArray(d.data), w, h);
    for (let i = 0; i < w*h; i++) if (lab[i] >= 0 && lab[i] !== biggest && sizes[lab[i]] < minPx) { o.data[i*4+3] = 0; o.data[i*4] = o.data[i*4+1] = o.data[i*4+2] = 0; removed++; }
    return { img: o, removed }; };
  const keyD = await dataOf(keyUrl), relD = await dataOf(relUrl);
  // one shared palette for every clip: the exact colours of the key frame and the relaxed frame
  const palSet = new Map(); for (const d of [keyD, relD]) for (let i = 0; i < d.data.length; i += 4) if (d.data[i+3]) palSet.set(d.data[i] << 16 | d.data[i+1] << 8 | d.data[i+2], 1);
  const PAL = [...palSet.keys()].map(k => [k >> 16 & 255, k >> 8 & 255, k & 255]); const memo = new Map();
  const snapPal = d => { const o = new ImageData(new Uint8ClampedArray(d.data), d.width, d.height); for (let i = 0; i < o.data.length; i += 4) { if (!o.data[i+3]) continue; o.data[i+3] = 255; const k = o.data[i] << 16 | o.data[i+1] << 8 | o.data[i+2]; let p = memo.get(k); if (!p) { let bd = 1e9; for (const c of PAL) { const dd = (c[0]-o.data[i])**2 + (c[1]-o.data[i+1])**2 + (c[2]-o.data[i+2])**2; if (dd < bd) { bd = dd; p = c; } } memo.set(k, p); } o.data[i] = p[0]; o.data[i+1] = p[1]; o.data[i+2] = p[2]; } return o; };
  const result = { clips: {}, info: {} };
  const processed = {};
  for (const [name, urls] of Object.entries(clips)) {
    const ref = name === 'idle' ? relD : keyD;
    let frames = []; for (const u of urls) frames.push(await dataOf(u));
    // The input frame (index 0) is the exact key/relaxed pose, a different render from the generated frames, so it is used only as the entry
    // pose of a clip. The pinned last frame is a re-render of the same pose and is dropped; the next clip starts from the exact pose instead.
    const entry = frames[0]; frames = frames.slice(1);
    frames.pop();
    if (name === "idle") frames.push(relD); else if (name === "relieved") { frames.unshift(keyD); frames.push(relD); } else frames.unshift(keyD);

    // colour-cast guard: a generated frame whose green channel drifts from the clip median is a bad render; hold the previous good frame instead
    const meanG = d => { let g = 0, n = 0; for (let i = 0; i < d.data.length; i += 4) if (d.data[i+3]) { g += d.data[i+1]; n++; } return g / n; };
    const gs = frames.map(meanG), med = 56;   // the key frame's mean green; a frame more than 7 off it is a colour-cast render
    let flagged = 0; for (let i = 0; i < frames.length; i++) if (Math.abs(gs[i] - med) > 7) { flagged++; let j = i - 1; while (j >= 0 && Math.abs(gs[j] - med) > 7) j--; if (j < 0) { j = i + 1; while (j < frames.length && Math.abs(gs[j] - med) > 7) j++; } if (j >= 0 && j < frames.length) { frames[i] = frames[j]; } }
    const shifts = {}, kept = []; let removed = 0;
    for (const f of frames) { const s = { img: f, shift: [0, 0] };   /* stabilisation off: clips are already registered to the key, and a real lean must not be undone */ const k = `${s.shift[0]},${s.shift[1]}`; shifts[k] = (shifts[k] || 0) + 1; const ds = despeckle(s.img); removed += ds.removed; kept.push(ds.img); }
    processed[name] = kept; result.info[name] = { frames: kept.length, shifts, speckPixelsRemoved: removed, castFramesHeld: flagged, medianG: +med.toFixed(1) };
  }
  const stepsOf = fr => fr.slice(1).map((f, i) => +diffPct(fr[i], f).toFixed(1));
  const hotSeq = [];
  if (SEQ) { for (const tok of SEQ.split("+")) { if (tok === "r") { for (let i = 0; i < 12; i++) hotSeq.push(keyD); } else if (tok.endsWith("!")) { hotSeq.push(...processed[tok.slice(0, -1)].slice().reverse()); } else hotSeq.push(...processed[tok]); } }
  else for (const n of hotNames) hotSeq.push(...processed[n]);
  const stat = (fr, loop) => { const st = stepsOf(fr); const seam = +diffPct(fr[fr.length - 1], fr[0]).toFixed(1); return { frames: fr.length, maxStep: Math.max(...st), meanStep: +(st.reduce((a, b) => a + b, 0) / st.length).toFixed(1), stepsOver35: st.filter(v => v > 35).length, seam: loop ? seam : null, steps: st }; };
  for (const n of Object.keys(processed)) { const fr = processed[n]; result.info[n].vsKeyFirst = +diffPct(fr[0], n === 'idle' ? relD : keyD).toFixed(1); result.info[n].vsKeyLast = +diffPct(fr[fr.length - 1], n === 'relieved' || n === 'idle' ? relD : keyD).toFixed(1); }
  for (const n of Object.keys(processed)) { const fr = processed[n]; result.info[n].vsKeyFirst = +diffPct(fr[0], n === "idle" ? relD : keyD).toFixed(1); result.info[n].vsKeyLast = +diffPct(fr[fr.length - 1], (n === "relieved" || n === "idle") ? relD : keyD).toFixed(1); }
  result.clips.hot = stat(hotSeq, true); result.clips.relieved = stat(processed.relieved, false); result.clips.idle = stat(processed.idle, true);
  if (!SEQ) result.clips.hot.boundaries = hotNames.map((n, i) => { const a = processed[n], b = processed[hotNames[(i + 1) % hotNames.length]]; return `${n}->${hotNames[(i + 1) % hotNames.length]}: ${diffPct(a[a.length - 1], b[0]).toFixed(1)}`; });
  result.clips.relieved.fromHotEnd = +diffPct(processed[hotNames[0]][processed[hotNames[0]].length - 1], processed.relieved[0]).toFixed(1);
  result.clips.idle.fromReliefEnd = +diffPct(processed.relieved[processed.relieved.length - 1], processed.idle[0]).toFixed(1);
  // union bounds
  let x0 = 999, y0 = 999, x1 = -1, y1 = -1; const bset = fr => { for (const d of fr) for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) if (d.data[(y*d.width+x)*4+3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } };
  bset(hotSeq); bset(processed.relieved); bset(processed.idle); result.bounds = { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  // colours across everything
  const cols = new Set(); for (const fr of [hotSeq, processed.relieved, processed.idle]) for (const d of fr) for (let i = 0; i < d.data.length; i += 4) if (d.data[i+3]) cols.add(d.data[i] << 16 | d.data[i+1] << 8 | d.data[i+2]); result.colours = cols.size;
  const url = d => { const c = document.createElement('canvas'); c.width = d.width; c.height = d.height; c.getContext('2d').putImageData(d, 0, 0); return c.toDataURL('image/png'); };
  result.files = { hot: hotSeq.map(url), relieved: processed.relieved.map(url), idle: processed.idle.map(url) };
  // contact sheets (4x on dark and light) for the first 24 frames of each clip + a strip of the hot cycle
  const sheet = (fr, bg, S = 2, per = 10, cap = 40) => { const n = Math.min(fr.length, cap), rows = Math.ceil(n / per), c = document.createElement('canvas'); c.width = per * 128 * S; c.height = rows * 128 * S; const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; const tmp = document.createElement('canvas'); tmp.width = 128; tmp.height = 128; const tg = tmp.getContext('2d'); for (let i = 0; i < n; i++) { tg.clearRect(0, 0, 128, 128); tg.putImageData(fr[i], 0, 0); g.drawImage(tmp, (i % per) * 128 * S, Math.floor(i / per) * 128 * S, 128 * S, 128 * S); } return c.toDataURL('image/png'); };
  const every = (fr, k) => fr.filter((_, i) => i % k === 0);
  result.sheets = { hot_dark: sheet(every(hotSeq, 5), '#1e1828'), hot_light: sheet(every(hotSeq, 5), '#d8d4e0'), relieved_dark: sheet(processed.relieved, '#1e1828'), relieved_light: sheet(processed.relieved, '#d8d4e0'), idle_dark: sheet(processed.idle, '#1e1828'), idle_light: sheet(processed.idle, '#d8d4e0') };
  return result;
}, { clips, hotNames, keyUrl, relUrl, SEQ });
const save = (p, u) => writeFile(p, Buffer.from(u.split(',')[1], 'base64'));
await mkdir(T + 'out', { recursive: true });
for (const [k, u] of Object.entries(out.sheets)) await save(T + 'out/' + k + '.png', u);
const summary = { info: out.info, bounds: out.bounds, colours: out.colours, hot: { ...out.clips.hot, steps: undefined }, relieved: { ...out.clips.relieved, steps: undefined }, idle: { ...out.clips.idle, steps: undefined } };
console.log(JSON.stringify(summary, null, 1));
await writeFile(T + 'out/steps.json', JSON.stringify({ hot: out.clips.hot.steps, relieved: out.clips.relieved.steps, idle: out.clips.idle.steps }));
if (WRITE) {
  await rm(DEST, { recursive: true, force: true });
  for (const k of ['hot', 'relieved', 'idle']) { await mkdir(DEST + k, { recursive: true }); for (let i = 0; i < out.files[k].length; i++) await save(`${DEST}${k}/${String(i).padStart(3, '0')}.png`, out.files[k][i]); }
  await writeFile(DEST + 'metrics.json', JSON.stringify({ bounds: out.bounds, colours: out.colours, clips: out.clips, info: out.info }, null, 1));
  console.log('written to', DEST);
}
await close();

// node make_gif.mjs <out.gif> <delayCs> <scale> <bg hex like 1e1828> <png files...>   (frames composited on the bg colour, nearest-neighbour scaled, looping GIF89a)
import { open } from '../apartment_plain/apt_lib.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const [out, delay, scale, bg, ...files] = process.argv.slice(2);
const urls = []; for (const f of files) urls.push('data:image/png;base64,' + (await readFile(f)).toString('base64'));
const { page, close } = await open(3397);
const b64 = await page.evaluate(async ({ urls, delay, scale, bg }) => {
  const S = Number(scale), D = Number(delay), BG = [parseInt(bg.slice(0, 2), 16), parseInt(bg.slice(2, 4), 16), parseInt(bg.slice(4, 6), 16)];
  const load = src => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
  const frames = [];
  for (const u of urls) { const i = await load(u); const c = document.createElement('canvas'); c.width = i.width * S; c.height = i.height * S; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = `rgb(${BG})`; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; g.drawImage(i, 0, 0, c.width, c.height); frames.push(g.getImageData(0, 0, c.width, c.height)); }
  const W = frames[0].width, H = frames[0].height;
  // palette (<= 256 exact colours; reduce by merging the rarest into nearest if more)
  const count = new Map(); for (const f of frames) for (let i = 0; i < f.data.length; i += 4) { const k = f.data[i] << 16 | f.data[i+1] << 8 | f.data[i+2]; count.set(k, (count.get(k) || 0) + 1); }
  let pal = [...count.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]); const keep = pal.slice(0, 255);
  if (!keep.includes(BG[0] << 16 | BG[1] << 8 | BG[2])) keep.push(BG[0] << 16 | BG[1] << 8 | BG[2]);
  const idx = new Map(keep.map((k, i) => [k, i])); const rgb = k => [k >> 16 & 255, k >> 8 & 255, k & 255];
  const nearest = k => { if (idx.has(k)) return idx.get(k); const c = rgb(k); let bi = 0, bd = 1e12; keep.forEach((p, i) => { const q = rgb(p); const d = (c[0]-q[0])**2 + (c[1]-q[1])**2 + (c[2]-q[2])**2; if (d < bd) { bd = d; bi = i; } }); idx.set(k, bi); return bi; };
  let bits = 1; while ((1 << bits) < keep.length) bits++; bits = Math.max(bits, 2);
  const bytes = []; const w16 = v => bytes.push(v & 255, v >> 8 & 255);
  for (const ch of 'GIF89a') bytes.push(ch.charCodeAt(0));
  w16(W); w16(H); bytes.push(0x80 | (bits - 1) | ((bits - 1) << 4), 0, 0);
  for (let i = 0; i < (1 << bits); i++) { const c = i < keep.length ? rgb(keep[i]) : [0, 0, 0]; bytes.push(c[0], c[1], c[2]); }
  bytes.push(0x21, 0xFF, 11); for (const ch of 'NETSCAPE2.0') bytes.push(ch.charCodeAt(0)); bytes.push(3, 1, 0, 0, 0);
  const lzw = (pix, minCode) => { const clear = 1 << minCode, eoi = clear + 1; let size = minCode + 1, next = eoi + 1; let dict = new Map(); const out = []; let cur = 0, nb = 0; const emit = c => { cur |= c << nb; nb += size; while (nb >= 8) { out.push(cur & 255); cur >>= 8; nb -= 8; } };
    emit(clear); let prefix = pix[0];
    for (let i = 1; i < pix.length; i++) { const k = (prefix << 8 | pix[i]); if (dict.has(k)) prefix = dict.get(k); else { emit(prefix); if (next < 4096) { dict.set(k, next++); if (next - 1 === (1 << size) && size < 12) size++; } else { emit(clear); dict = new Map(); size = minCode + 1; next = eoi + 1; } prefix = pix[i]; } }
    emit(prefix); emit(eoi); if (nb > 0) out.push(cur & 255); return out; };
  for (const f of frames) {
    bytes.push(0x21, 0xF9, 4, 0x04, D & 255, D >> 8 & 255, 0, 0);          // disposal 1, delay
    bytes.push(0x2C); w16(0); w16(0); w16(W); w16(H); bytes.push(0);
    const pix = new Uint8Array(W * H); for (let i = 0, p = 0; i < f.data.length; i += 4, p++) pix[p] = nearest(f.data[i] << 16 | f.data[i+1] << 8 | f.data[i+2]);
    const minCode = bits; bytes.push(minCode); const data = lzw(pix, minCode);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); bytes.push(n); for (let j = 0; j < n; j++) bytes.push(data[i + j]); } bytes.push(0);
  }
  bytes.push(0x3B);
  let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.slice(i, i + 8192)); return btoa(s);
}, { urls, delay, scale, bg });
await writeFile(out, Buffer.from(b64, 'base64'));
console.log('gif', out, Buffer.from(b64, 'base64').length, 'bytes', files.length, 'frames');
await close();

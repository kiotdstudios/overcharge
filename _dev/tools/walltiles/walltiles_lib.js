// Wall tile builder, runs inside a page (canvas). Pixel-exact crops of the real filler_wall panels, made seamless with ordered dithering (no new colours).
window.WT = (() => {
  const DIR = '/assets/objects/night-city-buildings/filler_wall/';
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const bay = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;
  const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; });
  async function panel(n) {
    const img = await load(DIR + `filler_wall_0${n}.png`);
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, img.width, img.height);
  }
  const mk = (w, h) => new ImageData(w, h);
  const get = (d, x, y) => { if (x < 0 || y < 0 || x >= d.width || y >= d.height) return [0, 0, 0, 0]; const i = (y * d.width + x) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2], d.data[i + 3]]; };
  const put = (d, x, y, p) => { const i = (y * d.width + x) * 4; d.data[i] = p[0]; d.data[i + 1] = p[1]; d.data[i + 2] = p[2]; d.data[i + 3] = p[3]; };
  function crop(d, sx, sy, w, h) { const o = mk(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) put(o, x, y, get(d, sx + x, sy + y)); return o; }
  // mean abs difference across the wrap seams of a tile (lower = more naturally seamless)
  function seamCost(t, wrapX, wrapY) {
    let s = 0, n = 0;
    if (wrapX) for (let y = 0; y < t.height; y++) { const a = get(t, t.width - 1, y), b = get(t, 0, y); for (let k = 0; k < 4; k++) s += Math.abs(a[k] - b[k]); n += 4; }
    if (wrapY) for (let x = 0; x < t.width; x++) { const a = get(t, x, t.height - 1), b = get(t, x, 0); for (let k = 0; k < 4; k++) s += Math.abs(a[k] - b[k]); n += 4; }
    return n ? s / n : 0;
  }
  // Make a tw x th tile from source (sx,sy) that repeats cleanly along the wrapped axes.
  // Needs m extra source pixels to the right (and below) of the tile window.
  function seamless(S, sx, sy, tw, th, m, wrapX, wrapY) {
    const H1 = wrapY ? th + m : th;
    const wx = mk(tw, H1);
    for (let y = 0; y < H1; y++) for (let x = 0; x < tw; x++) {
      let p = get(S, sx + x, sy + y);
      if (wrapX && x < m) { const alt = get(S, sx + tw + x, sy + y); const wAlt = 1 - (x + 0.5) / m; if (wAlt > bay(x, y)) p = alt; }
      put(wx, x, y, p);
    }
    const out = mk(tw, th);
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
      let p = get(wx, x, y);
      if (wrapY && y < m) { const alt = get(wx, x, th + y); const wAlt = 1 - (y + 0.5) / m; if (wAlt > bay(x, y)) p = alt; }
      put(out, x, y, p);
    }
    return out;
  }
  function toURL(d, scale = 1) {
    const c = document.createElement('canvas'); c.width = d.width * scale; c.height = d.height * scale;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const t = document.createElement('canvas'); t.width = d.width; t.height = d.height; t.getContext('2d').putImageData(d, 0, 0);
    x.drawImage(t, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }
  function meanRGB(d) { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] > 200) { r += d.data[i]; g += d.data[i + 1]; b += d.data[i + 2]; n++; } return n ? [r / n, g / n, b / n] : [0, 0, 0]; }
  function bbox(d) { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < d.height; y++) for (let x = 0; x < d.width; x++) if (d.data[(y * d.width + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; }
  // Pull the outer k pixels of `tile` on the given sides toward `ref` (ordered dithering, no new colours), so two different tiles meet on identical pixels.
  function ringBlend(tile, ref, sides, k) {
    const o = mk(tile.width, tile.height);
    for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
      let p = get(tile, x, y), w = 0;
      if (sides.includes('left')) w = Math.max(w, 1 - (x + 0.5) / k);
      if (sides.includes('right')) w = Math.max(w, 1 - (tile.width - x - 0.5) / k);
      if (sides.includes('top')) w = Math.max(w, 1 - (y + 0.5) / k);
      if (sides.includes('bottom')) w = Math.max(w, 1 - (tile.height - y - 0.5) / k);
      if (w > 0 && w > bay(x, y)) p = get(ref, x, y);
      put(o, x, y, p);
    }
    return o;
  }
  return { panel, mk, get, put, crop, seamCost, seamless, toURL, meanRGB, bbox, bay, ringBlend };
})();

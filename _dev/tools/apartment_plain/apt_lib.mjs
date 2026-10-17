// Shared Playwright page + helpers for the apartment_plain pass. Usage: import { open } ...
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
export async function open(port = 3391) {
  const server = createServer(async (req, res) => {
    try { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/__h.html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<body></body>'); return; }
      const b = await readFile(normalize(join(ROOT, p))); res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b);
    } catch { res.writeHead(404); res.end('nf'); } });
  await new Promise(r => server.listen(port, r));
  const browser = await chromium.launch(); const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/__h.html`);
  await page.addScriptTag({ content: `window.IMG = {
    load: src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load ' + src)); i.src = src; }),
    async data(src) { const i = await this.load(src); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); },
    px(d, x, y) { if (x < 0 || y < 0 || x >= d.width || y >= d.height) return [0,0,0,0]; const i = (y * d.width + x) * 4; return [d.data[i], d.data[i+1], d.data[i+2], d.data[i+3]]; },
    put(d, x, y, p) { const i = (y * d.width + x) * 4; d.data[i] = p[0]; d.data[i+1] = p[1]; d.data[i+2] = p[2]; d.data[i+3] = p[3] === undefined ? 255 : p[3]; },
    url(d, scale = 1) { const c = document.createElement('canvas'); c.width = d.width; c.height = d.height; c.getContext('2d').putImageData(d, 0, 0); if (scale === 1) return c.toDataURL('image/png'); const s = document.createElement('canvas'); s.width = d.width * scale; s.height = d.height * scale; const sx = s.getContext('2d'); sx.imageSmoothingEnabled = false; sx.drawImage(c, 0, 0, s.width, s.height); return s.toDataURL('image/png'); },
    mk: (w, h) => new ImageData(w, h)
  };` });
  return { page, close: async () => { await browser.close(); server.close(); } };
}

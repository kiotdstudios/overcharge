// Builds the Level 1 status and finish-list document (HTML) from the REAL src_scroll/levels/level1.json.
// The side-view map is drawn from the level file, so it always shows what is actually on Level 1.
//   node _dev/tools/level1_status/build_level1_status.mjs   ->  _dev/tools/level1_status/out/OVERCHARGE_Level1_Roadmap.html
// Print to PDF with Edge/Chrome (see README.md next to this file).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const L = JSON.parse(fs.readFileSync(ROOT + 'src_scroll/levels/level1.json', 'utf8'));
const C = L.cols, R = L.tiles.length / C, TILE = 32;
const solid = v => v === 1 || v >= 10, oneWay = v => v === 2;
const T = (c, r) => L.tiles[r * C + c];
// ---------- the map ----------
const K = 0.28125;                       // 1 world px = 0.28125 svg px, so one tile = 9 px
const PADL = 22, PADT = 34, W = PADL * 2 + C * TILE * K, H = PADT + R * TILE * K + 74;
const sx = x => PADL + x * K, sy = y => PADT + y * K;
let svg = `<svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI, Arial, sans-serif">`;
svg += `<rect width="${W}" height="${H}" rx="8" fill="#0b1020"/>`;
for (let c = 0; c <= C; c += 10) {       // ruler every 10 columns (320 px)
  svg += `<line x1="${sx(c * TILE)}" x2="${sx(c * TILE)}" y1="${PADT - 6}" y2="${sy(R * TILE)}" stroke="#18213f" stroke-width="1"/>`;
  svg += `<text x="${sx(c * TILE)}" y="${PADT - 10}" fill="#6f7fae" font-size="7" text-anchor="middle">${c * TILE}</text>`;
}
// background buildings (outlines only): apartment, QuickMart, bus stop shelter, exit-side block
const box = (x, y, w, h, label, color = '#4a5a92', dash = '') => {
  svg += `<rect x="${sx(x)}" y="${sy(y)}" width="${w * K}" height="${h * K}" fill="${color}" fill-opacity="0.16" stroke="${color}" stroke-width="1" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  if (label) svg += `<text x="${sx(x) + 3}" y="${sy(y) + 9}" fill="#9fb0e0" font-size="7.5">${label}</text>`;
};
const deco = L.decorations;
const ext = rx => { const m = deco.filter(d => rx.test((d.src || '') + (d.assetId || '') + (d.id || ''))); if (!m.length) return null; const x0 = Math.min(...m.map(d => d.x)), y0 = Math.min(...m.map(d => d.y)), x1 = Math.max(...m.map(d => d.x + d.w)), y1 = Math.max(...m.map(d => d.y + d.h)); return [x0, y0, x1 - x0, y1 - y0]; };
const apt = ext(/apartment_plain/), qm = ext(/quickmart/), bus = ext(/bus_stop_shelter|bus-stop/), exitBlk = ext(/bg_exit_building/);
if (exitBlk) box(...exitBlk, '', '#3a4a78', '3 3');
if (apt) box(...apt, '', '#6b4fa8');
if (qm) box(...qm, 'QuickMart', '#d9a63f');
if (bus) box(...bus, 'bus stop', '#44a0c8');
// tiles: merge runs per row
for (let r = 0; r < R; r++) {
  let c = 0;
  while (c < C) {
    const v = T(c, r);
    if (!v) { c++; continue; }
    const kind = oneWay(v) ? 'o' : (solid(v) ? 's' : 'n'); let e = c;
    while (e + 1 < C && T(e + 1, r) && (oneWay(T(e + 1, r)) ? 'o' : (solid(T(e + 1, r)) ? 's' : 'n')) === kind) e++;
    const x = sx(c * TILE), y = sy(r * TILE), w = (e - c + 1) * TILE * K;
    if (kind === 's') svg += `<rect x="${x}" y="${y}" width="${w}" height="${TILE * K}" fill="#33426f"/>`;
    else if (kind === 'o') svg += `<rect x="${x}" y="${y}" width="${w}" height="3" fill="#b66cff"/>`;
    c = e + 1;
  }
}
// roof/ground surface line (top edge of each solid column run) in a lighter colour
for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) if (solid(T(c, r)) && (r === 0 || !solid(T(c, r - 1)))) svg += `<rect x="${sx(c * TILE)}" y="${sy(r * TILE)}" width="${TILE * K}" height="2" fill="#7f95d8"/>`;
// ladders
for (const d of deco.filter(d => /ladder/i.test(d.src || ''))) svg += `<line x1="${sx(d.x + d.w / 2)}" x2="${sx(d.x + d.w / 2)}" y1="${sy(d.y)}" y2="${sy(d.y + d.h)}" stroke="#ffc070" stroke-width="2" stroke-dasharray="2 2"/>`;
// pit: any empty column gap at ground rows
const placed = [];   // label boxes already on the map, so labels step out of each other's way
const label = (x, y, text, color, dy = -7, anchor = 'middle', size = 7.5) => {
  const w = text.length * size * 0.52, h = size + 1;
  const X = sx(x), box = dy => { const bx = anchor === 'middle' ? X - w / 2 : anchor === 'end' ? X - w : X; const by = sy(y) + dy - h + 2; return [bx, by, bx + w, by + h]; };
  const hit = b => placed.some(q => b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]);
  const tries = dy < 0 ? [dy, dy - 9, dy - 18, dy - 27, dy - 36, 12, 21] : [dy, dy + 9, dy + 18, -8, -17, -26];
  let use = tries.find(d => !hit(box(d)));
  if (use === undefined) use = tries[0];
  placed.push(box(use));
  svg += `<text x="${X}" y="${sy(y) + use}" fill="${color}" font-size="${size}" text-anchor="${anchor}">${text}</text>`;
};const dot = (x, y, color, r = 3.2) => { svg += `<circle cx="${sx(x)}" cy="${sy(y)}" r="${r}" fill="${color}" stroke="#0b1020" stroke-width="0.8"/>`; };
// sources
if (apt) label(apt[0] + apt[2] / 2, apt[1] + 130, 'apartment: tenant window, ladder, AC on the roof', '#9fb0e0', 0, 'middle', 7.5);
const lamps = L.sources.filter(s => s.label === 'LAMP').sort((a, b) => a.x - b.x);
lamps.forEach((s, i) => { dot(s.x + 16, s.y + 30, '#ffe08a'); label(s.x + 16, s.y + 30, `lamp ${i + 1} (${s.charge})`, '#ffe08a', i === 2 ? -17 : -8); });
for (const s of L.sources.filter(s => s.label === 'VEND')) { dot(s.x + 24, s.y + 40, '#b66cff'); label(s.x + 24, s.y + 40, `vending (${s.charge})`, '#b66cff', -8); }
for (const s of L.sources.filter(s => s.kind === 'hvac')) { dot(s.x + 24, s.y + 14, '#b66cff'); label(s.x + 70, s.y + 14, `AC unit (${s.charge}, starts off)`, '#b66cff', -6, 'start'); }
// npcs
const short = { npc_graffiti_artist_01: 'graffiti artist', npc_smoke_break_worker_a: 'workers', npc_smoke_break_worker_b: '', npc_bus_stop_homeless_01: 'unhoused man', npc_bus_stop_backpack_01: 'commuter', NPC_STREETLAMP_01: 'streetlamp woman', NPC_TENANT: 'tenant' };
for (const n of L.npcs) { dot(n.x, n.y - 24, '#44ddff', 2.6); const t = short[n.id]; if (t) label(n.x, n.y - 24, t, '#44ddff', n.id === 'NPC_STREETLAMP_01' ? 14 : (n.id === 'npc_bus_stop_backpack_01' ? 14 : -6), 'middle', 7); }
for (const c of L.checkpoints) { svg += `<path d="M ${sx(c.x)} ${sy(c.y)} v -22 l 9 4 l -9 4" fill="#44ff88" stroke="#44ff88"/>`; label(c.x + 14, c.y - 22, 'checkpoint', '#44ff88', 8, 'start', 7); }
dot(L.playerStart.x + 16, L.playerStart.y + 30, '#9ff4ff', 3.6); label(L.playerStart.x + 16, L.playerStart.y + 30, 'spawn', '#9ff4ff', -8);
for (const g of L.gates) { svg += `<rect x="${sx(g.x)}" y="${sy(g.y)}" width="${g.w * K + 1}" height="${g.h * K}" fill="#ffffff"/>`; label(g.x + 16, g.y, `EXIT GATE (${g.required})`, '#ffffff', -6); }
// gaps with no beat longer than 600 px (sources, NPCs, checkpoints, gate)
const beats = [...L.sources.map(s => s.x), ...L.npcs.map(n => n.x), ...L.gates.map(g => g.x), ...L.checkpoints.map(c => c.x), L.playerStart.x].sort((a, b) => a - b);
const gaps = []; for (let i = 1; i < beats.length; i++) if (beats[i] - beats[i - 1] > 600) gaps.push([beats[i - 1], beats[i]]);
for (const [a, b] of gaps) {
  const y = sy(R * TILE) + 14;
  svg += `<line x1="${sx(a)}" x2="${sx(b)}" y1="${y}" y2="${y}" stroke="#ff7a8a" stroke-width="3"/>`;
  svg += `<text x="${(sx(a) + sx(b)) / 2}" y="${y + 12}" fill="#ff7a8a" font-size="8" text-anchor="middle">${b - a} px with nothing to do (rule: no more than 600)</text>`;
}
svg += `<text x="${W - PADL}" y="${H - 8}" fill="#6f7fae" font-size="7.5" text-anchor="end">Drawn from level1.json: ${C} x ${R} tiles, 1 tile = 32 px. Numbers across the top are world pixels. Dashed orange = ladder, purple strip = one-way platform.</text>`;
svg += `</svg>`;
// ---------- numbers from the real file ----------
const charged = L.sources.filter(s => !s.uncharged), totalCharge = charged.reduce((a, s) => a + s.charge, 0);
const exit = L.gates.find(g => g.isExit);
const lines = (JSON.stringify(L).match(/"text":\s*"[^"]*"/g) || []).length;
const facts = { cols: C, rows: R, sources: L.sources.length, totalCharge, exitCost: exit.required, npcs: L.npcs.length, checkpoints: L.checkpoints.length, lines, decorations: deco.length, gaps };
const OUTDIR = ROOT + '_dev/tools/level1_status/out/'; fs.mkdirSync(OUTDIR, { recursive: true });
// ---------- the document ----------
const tr = (cells, tag = 'td') => `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
const table = (head, rows) => `<table>${tr(head, 'th')}${rows.map(r => tr(r)).join('')}</table>`;
const DONE = '<span class="done">DONE</span>', OPEN = '<span class="todo">OPEN</span>', CHIEF = '<span class="chief">NEEDS CHIEF</span>', WAIT = '<span class="wait">WAITING</span>', KIRO = '<span class="kiro">KIRO</span>';
const css = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const body = fs.readFileSync(new URL('./content.html', import.meta.url), 'utf8');
const fill = (t) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => ({ MAP: svg, ...facts, gapText: gaps.map(([a, b]) => `${a} to ${b}`).join(', ') || 'none', DONE, OPEN, CHIEF, WAIT, KIRO }[k] ?? `{{${k}}}`));
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>OVERCHARGE: Level 1 Roadmap</title><style>${css}</style></head><body>${fill(body)}</body></html>`;
fs.writeFileSync(OUTDIR + 'OVERCHARGE_Level1_Roadmap.html', html);
console.log('wrote _dev/tools/level1_status/out/OVERCHARGE_Level1_Roadmap.html', html.length, JSON.stringify(facts));
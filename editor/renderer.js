// renderer.js — draws the level onto a canvas. Reads state only, never mutates.
// Renders: level extents outline, terrain tiles, grid overlay, decorations,
// gameplay object markers (sources/gates/switches/enemies/checkpoints), playerStart.
//
// Any level JSON conforming to SCHEMA.md renders correctly. No Level-1 assumptions.

import { state, TILE_SIZE, levelRows, levelPixelWidth, levelPixelHeight, worldToScreen } from './state.js';

const imgCache = new Map();  // path → HTMLImageElement (lazy loaded)
function getImage(path) {
  let img = imgCache.get(path);
  if (!img) {
    img = new Image();
    img.src = path;
    imgCache.set(path, img);
  }
  return img;
}

// Marker colors for gameplay object types
const MARKER = {
  source:     '#ffee00',
  gate:       '#44ccff',
  exitGate:   '#ff44ff',
  barrier:    '#ff8800',
  switch:     '#ff8800',
  enemy:      '#ff2244',
  checkpoint: '#44ff88',
  playerStart:'#ffffff',
};

export function render(ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  const c = state.camera;

  // Clear
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, w, h);

  if (!state.level) {
    ctx.fillStyle = '#556';
    ctx.font = '14px monospace';
    ctx.fillText('No level loaded', 12, 24);
    return;
  }

  ctx.imageSmoothingEnabled = false;

  // Level extents outline
  const lw = levelPixelWidth(), lh = levelPixelHeight();
  const originScreen = worldToScreen(0, 0);
  const extentScreen = worldToScreen(lw, lh);
  ctx.strokeStyle = '#1a2030';
  ctx.lineWidth = 1;
  ctx.strokeRect(originScreen.x, originScreen.y, extentScreen.x - originScreen.x, extentScreen.y - originScreen.y);

  // Level background fill (subtle so we can see grid vs void)
  ctx.fillStyle = '#0e131e';
  ctx.fillRect(originScreen.x, originScreen.y, extentScreen.x - originScreen.x, extentScreen.y - originScreen.y);

  // Terrain tiles
  const L = state.level;
  const rows = levelRows();
  const tsz = TILE_SIZE * c.zoom;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < L.cols; col++) {
      const v = L.tiles[r * L.cols + col];
      if (v === 0) continue;
      const p = worldToScreen(col * TILE_SIZE, r * TILE_SIZE);
      if (p.x + tsz < 0 || p.x > w || p.y + tsz < 0 || p.y > h) continue;   // cull
      ctx.fillStyle = v === 1 ? '#2a3448' : (v === 2 ? '#3a4d6a' : '#552');
      ctx.fillRect(p.x, p.y, tsz, tsz);
      // Rooftop edge indicator (top-most row of a stack)
      const above = r > 0 ? L.tiles[(r - 1) * L.cols + col] : 0;
      if (above !== 1) {
        ctx.fillStyle = '#ff44aa';
        ctx.fillRect(p.x, p.y, tsz, Math.max(2, 2 * c.zoom));
      }
    }
  }

  // Decorations
  if (Array.isArray(L.decorations)) {
    for (const d of L.decorations) {
      const p = worldToScreen(d.x, d.y);
      const dw = d.w * c.zoom, dh = d.h * c.zoom;
      if (p.x + dw < 0 || p.x > w || p.y + dh < 0 || p.y > h) continue;
      const img = getImage(d.src);
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, p.x, p.y, dw, dh);
      } else {
        ctx.strokeStyle = '#666';
        ctx.strokeRect(p.x, p.y, dw, dh);
      }
    }
  }

  // Grid overlay
  if (state.showGrid && c.zoom >= 0.4) {
    ctx.strokeStyle = 'rgba(120,140,180,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startCol = Math.max(0, Math.floor((c.x) / TILE_SIZE));
    const endCol   = Math.min(L.cols, Math.ceil((c.x + w / c.zoom) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor((c.y) / TILE_SIZE));
    const endRow   = Math.min(rows, Math.ceil((c.y + h / c.zoom) / TILE_SIZE));
    for (let col = startCol; col <= endCol; col++) {
      const p = worldToScreen(col * TILE_SIZE, 0);
      const p2 = worldToScreen(col * TILE_SIZE, rows * TILE_SIZE);
      ctx.moveTo(p.x + 0.5, p.y); ctx.lineTo(p2.x + 0.5, p2.y);
    }
    for (let r = startRow; r <= endRow; r++) {
      const p  = worldToScreen(0, r * TILE_SIZE);
      const p2 = worldToScreen(L.cols * TILE_SIZE, r * TILE_SIZE);
      ctx.moveTo(p.x, p.y + 0.5); ctx.lineTo(p2.x, p2.y + 0.5);
    }
    ctx.stroke();
  }

  // Gameplay object markers — drawn generically from arrays. Any new object
  // type Aki adds just needs to appear in the level JSON; add a color to MARKER.
  _drawMarkers(ctx, L.sources,     'source',     'C');
  _drawMarkers(ctx, L.switches,    'switch',     'S');
  _drawMarkers(ctx, L.checkpoints, 'checkpoint', 'CP');
  _drawGates(ctx, L.gates);
  _drawEnemies(ctx, L.enemies);
  _drawPlayerStart(ctx, L.playerStart);
}

function _drawMarkers(ctx, arr, kind, glyph) {
  if (!Array.isArray(arr)) return;
  const color = MARKER[kind] || '#888';
  for (const o of arr) {
    const p = worldToScreen(o.x, o.y);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    const s = 14;
    ctx.fillRect(p.x - s/2, p.y - s/2, s, s);
    ctx.strokeRect(p.x - s/2, p.y - s/2, s, s);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, p.x, p.y);
    if (o.label || o.id) {
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.font = '10px monospace';
      ctx.fillText(o.label || o.id, p.x + s/2 + 3, p.y);
    }
  }
}
function _drawGates(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const c = state.camera;
  for (const g of arr) {
    const p = worldToScreen(g.x, g.y);
    const color = g.isExit ? MARKER.exitGate : (g.blockOnly ? MARKER.barrier : MARKER.gate);
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, g.w * c.zoom, g.h * c.zoom);
    ctx.fillStyle = color; ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(g.label || g.id || 'GATE', p.x + 2, p.y + 2);
  }
}
function _drawEnemies(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const c = state.camera;
  for (const e of arr) {
    const p = worldToScreen(e.x, e.y);
    ctx.fillStyle = MARKER.enemy;
    ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
    if (e.patrolLeft != null && e.patrolRight != null) {
      const y = worldToScreen(0, e.y).y;
      const pl = worldToScreen(e.patrolLeft,  0).x;
      const pr = worldToScreen(e.patrolRight, 0).x;
      ctx.strokeStyle = 'rgba(255,80,110,0.5)';
      ctx.setLineDash([4,3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pr, y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = MARKER.enemy; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(e.type || '?', p.x + 8, p.y - 2);
  }
}
function _drawPlayerStart(ctx, ps) {
  if (!ps) return;
  const p = worldToScreen(ps.x, ps.y);
  ctx.fillStyle = MARKER.playerStart;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + 14, p.y + 7);
  ctx.lineTo(p.x, p.y + 14);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('SPAWN', p.x + 18, p.y + 12);
}

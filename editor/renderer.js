// renderer.js — draws the level onto a canvas. Reads state only, never mutates.
// Renders: level extents outline, terrain tiles, grid overlay, decorations,
// gameplay object markers (sources/gates/switches/enemies/checkpoints), playerStart,
// selection highlights, marquee rect.
//
// Any level JSON conforming to SCHEMA.md renders correctly. No Level-1 assumptions.

import { state, TILE_SIZE, levelRows, levelPixelWidth, levelPixelHeight,
         worldToScreen, tileIsSolid, tileAssetIdFor } from './state.js';
import * as Selection from './selection.js';

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
  selection:  '#ffee00',
};

// Terrain tile PNG lookup — keyed by ASSET ID, not by array position, so a
// new manifest tile inserted at any position does not renumber saved cells.
// Missing images are looked up on demand each frame (getImage caches).
function terrainImageForId(id) {
  const m = state.manifest;
  if (!m || !Array.isArray(m.items) || !id) return null;
  const asset = m.items.find(it => it && it.id === id && it.category === 'tile');
  if (!asset) return null;
  return getImage(asset.path);
}
// (Hash-based tile variety removed per Chief. Every cell renders EXACTLY the
// asset bound to its stored tile value via TILE_ID_REGISTRY in state.js.)

export function render(ctx, canvas) {
  const w = canvas.width, h = canvas.height;
  const c = state.camera;

  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, w, h);

  if (!state.level) {
    ctx.fillStyle = '#556';
    ctx.font = '14px monospace';
    ctx.fillText('No level loaded', 12, 24);
    return;
  }

  ctx.imageSmoothingEnabled = false;

  // Level extents
  const lw = levelPixelWidth(), lh = levelPixelHeight();
  const originScreen = worldToScreen(0, 0);
  const extentScreen = worldToScreen(lw, lh);
  ctx.fillStyle = '#0e131e';
  ctx.fillRect(originScreen.x, originScreen.y, extentScreen.x - originScreen.x, extentScreen.y - originScreen.y);
  ctx.strokeStyle = '#1a2030';
  ctx.lineWidth = 1;
  ctx.strokeRect(originScreen.x, originScreen.y, extentScreen.x - originScreen.x, extentScreen.y - originScreen.y);

  // Terrain tiles — draw with actual tile PNG when available; fallback to
  // solid color. NOTE: the pink rooftop-edge highlight previously drawn here
  // was removed — it was misleading because it appeared on every top-of-stack
  // tile, not just intentional rooftops.
  const L = state.level;
  const rows = levelRows();
  const tsz = TILE_SIZE * c.zoom;
  // Small per-frame cache: tile value → resolved Image. Avoids repeating
  // the manifest-scan for every cell when the level uses one tile mostly.
  const imgCache = new Map();
  const resolveTileImg = (v) => {
    if (imgCache.has(v)) return imgCache.get(v);
    const id = tileAssetIdFor(v);
    const img = id ? terrainImageForId(id) : null;
    imgCache.set(v, img);
    return img;
  };
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < L.cols; col++) {
      const v = L.tiles[r * L.cols + col];
      if (v === 0) continue;
      const p = worldToScreen(col * TILE_SIZE, r * TILE_SIZE);
      if (p.x + tsz < 0 || p.x > w || p.y + tsz < 0 || p.y > h) continue;
      const img = tileIsSolid(v) ? resolveTileImg(v) : null;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0, 16, 16, p.x, p.y, tsz, tsz);
      } else {
        ctx.fillStyle = tileIsSolid(v) ? '#2a3448' : (v === 2 ? '#3a4d6a' : '#552');
        ctx.fillRect(p.x, p.y, tsz, tsz);
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
        const rot = d.rotation || 0;
        if (rot === 0) {
          ctx.drawImage(img, p.x, p.y, dw, dh);
        } else {
          // Rotate around visual-bbox center. Source draw dims match the
          // sprite's NATIVE orientation: at 90/270 that's (bbox.h, bbox.w).
          const rad = rot * Math.PI / 180;
          const isHoriz = (rot % 180) === 0;   // 0 or 180
          const srcDW = (isHoriz ? d.w : d.h) * c.zoom;
          const srcDH = (isHoriz ? d.h : d.w) * c.zoom;
          ctx.save();
          ctx.imageSmoothingEnabled = false;   // preserve pixel-art crispness
          ctx.translate(p.x + dw / 2, p.y + dh / 2);
          ctx.rotate(rad);
          ctx.drawImage(img, -srcDW / 2, -srcDH / 2, srcDW, srcDH);
          ctx.restore();
        }
      } else {
        ctx.strokeStyle = '#666';
        ctx.strokeRect(p.x, p.y, dw, dh);
      }
    }
  }

  // Grid overlay (thin cyan lines)
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

  // Gameplay object markers
  _drawMarkers(ctx, L.sources,     'source',     'C');
  _drawMarkers(ctx, L.switches,    'switch',     'S');
  _drawMarkers(ctx, L.checkpoints, 'checkpoint', 'CP');
  _drawGates(ctx, L.gates);
  _drawEnemies(ctx, L.enemies);
  _drawPlayerStart(ctx, L.playerStart);

  // Selection highlights — decorations, gameplay markers, tiles, playerStart.
  // Uses the same visual language (yellow dashed outline) for every kind so
  // the user knows immediately what's selected.
  if (state.selection) {
    const drawOutline = (rect) => {
      if (!rect) return;
      const p = worldToScreen(rect.x, rect.y);
      const rw = rect.w * c.zoom, rh = rect.h * c.zoom;
      ctx.strokeStyle = MARKER.selection;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(p.x - 1, p.y - 1, rw + 2, rh + 2);
      ctx.setLineDash([]);
    };

    // Decorations
    for (const d of state.selection.decorations) drawOutline({ x: d.x, y: d.y, w: d.w, h: d.h });

    // Gameplay markers — hit-box footprints match the visible marker size
    // (see selection.js::boundingRect for the source of truth).
    for (const o of state.selection.sources)     drawOutline({ x: o.x - 7, y: o.y - 7, w: 14, h: 14 });
    for (const o of state.selection.switches)    drawOutline({ x: o.x - 7, y: o.y - 7, w: 14, h: 14 });
    for (const o of state.selection.checkpoints) drawOutline({ x: o.x - 7, y: o.y - 7, w: 14, h: 14 });
    for (const o of state.selection.enemies)     drawOutline({ x: o.x - 6, y: o.y - 6, w: 12, h: 12 });
    for (const o of state.selection.gates)       drawOutline({ x: o.x,     y: o.y,     w: o.w, h: o.h });

    // playerStart triangle bounds
    if (state.selection.playerStart && L.playerStart) {
      drawOutline({ x: L.playerStart.x, y: L.playerStart.y, w: 14, h: 14 });
    }

    // Selected tiles — yellow fill overlay (not just outline, so they're
    // distinguishable from painted-but-unselected tiles)
    for (const key of state.selection.tiles) {
      const [col, row] = key.split(',').map(Number);
      const p = worldToScreen(col * TILE_SIZE, row * TILE_SIZE);
      ctx.fillStyle = 'rgba(255,238,0,0.30)';
      ctx.fillRect(p.x, p.y, tsz, tsz);
      ctx.strokeStyle = MARKER.selection;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, tsz - 1, tsz - 1);
    }
  }

  // Move handle — bright dot at top-center of selection bounding box.
  // Rendered in screen space so its size is constant across zoom. Not
  // saved to level JSON; game runtime never sees this.
  const handle = Selection.moveHandleScreen();
  if (handle) {
    // Thin connector line from bbox top down to handle so user sees the link
    const bb = Selection.selectedBoundingBox();
    if (bb) {
      const bboxTopMid = worldToScreen(bb.x + bb.w / 2, bb.y);
      ctx.strokeStyle = 'rgba(255,238,0,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(handle.sx, handle.sy + handle.r);
      ctx.lineTo(bboxTopMid.x, bboxTopMid.y - 1);
      ctx.stroke();
    }
    // The dot itself: bright yellow fill, dark outline for contrast on any background
    ctx.beginPath();
    ctx.arc(handle.sx, handle.sy, handle.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffee00';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
  }
  // Marquee rect (during marquee drag)
  if (state.marquee && state.marquee.active) {
    const m = state.marquee;
    const x = Math.min(m.startWX, m.curWX);
    const y = Math.min(m.startWY, m.curWY);
    const wRect = Math.abs(m.curWX - m.startWX);
    const hRect = Math.abs(m.curWY - m.startWY);
    const p = worldToScreen(x, y);
    const pw = wRect * c.zoom, ph = hRect * c.zoom;
    ctx.fillStyle = 'rgba(255,238,0,0.08)';
    ctx.fillRect(p.x, p.y, pw, ph);
    ctx.strokeStyle = MARKER.selection;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, pw - 1, ph - 1);
    ctx.setLineDash([]);
  }

  // Rectangle paint preview (during Rect tool drag).
  if (state.paintRect && state.paintRect.active) {
    const r = state.paintRect;
    const cLo = Math.min(r.startCol, r.endCol);
    const rLo = Math.min(r.startRow, r.endRow);
    const cHi = Math.max(r.startCol, r.endCol);
    const rHi = Math.max(r.startRow, r.endRow);
    const p = worldToScreen(cLo * TILE_SIZE, rLo * TILE_SIZE);
    const pw = (cHi - cLo + 1) * TILE_SIZE * c.zoom;
    const ph = (rHi - rLo + 1) * TILE_SIZE * c.zoom;
    ctx.fillStyle = 'rgba(102,255,150,0.20)';
    ctx.fillRect(p.x, p.y, pw, ph);
    ctx.strokeStyle = '#66ff96';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, pw - 1, ph - 1);
    // Cell count badge
    const count = (cHi - cLo + 1) * (rHi - rLo + 1);
    ctx.fillStyle = '#66ff96';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${cHi - cLo + 1}×${rHi - rLo + 1} = ${count}`, p.x + 4, p.y - 4);
  }

  // Placement-rejected flash — a fading red X + reason at the cursor world
  // position. Set by state.flashPlacementReject; auto-clears after 700ms.
  if (state.rejectFlash) {
    const rf = state.rejectFlash;
    const age = Date.now() - rf.at;
    const life = 700;
    const alpha = Math.max(0, 1 - age / life);
    if (alpha > 0) {
      const p = worldToScreen(rf.x, rf.y);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff3355';
      ctx.lineWidth = 3;
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y - r); ctx.lineTo(p.x + r, p.y + r);
      ctx.moveTo(p.x + r, p.y - r); ctx.lineTo(p.x - r, p.y + r);
      ctx.stroke();
      ctx.fillStyle = '#ff3355';
      ctx.font = 'bold 12px monospace';
      const msg = String(rf.msg || 'blocked');
      const tw = ctx.measureText(msg).width;
      ctx.fillRect(p.x - tw/2 - 4, p.y + r + 4, tw + 8, 16);
      ctx.fillStyle = '#0a0d14';
      ctx.fillText(msg, p.x - tw/2, p.y + r + 16);
      ctx.restore();
    }
  }
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

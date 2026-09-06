// renderer.js — draws the level onto a canvas. Reads state only, never mutates.
// Renders: level extents outline, terrain tiles, grid overlay, decorations,
// gameplay object markers (sources/gates/switches/enemies/checkpoints), playerStart,
// selection highlights, marquee rect.
//
// Any level JSON conforming to SCHEMA.md renders correctly. No Level-1 assumptions.

import { state, TILE_SIZE, levelRows, levelPixelWidth, levelPixelHeight,
         worldToScreen, tileIsSolid, tileAssetIdFor, getTileRotation } from './state.js';
import * as Selection from './selection.js';

const imgCache = new Map();  // path → HTMLImageElement (lazy loaded)
function getImage(path) {
  let img = imgCache.get(path);
  if (!img) {
    img = new Image();
    // Wire the repaint trigger BEFORE setting src so the load event is never missed,
    // even if the image is in the browser cache and fires synchronously.
    img.addEventListener('load', () => {
      window.dispatchEvent(new Event('_editorRepaint'));
    }, { once: true });
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
      const rot = getTileRotation(col, r);
      if (img && img.complete && img.naturalWidth > 0) {
        if (rot === 0) {
          ctx.drawImage(img, 0, 0, 16, 16, p.x, p.y, tsz, tsz);
        } else {
          // Rotate the tile around its center. 16×16 source keeps pixel
          // crispness on 90° turns.
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.translate(p.x + tsz / 2, p.y + tsz / 2);
          ctx.rotate(rot * Math.PI / 180);
          ctx.drawImage(img, 0, 0, 16, 16, -tsz / 2, -tsz / 2, tsz, tsz);
          ctx.restore();
        }
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
    // Source: outline the 64×64 sprite footprint (matches _drawSources render area)
    for (const o of state.selection.sources)     drawOutline({ x: o.x - 18, y: o.y - 36, w: 64, h: 64 });
    // Switch + Enemy: top-left hitbox
    for (const o of state.selection.switches)    drawOutline({ x: o.x,      y: o.y,      w: 22,            h: 22 });
    for (const o of state.selection.checkpoints) drawOutline({ x: o.x - 11, y: o.y - 11, w: 22,            h: 22 });
    for (const o of state.selection.enemies)     drawOutline({ x: o.x,      y: o.y,      w: o.w || 22,     h: o.h || 24 });
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

  // Magnetic snap indicator — bright green edge line, drawn while a snap
  // is ACTIVE. Payload: { edgeAxis: 'x'|'y', edgeVal, y0/y1 for x-axis,
  // x0/x1 for y-axis }. Cleared by tools when snap disengages.
  if (state.snapIndicator) {
    const si = state.snapIndicator;
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur  = 6;
    ctx.lineWidth   = 2;
    if (si.edgeAxis === 'x') {
      const a = worldToScreen(si.edgeVal, si.y0);
      const b = worldToScreen(si.edgeVal, si.y1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 4);
      ctx.lineTo(b.x, b.y + 4);
      ctx.stroke();
      // tiny arrow caps
      ctx.beginPath();
      ctx.moveTo(a.x - 5, a.y - 4); ctx.lineTo(a.x + 5, a.y - 4);
      ctx.moveTo(b.x - 5, b.y + 4); ctx.lineTo(b.x + 5, b.y + 4);
      ctx.stroke();
    } else if (si.edgeAxis === 'y') {
      const a = worldToScreen(si.x0, si.edgeVal);
      const b = worldToScreen(si.x1, si.edgeVal);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(a.x - 4, a.y);
      ctx.lineTo(b.x + 4, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Gameplay object renderers ─────────────────────────────────────────────

// Source (generator): render the 64×64 sprite matching the game's own draw call.
// o.x, o.y = TOP-LEFT of the 28×28 hitbox (confirmed from ElectricalSource runtime).
// Sprite: 64px wide, centered on hitbox centre-X; bottom aligned with hitbox bottom.
// Sprite TL in world: (o.x - 18, o.y - 36).
function _drawSources(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const z = state.camera.zoom;
  for (const o of arr) {
    // spriteY: -34 = -(62-28). 62 because sprite has 1px transparent bottom row;
    // visual feet at row 62, so dY+62 = o.y+h = o.y+28 → dY = o.y-34.
    const spriteX = o.x - 18, spriteY = o.y - 34;
    const sp = worldToScreen(spriteX, spriteY);
    const sw = 64 * z, sh = 64 * z;
    const img = getImage('assets/sprites/generator 1/frame_000.png');
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, sp.x, sp.y, sw, sh);
    } else {
      // Fallback: yellow hitbox rect while sprite loads (triggers redraw next frame)
      const hp = worldToScreen(o.x, o.y);
      ctx.fillStyle = MARKER.source;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(hp.x, hp.y, 28 * z, 28 * z);
      ctx.globalAlpha = 1;
      // Trigger repaint once image loads
      img.onload = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('_editorRepaint')); };
    }
    // Label + charge count above sprite
    const lp = worldToScreen(o.x + 14, spriteY);
    const fontSize = Math.max(8, Math.round(10 * z));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffee00';
    ctx.fillText(o.label || 'GEN', lp.x, lp.y - 2);
    if (o.charge != null) {
      ctx.fillStyle = '#aa8800';
      ctx.font = `${Math.max(7, Math.round(9 * z))}px monospace`;
      ctx.fillText('\u26a1' + o.charge, lp.x, lp.y - 2 - fontSize - 1);
    }
  }
}

// Gate: render the 64×128 gate sprite (gate_closed.png, no transparent rows).
// Sprite anchor: horizontally centred on hitbox, bottom aligned to hitbox bottom.
// Type-specific colour tint overlaid on the sprite so GATE/EXIT/BARRIER are
// visually distinct despite sharing the same art.
//   GATE    → cyan  (#44ccff)
//   EXIT    → magenta (#ff44ff) — the gate that ends the level
//   BARRIER → orange (#ff8800) — switch-only, player cannot charge directly
function _drawGates(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const z = state.camera.zoom;
  const SPRITE_W = 64, SPRITE_H = 128;
  for (const g of arr) {
    const gcx = g.x + g.w / 2;
    const spriteX = gcx - SPRITE_W / 2;
    const spriteY = (g.y + g.h) - SPRITE_H;   // bottom-aligned, no padding offset
    const sp = worldToScreen(spriteX, spriteY);
    const sw = SPRITE_W * z, sh = SPRITE_H * z;
    const color = g.isExit ? MARKER.exitGate : (g.blockOnly ? MARKER.barrier : MARKER.gate);

    const img = getImage('assets/objects/gate_closed.png');
    ctx.imageSmoothingEnabled = false;
    if (img.complete && img.naturalWidth > 0) {
      // Sprite
      ctx.drawImage(img, sp.x, sp.y, sw, sh);
      // Colour tint so types are distinguishable (multiply-like: overlay at low alpha)
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      ctx.fillRect(sp.x, sp.y, sw, sh);
      ctx.globalAlpha = 1;
    } else {
      // Hatched fallback (image is loading — getImage already wired the repaint)
      const hp = worldToScreen(g.x, g.y);
      const gw = g.w * z, gh = g.h * z;
      ctx.fillStyle = color; ctx.globalAlpha = 0.15;
      ctx.fillRect(hp.x, hp.y, gw, gh);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath(); ctx.rect(hp.x, hp.y, gw, gh); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
      const step = Math.max(8, 14 * z);
      for (let i = -gh; i < gw + gh; i += step) {
        ctx.beginPath(); ctx.moveTo(hp.x + i, hp.y); ctx.lineTo(hp.x + i + gh, hp.y + gh); ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.strokeRect(hp.x, hp.y, gw, gh);
    }
    // Type badge + label + required charge below sprite
    const lp = worldToScreen(gcx, g.y + g.h);
    const tag = g.isExit ? 'EXIT' : (g.blockOnly ? 'BARRIER' : 'GATE');
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(9, Math.round(10 * z))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(tag + (g.label && g.label !== tag ? ' · ' + g.label : ''), lp.x, lp.y + 3);
    if (g.required != null) {
      ctx.font = `${Math.max(8, Math.round(9 * z))}px monospace`;
      ctx.fillText('\u26a1' + g.required, lp.x, lp.y + 3 + Math.max(11, 12 * z));
    }
  }
}

// Switches: replicate the game's orange glow-rect with inner fill.
// Switch x,y = top-left, 22×22 hitbox (matches Switch runtime).
function _drawSwitches(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const z = state.camera.zoom;
  for (const o of arr) {
    const p  = worldToScreen(o.x, o.y);
    const sw = 22 * z, sh = 22 * z;
    // Outer glow border
    ctx.strokeStyle = MARKER.switch; ctx.lineWidth = Math.max(1.5, 2 * z);
    ctx.shadowBlur  = Math.max(6, 8 * z); ctx.shadowColor = MARKER.switch;
    ctx.strokeRect(p.x, p.y, sw, sh);
    ctx.shadowBlur = 0;
    // Inner fill
    ctx.fillStyle = 'rgba(255,140,0,0.55)';
    ctx.fillRect(p.x + 2, p.y + 2, sw - 4, sh - 4);
    // "SW" glyph
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(8, Math.round(9 * z))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SW', p.x + sw / 2, p.y + sh / 2);
    // Label below
    if (o.label || o.id) {
      ctx.fillStyle = MARKER.switch;
      ctx.font = `${Math.max(7, Math.round(9 * z))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(o.label || o.id, p.x + sw / 2, p.y + sh + 2);
    }
    if (o.required != null) {
      ctx.fillStyle = '#aa5500';
      ctx.font = `${Math.max(7, Math.round(8 * z))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('\u26a1' + o.required, p.x + sw / 2, p.y + sh + 2 + Math.max(10, 11 * z));
    }
  }
}

// Checkpoints: green flag column (x,y = CENTRE of trigger zone).
function _drawCheckpoints(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const z = state.camera.zoom;
  for (const o of arr) {
    // Draw a vertical pole with a small flag at top
    const bx = o.x - 11, by = o.y - 11;
    const p  = worldToScreen(bx, by);
    const sw = 22 * z, sh = 22 * z;
    ctx.fillStyle = MARKER.checkpoint; ctx.globalAlpha = 0.3;
    ctx.fillRect(p.x, p.y, sw, sh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = MARKER.checkpoint; ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, sw, sh);
    ctx.fillStyle = MARKER.checkpoint;
    ctx.font = `bold ${Math.max(8, Math.round(9 * z))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('CP', p.x + sw / 2, p.y + sh / 2);
    if (o.label || o.id) {
      ctx.font = `${Math.max(7, Math.round(9 * z))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(o.label || o.id, p.x + sw / 2, p.y + sh + 2);
    }
  }
}

// Generic marker renderer — delegates to type-specific draws.
// Switch: x,y = top-left, 22×22.
// Checkpoint: x,y = CENTRE (runtime inconsistency, see LEVEL_SCHEMA.md §Checkpoint).
function _drawMarkers(ctx, arr, kind, glyph) {
  if (!Array.isArray(arr)) return;
  if (kind === 'source')     { _drawSources(ctx, arr);     return; }
  if (kind === 'switch')     { _drawSwitches(ctx, arr);    return; }
  if (kind === 'checkpoint') { _drawCheckpoints(ctx, arr); return; }
  // Fallback for any future kinds
  const z     = state.camera.zoom;
  const color = MARKER[kind] || '#888';
  const bw = 22, bh = 22;
  for (const o of arr) {
    const p = worldToScreen(o.x, o.y);
    const sw = bw * z, sh = bh * z;
    ctx.fillStyle = color; ctx.globalAlpha = 0.3;
    ctx.fillRect(p.x, p.y, sw, sh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, sw, sh);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(9, Math.round(10 * z))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(glyph, p.x + sw / 2, p.y + sh / 2);
  }
}

// Enemy: top-left hitbox rect + patrol range line.
function _drawEnemies(ctx, arr) {
  if (!Array.isArray(arr)) return;
  const z = state.camera.zoom;
  for (const e of arr) {
    const p  = worldToScreen(e.x, e.y);
    const ew = (e.w || 22) * z, eh = (e.h || 24) * z;
    ctx.fillStyle = MARKER.enemy; ctx.globalAlpha = 0.3;
    ctx.fillRect(p.x, p.y, ew, eh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = MARKER.enemy; ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, ew, eh);
    ctx.fillStyle = MARKER.enemy;
    ctx.font = `bold ${Math.max(9, Math.round(10 * z))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('E', p.x + ew / 2, p.y + eh / 2);
    if (e.patrolLeft != null && e.patrolRight != null) {
      const py = worldToScreen(0, e.y + (e.h || 24)).y;
      const pl = worldToScreen(e.patrolLeft,  0).x;
      const pr = worldToScreen(e.patrolRight, 0).x;
      ctx.strokeStyle = 'rgba(255,80,110,0.5)';
      ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pl, py); ctx.lineTo(pr, py); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = MARKER.enemy;
    ctx.font = `${Math.max(8, Math.round(9 * z))}px monospace`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(e.type || '?', p.x + ew + 2, p.y);
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

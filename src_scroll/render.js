// Canvas drawing utilities — pixel-art glow aesthetic

// ── Purple City tileset ───────────────────────────────────────────────────
// TILE_ID_REGISTRY — PERMANENT binding of stored tile-value → asset filename.
// MUST match editor/state.js TILE_ID_REGISTRY exactly. New tile variants
// ALWAYS append a new value. Never renumber. Never derive from array position.
const TILE_ID_REGISTRY = Object.freeze({
  10: 'tile_dark_a',
  11: 'tile_dark_b',
  12: 'tile_purple_a',
  13: 'tile_purple_b',
});
const TILE_DEFAULT_KEY = 'tile_dark_a';
// Preload the current registry entries. New keys added to the registry are
// picked up automatically on next module load.
const _pc = {};
Object.values(TILE_ID_REGISTRY).forEach(name => {
  const img = new Image();
  img.src = `assets/tilesets/purple_city/tiles/${name}.png`;
  _pc[name] = img;
});

// Window light palette — warm amber, hot amber, cool blue-white, cyan accent
const WIN_COLORS = ['#ffcc55', '#ffaa33', '#aaddff', '#44ffdd'];

// Deterministic hash from tile position — same lit/dark result every frame.
// Uses a fast integer mix to avoid Math.random().
function tileHash(tx, ty) {
  return (((tx * 2654435761) ^ (ty * 2246822519)) >>> 0) % 1000;
}

export function clear(ctx, w, h, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
}

// topOpen: true when the tile directly above is not solid.
//   → rooftop surface with neon glow edge
//   → false = building facade interior → draw windows
export function drawTile(ctx, tx, ty, T, type, topOpen = false, rot = 0) {
  const x = tx * T, y = ty * T;

  if (type === 2) {
    // One-way platform — thin neon ledge, no mass
    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#aa33ff';
    ctx.fillStyle   = '#1a0830';
    ctx.fillRect(x, y, T, 7);
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#cc44ff';
    ctx.fillStyle   = '#9922dd';
    ctx.fillRect(x, y, T, 2);
    ctx.restore();
    return;
  }

  // Solid tile: type === 1 (legacy default) OR type >= 10 (Chief-chosen variant)
  if (type !== 1 && type < 10) return;

  // ── Base tile texture — direct registry lookup ────────────────────────
  const texKey = (type === 1) ? TILE_DEFAULT_KEY
                              : (TILE_ID_REGISTRY[type] || TILE_DEFAULT_KEY);
  const img    = _pc[texKey];
  if (img.complete && img.naturalWidth > 0) {
    if (!rot) {
      // Tiles are true 16×16 as of Aki Batch 1 — full source blit, no crop.
      ctx.drawImage(img, 0, 0, 16, 16, x, y, T, T);
    } else {
      // Rotate around tile center. Editor stores rotation in degrees {0,90,180,270}.
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x + T / 2, y + T / 2);
      ctx.rotate(rot * Math.PI / 180);
      ctx.drawImage(img, 0, 0, 16, 16, -T / 2, -T / 2, T, T);
      ctx.restore();
    }
  } else {
    ctx.fillStyle = '#0d1520';
    ctx.fillRect(x, y, T, T);
  }
}

// NOTE: The old procedural overlay (parapet band + neon line for rooftops,
// amber/teal/cyan window grid for facades) has been removed. Aki's real
// 16×16 pixel-art tile PNGs already contain the visual detail those overlays
// used to simulate. Let the tile art render as-is.

export function drawGlowRect(ctx, x, y, w, h, fill, shadow, blur = 14) {
  ctx.save();
  ctx.shadowBlur  = blur;
  ctx.shadowColor = shadow;
  ctx.fillStyle   = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

export function drawGlowLine(ctx, x1, y1, x2, y2, color, lineW = 2, blur = 8) {
  ctx.save();
  ctx.shadowBlur  = blur;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineW;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function drawText(ctx, text, x, y, {
  size = 14, color = '#c8d8f0', align = 'left', glow = null, bold = false
} = {}) {
  ctx.save();
  ctx.font      = `${bold ? 'bold ' : ''}${size}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (glow) { ctx.shadowBlur = 14; ctx.shadowColor = glow; }
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Animated spark burst at (cx, cy)
export function drawSparks(ctx, cx, cy, t, color, count = 6, radius = 8) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + t * 4;
    const r     = radius * (0.6 + 0.4 * Math.sin(t * 7 + i * 1.3));
    const alpha = 0.5 + 0.5 * Math.sin(t * 9 + i);
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 6;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
  }
  ctx.restore();
}

// Arc-style lightning bolt between two points
export function drawLightningArc(ctx, x1, y1, x2, y2, color, t, segments = 6) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.shadowBlur  = 10;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 12);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segments; i++) {
    const t2     = i / segments;
    const mx     = x1 + (x2 - x1) * t2;
    const my     = y1 + (y2 - y1) * t2;
    const jitter = (Math.sin(t * 15 + i * 2.1) * 6);
    ctx.lineTo(mx + jitter, my + jitter);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

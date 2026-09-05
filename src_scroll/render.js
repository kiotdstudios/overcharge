// Canvas drawing utilities — pixel-art glow aesthetic

// ── Purple City tileset ───────────────────────────────────────────────────────
// Load all tile textures for visual variety across the building facade.
const _pc = {};
['tile_dark_a', 'tile_dark_b', 'tile_purple_a', 'tile_purple_b'].forEach(name => {
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
export function drawTile(ctx, tx, ty, T, type, topOpen = false) {
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

  if (type !== 1) return;

  // ── Base tile texture ──────────────────────────────────────────────────────
  // Alternate between two dark textures using position — breaks up repetition.
  const texKey = ((tx + ty) % 2 === 0) ? 'tile_dark_a' : 'tile_dark_b';
  const img    = _pc[texKey];
  if (img.complete && img.naturalWidth > 0) {
    // Tiles are true 16×16 as of Aki Batch 1 — full source blit, no crop.
    // Destination remains exactly one T-sized grid cell.
    ctx.drawImage(img, 0, 0, 16, 16, x, y, T, T);
  } else {
    ctx.fillStyle = '#0d1520';
    ctx.fillRect(x, y, T, T);
  }

  if (topOpen) {
    // ── Rooftop tile ─────────────────────────────────────────────────────────
    // Parapet band: slightly darker lip at the exposed top edge
    ctx.fillStyle = '#12102a';
    ctx.fillRect(x, y, T, 5);

    // Neon glow surface line — the signature cyberpunk rooftop edge
    ctx.save();
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#9933dd';
    ctx.fillStyle   = '#cc55ff';
    ctx.fillRect(x, y, T, 2);
    ctx.restore();

  } else {
    // ── Facade tile — building window grid ───────────────────────────────────
    // Each tile = one floor of the building. Two windows per floor.
    //
    // Layout within 32×32 tile:
    //   y+0  to y+3  : ceiling band (part of floor above)
    //   y+3  to y+25 : window zone (22 px tall)
    //   y+25 to y+32 : floor slab (7 px — concrete divider between floors)
    //
    //   x+4  to x+13 : left window  (9 px wide)
    //   x+18 to x+27 : right window (9 px wide)
    //   gap between  : 5 px wall column

    const hash    = tileHash(tx, ty);
    const lit     = (hash % 10) > 3;           // ~60 % of windows lit
    const dark2   = (hash % 10) === 0;          // ~10 % fully dark (off at night)

    // Floor slab — dark concrete line at tile bottom
    ctx.fillStyle = '#090c14';
    ctx.fillRect(x, y + 25, T, 7);

    if (lit && !dark2) {
      const colorIdx = hash % WIN_COLORS.length;
      const color    = WIN_COLORS[colorIdx];
      // Slight per-tile brightness variation
      const alpha    = 0.55 + (hash % 25) / 100;   // 0.55 – 0.80

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur  = 5;
      ctx.shadowColor = color;
      ctx.fillStyle   = color;
      ctx.fillRect(x + 4,  y + 3, 9, 22);   // left pane
      ctx.fillRect(x + 18, y + 3, 9, 22);   // right pane
      ctx.restore();
    } else {
      // Unlit / off window — very dark recess
      ctx.fillStyle = '#05060d';
      ctx.fillRect(x + 4,  y + 3, 9, 22);
      ctx.fillRect(x + 18, y + 3, 9, 22);
    }
  }
}

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

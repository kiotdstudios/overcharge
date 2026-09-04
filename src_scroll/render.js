// Canvas drawing utilities — pixel-art glow aesthetic

// ── Purple City tileset ───────────────────────────────────────────────────────
// Individual 16×16 PNGs drawn at 32×32 (nearest-neighbor, no blur).
const _pc = {};
['tile_dark_a', 'tile_purple_a'].forEach(name => {
  const img = new Image();
  img.src = `assets/tilesets/purple_city/tiles/${name}.png`;
  _pc[name] = img;
});

export function clear(ctx, w, h, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
}

// topOpen: true when the tile directly above is not solid — draws neon surface edge
export function drawTile(ctx, tx, ty, T, type, topOpen = false) {
  const x = tx * T, y = ty * T;

  if (type === 2) {
    // One-way platform — purple city neon ledge
    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#aa33ff';
    ctx.fillStyle   = '#1a0830';
    ctx.fillRect(x, y, T, 7);       // dark body
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#cc44ff';
    ctx.fillStyle   = '#9922dd';
    ctx.fillRect(x, y, T, 2);       // bright neon lip
    ctx.restore();
    return;
  }

  if (type === 1) {
    const img = _pc['tile_dark_a'];
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, 16, 16, x, y, T, T);
    } else {
      ctx.fillStyle = '#0d1520';
      ctx.fillRect(x, y, T, T);
    }

    // Neon top-surface edge on exposed tiles
    if (topOpen) {
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#8833cc';
      ctx.fillStyle   = '#aa44ee';
      ctx.fillRect(x, y, T, 2);
      ctx.restore();
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
    const t2   = i / segments;
    const mx   = x1 + (x2 - x1) * t2;
    const my   = y1 + (y2 - y1) * t2;
    const jitter = (Math.sin(t * 15 + i * 2.1) * 6);
    ctx.lineTo(mx + jitter, my + jitter);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

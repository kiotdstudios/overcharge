// Canvas drawing utilities — pixel-art glow aesthetic

// ── Tileset loader ────────────────────────────────────────────────
// concrete.png is a 128×128 sheet: 4 cols × 4 rows of 32×32 tiles.
// Tile positions used:
//   solid interior: col 2, row 1  (srcX=64, srcY=32)
//   top surface:    col 2, row 0  (srcX=64, srcY=0)
//   platform lip:   col 1, row 0  (srcX=32, srcY=0)
const _tileSheet = new Image();
_tileSheet.src = 'assets/tiles/concrete.png';
let   _tileReady = false;
_tileSheet.onload = () => { _tileReady = true; };

export function clear(ctx, w, h, bgColor) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
}

export function drawTile(ctx, tx, ty, T, type) {
  const x = tx * T, y = ty * T;
  if (type === 2) {
    // One-way platform: glowing ledge bar — never uses tileset, always clean
    ctx.save();
    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#1a6a9a';
    ctx.fillStyle   = '#0d2a40';
    ctx.fillRect(x, y, T, 7);       // dark body
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#44aaff';
    ctx.fillStyle   = '#1a8acc';
    ctx.fillRect(x, y, T, 2);       // bright top edge — the actual ledge surface
    ctx.restore();
    return;
  }
  if (!_tileReady) {
    ctx.fillStyle = '#131d2a';
    ctx.fillRect(x, y, T, T);
    return;
  }
  if (type === 1) {
    // Solid ground: interior tile then top-surface overlay
    ctx.drawImage(_tileSheet, 64, 32, 32, 32, x, y, T, T);
    ctx.drawImage(_tileSheet, 64,  0, 32, 32, x, y, T, T);
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

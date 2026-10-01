// source-visuals.js — Shared world-space source geometry and art for runtime and Builder.
// sourceBox()  — canonical bounding rect for any source kind (used by selection + draw)
// drawHvac()   — HVAC unit renderer (kind:'hvac')
// drawLight()  — Street-lamp renderer (kind:'light')
// drawLightPool() — Light glow cone
const images = new Map();
function image(path) {
  if (!images.has(path)) {
    const img = new Image();
    img.addEventListener('load', () => {
      if (typeof window !== 'undefined' && window.dispatchEvent)
        window.dispatchEvent(new Event('_editorRepaint'));
    });
    img.src = path;
    images.set(path, img);
  }
  return images.get(path);
}

export function sourceBox(source) {
  // Prop sources (CHIEF 2026-09-26) carry their own art size, so geometry is derived from
  // the source rather than hardcoded per kind. Anchored so the art's BOTTOM sits on the
  // hitbox bottom (y + h) and it is horizontally centred on the hitbox — same contract the
  // generator uses, which is what makes a 192px streetlight and a 64px camera both stand on
  // the floor instead of floating by their own height.
  if (source.kind === 'prop') {
    const w = source.artW || 64, h = source.artH || 64;
    // Streetlight frames are 444px canvases with 11px below the visible base.
    // Keep legacy JSON grounded without changing its source hitbox or coordinates.
    const pad = /\/streetlight\/$/.test(source.sprite || '') ? h * (source.drained ? 12 : 11) / 444 : 0;
    return { dX: (source.x + (source.w || 28) / 2) - w / 2, dY: source.y + (source.h || 28) - h + pad, dW: w, dH: h };
  }
  if (source.kind === 'light') return { dX: source.x - 10, dY: source.y - 60, dW: 48, dH: 88 };
  return source.kind === 'hvac'
    ? { dX: source.x + 14 - 33, dY: source.y + 28 - 52, dW: 66, dH: 52 }
    : { dX: source.x - 18, dY: source.y - 34, dW: 64, dH: 64 };
}

export function lightIntensity(source) {
  return source.drained || source.charge <= 0
    ? 0
    : 0.2 + 0.8 * Math.min(1, source.charge / (source.max || source.charge));
}

export function drawLight(ctx, source) {
  const b = sourceBox(source), intensity = lightIntensity(source);
  ctx.save();
  ctx.fillStyle = '#393f52'; ctx.fillRect(source.x + 10, b.dY + 12, 7, 76);
  ctx.fillStyle = '#768392'; ctx.fillRect(source.x + 10, b.dY + 12, 2, 76);
  const img = image('assets/tilesets/purple_rooftop/tiles/rt_tile_light_a.png');
  if (img.complete && img.naturalWidth) ctx.drawImage(img, b.dX, b.dY, 48, 24);
  else { ctx.fillStyle = '#55516d'; ctx.fillRect(b.dX, b.dY, 48, 24); }
  ctx.fillStyle = intensity ? `rgba(255,221,150,${intensity})` : '#424554';
  ctx.fillRect(b.dX + 7, b.dY + 17, 34, 4);
  ctx.fillStyle = '#12232d'; ctx.fillRect(source.x + 3, source.y + 4, 22, 20);
  ctx.strokeStyle = '#9ec5c9'; ctx.strokeRect(source.x + 3, source.y + 4, 22, 20);
  ctx.fillStyle = intensity ? '#baf1d1' : '#586879'; ctx.fillRect(source.x + 11, source.y + 9, 5, 9);
  ctx.restore();
}

export function drawLightPool(ctx, source) {
  const intensity = lightIntensity(source);
  if (!intensity) return;
  const x = source.x + 14, y = source.y - 40;
  ctx.save();
  const glow = ctx.createRadialGradient(x, y, 3, x, y, 125);
  glow.addColorStop(0, `rgba(255,204,116,${0.24 * intensity})`);
  glow.addColorStop(1, 'rgba(255,204,116,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 125, y - 125, 250, 250);
  ctx.restore();
}

export function drawHvac(ctx, source) {
  const b = sourceBox(source);
  const img = image('assets/tilesets/purple_rooftop/props/hvac_a.png');
  const drained = source.drained ?? source.charge <= 0;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (img.complete && img.naturalWidth) ctx.drawImage(img, b.dX, b.dY, b.dW, b.dH);
  else { ctx.fillStyle = '#343348'; ctx.fillRect(b.dX, b.dY, b.dW, b.dH); }
  // Fan spokes rotate while active.
  ctx.strokeStyle = drained ? '#494963' : '#8b9faa';
  ctx.lineWidth = 1;
  for (const fy of [12, 38]) {
    ctx.save();
    ctx.translate(b.dX + 12, b.dY + fy);
    ctx.rotate(source._fanPhase || 0);
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, 2); ctx.stroke();
    }
    ctx.restore();
  }
  // Power indicator LED.
  ctx.fillStyle = drained ? '#526173' : '#8fffe0';
  ctx.shadowColor = '#60edc3'; ctx.shadowBlur = drained ? 0 : 7;
  ctx.fillRect(b.dX + 54, b.dY + 8, 4, 4);
  ctx.shadowBlur = 0;
  // Service socket.
  ctx.strokeStyle = '#8da4ac'; ctx.strokeRect(b.dX + 48, b.dY + 33, 10, 10);
  ctx.fillStyle = '#8da4ac'; ctx.fillRect(b.dX + 51, b.dY + 36, 2, 4);
  ctx.restore();
}

// drawSourceReaction() — AKI_17: shared "being drained" + "ran dry" feedback for every
// source kind (generic/generator, hvac, prop). Reads only _absorbT (existing per-tick
// "being absorbed" tell, set in ElectricalSource.drain) and _dryFlash (new one-shot timer
// set exactly on the active→drained transition) — never mutates source state, never touches
// charge/drained/position. Readable against the Night City Rail background: modest radii,
// no full-screen flash, no shake. Reduced-motion collapses the pulse to a steady low glow
// and the dry-flash ring to a flat low-alpha ring instead of animating outward.
export function drawSourceReaction(ctx, source, reducedMotion = false) {
  const absorbing = (source._absorbT || 0) > 0;
  const dryFlash  = source._dryFlash || 0;
  if (!absorbing && dryFlash <= 0) return;
  const b  = sourceBox(source);
  const cx = b.dX + b.dW / 2, cy = b.dY + b.dH / 2;

  if (absorbing) {
    const pulse = reducedMotion ? 0.35 : 0.35 + 0.25 * Math.sin((source._t || 0) * 18);
    const r     = Math.max(b.dW, b.dH) * 0.75;
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    glow.addColorStop(0, `rgba(140,220,255,${(0.5 * pulse).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(140,220,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
  }

  if (dryFlash > 0) {
    // 0.5s one-shot "settled" ring at the moment the source ran dry.
    const life = Math.min(1, dryFlash / 0.5);
    const r    = Math.max(b.dW, b.dH) * (reducedMotion ? 0.55 : 0.55 + 0.5 * (1 - life));
    ctx.save();
    ctx.globalAlpha  = reducedMotion ? 0.5 * life : 0.8 * life;
    ctx.strokeStyle  = '#ffb347';
    ctx.lineWidth    = 2;
    ctx.shadowBlur   = reducedMotion ? 0 : 10;
    ctx.shadowColor  = '#ffb347';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

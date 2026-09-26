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

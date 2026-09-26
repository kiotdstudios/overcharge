import { MAX_CHARGE, MAX_BANKED_PIPS } from './constants.js';

// Presentation only: the player remains the authority for charge and banking.
export function pipPulse(count, t, reduced = false) {
  count = Math.max(0, Math.min(MAX_BANKED_PIPS, Math.floor(count || 0)));
  const strength = count / MAX_BANKED_PIPS;
  const wave = reduced ? 0.5 : (1 - Math.cos(t * Math.PI * 2 * (0.45 + strength * 0.65))) / 2;
  return { count, wave, glow: count ? 3 + strength * 5 + wave * (3 + strength * 15) : 0,
    alpha: count ? 0.82 + wave * 0.18 : 0 };
}

let sprites;
export function chargeColors(fill) {
  const f = Math.max(0, Math.min(1, fill));
  // Hold a clear cyan at low charge, then blend into the banked-pip violet.
  const blend = Math.max(0, (f - .2) / .8);
  const mix = (a, b) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * blend)).join(',')})`;
  return { body: mix([20, 146, 182], [108, 64, 160]),
    bright: mix([44, 225, 255], [153, 81, 208]),
    edge: mix([175, 249, 255], [219, 181, 255]) };
}

// Integer horizontal/vertical segments keep the electrical filaments pixel crisp.
function sparkLine(ctx, x, y, length, seed, amplitude, color) {
  ctx.fillStyle = color;
  let lastY = y;
  for (let step = 0; step < length; step += 4) {
    const offset = Math.round(Math.sin((step + seed) * 1.73) * amplitude);
    const nextY = y + offset;
    ctx.fillRect(x + step, Math.min(lastY, nextY), 1, Math.abs(nextY - lastY) + 1);
    ctx.fillRect(x + step, nextY, Math.min(4, length - step), 1);
    lastY = nextY;
  }
}

function drawElectricity(ctx, count, t, reduced) {
  if (!count) return;
  const strength = count / MAX_BANKED_PIPS;
  const phase = reduced ? 0 : Math.floor(t * (7 + count));
  ctx.save();
  ctx.shadowColor = '#ac75ef'; ctx.shadowBlur = reduced ? 0 : 3 + count * 2;
  ctx.globalAlpha = reduced ? .28 : .45 + strength * .35;
  // A live bus beneath the bank grows to the last charged pip.
  sparkLine(ctx, 10, 50, (count - 1) * 52 + 28, phase, reduced ? 0 : 1 + strength * 2, '#ac75ef');
  for (let i = 0; i < count; i++) {
    const cx = i * 52 + 24;
    // Arcs jump between charged neighbours, never through the count label.
    if (i > 0) sparkLine(ctx, cx - 34, 22, 17, phase + i * 7, reduced ? 0 : 2 + count, '#aff9ff');
    if (!reduced) {
      const cycle = (t * (.45 + strength * .8) + i * .23) % 1;
      const envelope = Math.sin(cycle * Math.PI) ** 2;
      ctx.globalAlpha = (.35 + .6 * strength) * envelope;
      sparkLine(ctx, cx - 12, 5, 24, phase + i * 11, 2 + strength * 3, '#d9b5ff');
      // Higher reserves add a second branch along the lower casing.
      if (count >= 3) sparkLine(ctx, cx + 10, 36, 12, phase + i, 2, '#aff9ff');
      ctx.globalAlpha = .45 + strength * .35;
    }
  }
  ctx.restore();
}

function loadSprites() {
  if (sprites || typeof Image === 'undefined') return;
  sprites = {};
  for (const [key, file] of [['charged', 'charged'], ['empty', 'element']]) {
    const image = new Image();
    image.onload = () => {
      // Palette-map at native resolution once. Keep the original silhouette,
      // alpha, shading clusters and content-bottom anchor intact.
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const palette = key === 'charged'
        ? [[9,6,23],[30,21,50],[62,37,104],[108,64,160],[153,81,208],[183,149,236],[113,179,194],[213,235,244]]
        : [[9,6,23],[22,19,39],[36,29,61],[53,43,80],[75,60,105]];
      for (let i = 0; i < pixels.data.length; i += 4) {
        const l = pixels.data[i] * .2126 + pixels.data[i+1] * .7152 + pixels.data[i+2] * .0722;
        const color = palette[Math.min(palette.length - 1, Math.floor(l / 256 * palette.length))];
        pixels.data.set(color, i);
      }
      ctx.putImageData(pixels, 0, 0); sprites[key] = canvas;
    };
    image.src = `assets/objects/pip/${file}.png`;
  }
}

export function drawEnergyHUD(ctx, player, t, { x = 84, y = 22, reducedMotion = false } = {}) {
  loadSprites();
  const reduced = reducedMotion || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const p = pipPulse(player.bankedPips, t, reduced);
  const fill = Math.max(0, Math.min(1, player.charge / MAX_CHARGE));
  const colors = chargeColors(fill);
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0819'; ctx.fillRect(-6, 0, 326, 86);
  ctx.strokeStyle = '#45325f'; ctx.lineWidth = 1; ctx.strokeRect(-5.5, .5, 325, 85);
  ctx.fillStyle = '#9951d0'; ctx.fillRect(-6, 0, 3, 12); ctx.fillRect(317, 74, 3, 12);
  for (let i = 0; i < MAX_BANKED_PIPS; i++) {
    const filled = i < p.count, image = sprites?.[filled ? 'charged' : 'empty'];
    const size = filled ? 83 : 65, bottom = filled ? 69 : 60;
    const dw = Math.round(size * .72), dx = i * 52 + 24 - Math.floor(dw / 2);
    const dy = 44 - Math.round(bottom * .72);
    ctx.save();
    ctx.globalAlpha = filled ? p.alpha : .8;
    const bank = !reduced && i === p.count - 1 ? Math.min(1, Math.max(0, player._pipBankFx || 0) * 2) : 0;
    ctx.shadowColor = '#9951d0'; ctx.shadowBlur = filled ? p.glow + bank * 10 : 0;
    if (image) ctx.drawImage(image, dx, dy, dw, dw);
    else {
      ctx.fillStyle = filled ? '#9951d0' : '#241d3d'; ctx.fillRect(i * 52 + 10, 12, 28, 28);
      ctx.fillStyle = filled ? '#d5ebf4' : '#4b3c69'; ctx.fillRect(i * 52 + 21, 18, 6, 16);
    }
    ctx.restore();
    ctx.fillStyle = filled ? '#71b3c2' : '#322546'; ctx.fillRect(i * 52 + 17, 46, 14, 2);
  }
  drawElectricity(ctx, p.count, t, reduced);
  ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = p.count ? '#d5c5ef' : '#8c7caa'; ctx.fillText(`${p.count} / ${MAX_BANKED_PIPS}`, 267, 24);
  ctx.font = '8px monospace'; ctx.fillStyle = p.count === MAX_BANKED_PIPS ? '#71b3c2' : '#8c7caa';
  ctx.fillText(p.count === MAX_BANKED_PIPS ? 'FULL' : 'BANK', 267, 38);
  // Current charge, rather than reserve count, controls the cyan-to-violet blend.
  ctx.fillStyle = '#20182f'; ctx.fillRect(0, 54, 308, 14);
  const width = Math.round(308 * fill);
  if (width > 0) {
    ctx.shadowColor = colors.bright; ctx.shadowBlur = player.absorbing ? (reduced ? 8 : 10 + 4 * Math.sin(t * 4) ** 2) : 3;
    ctx.fillStyle = colors.body; ctx.fillRect(0, 54, width, 14);
    ctx.fillStyle = colors.bright; ctx.fillRect(0, 54, width, 6);
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.edge; ctx.fillRect(0, 54, width, 2);
    ctx.fillRect(Math.max(0, width - 2), 54, Math.min(2, width), 14);
    if (player.absorbing && !reduced) {
      ctx.shadowColor = colors.bright; ctx.shadowBlur = 6;
      sparkLine(ctx, Math.max(0, width - 22), 61, Math.min(22, width), Math.floor(t * 12), 3, colors.edge);
      ctx.shadowBlur = 0;
    }
  }
  ctx.fillStyle = '#0b0819';
  for (let i = 1; i < MAX_CHARGE; i++) ctx.fillRect(Math.round(308 * i / MAX_CHARGE), 54, 2, 14);
  ctx.font = '8px monospace'; ctx.fillStyle = player.absorbing ? colors.edge : '#a99abd';
  ctx.fillText(player.absorbing ? 'ABSORBING' : 'CHARGE', 0, 79);
  ctx.textAlign = 'right'; ctx.fillText(`${Math.floor(fill * MAX_CHARGE)} / ${MAX_CHARGE}`, 308, 79);
  // Spending draws a restrained edge accent, never a full-panel flash.
  if (!reduced && player._pipSpendFx > 0) {
    ctx.globalAlpha = Math.min(.7, player._pipSpendFx * 2);
    ctx.strokeStyle = '#71b3c2'; ctx.strokeRect(-4.5, 1.5, 323, 83);
  }
  ctx.restore();
}

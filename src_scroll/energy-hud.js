import { MAX_CHARGE, MAX_BANKED_PIPS, START_PIP_SLOTS } from './constants.js';

// Presentation only: the player remains the authority for charge and banking.
// slots is the number of pip icons to animate against (the player's unlocked capacity,
// never fewer than what is actually banked -- see drawEnergyHUD).
export function pipPulse(count, slots, t, reduced = false) {
  slots = Math.max(1, Math.min(MAX_BANKED_PIPS, Math.floor(slots || MAX_BANKED_PIPS)));
  count = Math.max(0, Math.min(slots, Math.floor(count || 0)));
  const strength = count / slots;
  const wave = reduced ? 0.5 : (1 - Math.cos(t * Math.PI * 2 * (0.45 + strength * 0.65))) / 2;
  return { count, slots, wave, glow: count ? 3 + strength * 5 + wave * (3 + strength * 15) : 0,
    alpha: count ? 0.82 + wave * 0.18 : 0 };
}

let sprites;

// Charge bar colours: red when low, yellow in the middle, cyan when high. This is the first iteration's
// scheme (ddbf42a, steps at 30% and 60%); Chief asked for it back because the colour change makes spending
// and absorbing easy to read. The banked pips stay violet so the bar and the reserve read as different things.
// Each band has a body, a bright top and a light edge, like the cyan set the bar already used.
export const CHARGE_BANDS = Object.freeze({
  mediumFrom: 0.3,   // above this fraction: yellow
  highFrom: 0.6,     // above this fraction: cyan
});
const BAND_COLORS = Object.freeze({
  low:    { body: 'rgb(150,34,48)',  bright: 'rgb(255,68,68)',  edge: 'rgb(255,170,170)' },
  medium: { body: 'rgb(170,128,10)', bright: 'rgb(255,204,0)',  edge: 'rgb(255,236,150)' },
  high:   { body: 'rgb(20,146,182)', bright: 'rgb(44,225,255)', edge: 'rgb(175,249,255)' },
});
export function chargeBand(fill) {
  const f = Math.max(0, Math.min(1, Number.isFinite(fill) ? fill : 0));
  return f > CHARGE_BANDS.highFrom ? 'high' : f > CHARGE_BANDS.mediumFrom ? 'medium' : 'low';
}
export function chargeColors(fill) { return { ...BAND_COLORS[chargeBand(fill)] }; }

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

// A small rounded-corner icon badge, like the mockup's HUD rows: a dark inset square with a
// bright 1px frame and a glyph drawn in it. The breathe parameter is the ambient idle animation
// (see drawEnergyHUD) -- a slow, low-amplitude glow so the whole panel never looks static.
function drawBadge(ctx, x, y, size, color, glyph, breathe) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,4,14,0.9)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 2 + breathe * 3;
  ctx.strokeRect(x + .5, y + .5, size - 1, size - 1);
  ctx.fillStyle = color;
  glyph(ctx, x, y, size);
  ctx.restore();
}
const _lightningGlyph = (ctx, x, y, s) => {
  ctx.beginPath();
  ctx.moveTo(x + s * .58, y + s * .14); ctx.lineTo(x + s * .32, y + s * .54); ctx.lineTo(x + s * .5, y + s * .54);
  ctx.lineTo(x + s * .42, y + s * .86); ctx.lineTo(x + s * .72, y + s * .42); ctx.lineTo(x + s * .52, y + s * .42);
  ctx.closePath(); ctx.fill();
};
const _batteryGlyph = (ctx, x, y, s) => {
  ctx.fillRect(x + s * .2, y + s * .3, s * .6, s * .42);
  ctx.fillRect(x + s * .36, y + s * .18, s * .28, s * .12);
};

// Thin L-shaped corner accents, like the mockup's rounded-frame boxes, instead of a flat side tab.
function drawCornerAccents(ctx, x, y, w, h, color, len = 9) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  const corners = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * len, cy);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEnergyHUD(ctx, player, t, { x = 84, y = 22, reducedMotion = false } = {}) {
  loadSprites();
  const reduced = reducedMotion || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Only draw as many pip slots as the player can actually use -- never the full MAX_BANKED_PIPS set
  // of locked circles on a fresh save (Chief: "don't include pip UI if the player doesn't have it").
  // Never fewer than what is actually banked, so a pip the economy already produced is never hidden.
  const slots = Math.min(MAX_BANKED_PIPS, Math.max(player.pipSlots || START_PIP_SLOTS, player.bankedPips, 1));
  const p = pipPulse(player.bankedPips, slots, t, reduced);
  const fill = Math.max(0, Math.min(1, player.charge / MAX_CHARGE));
  const colors = chargeColors(fill);

  // The box's own width tracks its content: one unlocked slot reads as a small, tight panel; more
  // slots (future capacity upgrades) grow it. This is the "more dynamic" ask -- the frame is a function
  // of what the player has, not a fixed five-slot plate.
  const barW = 220;
  const pipsW = (slots - 1) * 52 + 60;
  const contentW = Math.max(barW, pipsW);
  const boxW = contentW + 34;
  const boxH = 94;

  // A slow, low-amplitude ambient breathe -- the panel never sits perfectly still, even at rest.
  const breathe = reduced ? 0.5 : (1 - Math.cos(t * Math.PI * 2 * 0.18)) / 2;

  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#0b0819'; ctx.fillRect(-6, 0, boxW, boxH);
  ctx.strokeStyle = '#45325f'; ctx.lineWidth = 1; ctx.strokeRect(-5.5, .5, boxW - 1, boxH - 1);
  ctx.globalAlpha = 0.55 + breathe * 0.45;
  drawCornerAccents(ctx, -5.5, .5, boxW - 1, boxH - 1, '#5fd7ea');
  ctx.globalAlpha = 1;

  // ── Row 1: CHARGE (on top, per Chief's order) ──────────────────────────────
  const row1Y = 6;
  drawBadge(ctx, -2, row1Y, 20, player.absorbing ? colors.bright : '#5fd7ea', _lightningGlyph, breathe);
  ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = player.absorbing ? colors.edge : '#a99abd';
  ctx.fillText(player.absorbing ? 'ABSORBING' : 'CHARGE', 24, row1Y + 7);
  const barY = row1Y + 11, barH = 13;
  ctx.fillStyle = '#20182f'; ctx.fillRect(24, barY, contentW - 24, barH);
  const width = Math.round((contentW - 24) * fill);
  if (width > 0) {
    ctx.shadowColor = colors.bright; ctx.shadowBlur = player.absorbing ? (reduced ? 8 : 10 + 4 * Math.sin(t * 4) ** 2) : 3;
    ctx.fillStyle = colors.body; ctx.fillRect(24, barY, width, barH);
    ctx.fillStyle = colors.bright; ctx.fillRect(24, barY, width, 5);
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.edge; ctx.fillRect(24, barY, width, 2);
    ctx.fillRect(24 + Math.max(0, width - 2), barY, Math.min(2, width), barH);
    if (player.absorbing && !reduced) {
      ctx.shadowColor = colors.bright; ctx.shadowBlur = 6;
      sparkLine(ctx, 24 + Math.max(0, width - 22), barY + 7, Math.min(22, width), Math.floor(t * 12), 3, colors.edge);
      ctx.shadowBlur = 0;
    }
  }
  ctx.fillStyle = '#0b0819';
  for (let i = 1; i < MAX_CHARGE; i++) ctx.fillRect(24 + Math.round((contentW - 24) * i / MAX_CHARGE), barY, 2, barH);
  ctx.font = '8px monospace'; ctx.textAlign = 'right'; ctx.fillStyle = player.absorbing ? colors.edge : '#a99abd';
  ctx.fillText(`${Math.floor(fill * MAX_CHARGE)} / ${MAX_CHARGE}`, contentW, row1Y + 7);

  // ── Row 2: BANK (below, only the slots the player actually has) ───────────
  const row2Y = row1Y + barH + 18;
  drawBadge(ctx, -2, row2Y, 20, p.count ? '#ac75ef' : '#5fd7ea', _batteryGlyph, breathe);
  ctx.font = '8px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = p.count === slots ? '#71b3c2' : '#8c7caa';
  ctx.fillText(p.count === slots ? 'FULL' : 'BANK', 24, row2Y + 7);
  ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
  ctx.fillStyle = p.count ? '#d5c5ef' : '#8c7caa'; ctx.fillText(`${p.count} / ${slots}`, contentW, row2Y + 7);

  const pipTop = row2Y + 14;
  ctx.save(); ctx.translate(24, pipTop);
  for (let i = 0; i < slots; i++) {
    const filled = i < p.count, image = sprites?.[filled ? 'charged' : 'empty'];
    const size = filled ? 83 : 65, bottom = filled ? 69 : 60;
    const dw = Math.round(size * .58), dx = i * 52 + 12 - Math.floor(dw / 2);
    const dy = 34 - Math.round(bottom * .58);
    ctx.save();
    ctx.globalAlpha = filled ? p.alpha : .8;
    const bank = !reduced && i === p.count - 1 ? Math.min(1, Math.max(0, player._pipBankFx || 0) * 2) : 0;
    ctx.shadowColor = '#9951d0'; ctx.shadowBlur = filled ? p.glow + bank * 10 : 0;
    if (image) ctx.drawImage(image, dx, dy, dw, dw);
    else {
      ctx.fillStyle = filled ? '#9951d0' : '#241d3d'; ctx.fillRect(i * 52, 0, 24, 24);
      ctx.fillStyle = filled ? '#d5ebf4' : '#4b3c69'; ctx.fillRect(i * 52 + 9, 5, 6, 14);
    }
    ctx.restore();
    ctx.fillStyle = filled ? '#71b3c2' : '#322546'; ctx.fillRect(i * 52 + 5, 36, 14, 2);
  }
  drawElectricity(ctx, p.count, t, reduced);
  ctx.restore();

  // Spending draws a restrained edge accent, never a full-panel flash.
  if (!reduced && player._pipSpendFx > 0) {
    ctx.globalAlpha = Math.min(.7, player._pipSpendFx * 2);
    ctx.strokeStyle = '#71b3c2'; ctx.strokeRect(-4.5, 1.5, boxW - 2, boxH - 2);
  }
  ctx.restore();
}

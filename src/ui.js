// HUD: charge meter, context prompts, level banner
import { MAX_CHARGE, C } from './constants.js';
import { drawGlowRect, drawText } from './render.js';

export function drawHUD(ctx, player, level, t) {
  _drawChargeMeter(ctx, player, t);
  _drawLevelBanner(ctx, level, t);
  _drawContextPrompts(ctx, player, t);
}

// ── Charge meter (top-left) — smooth bar, no numbers ─────────────
function _drawChargeMeter(ctx, player, t) {
  const barX  = 16;
  const barY  = 26;
  const barW  = 244;
  const barH  = 14;
  const fill  = player.charge / MAX_CHARGE;

  // Color tracks charge level
  let color;
  if      (fill > 0.6) color = C.CHARGE_HIGH;   // cyan
  else if (fill > 0.3) color = C.CHARGE_MED;    // yellow
  else if (fill > 0)   color = C.CHARGE_LOW;    // red
  else                 color = '#223344';         // empty / dark

  // Glow: fast + bright while absorbing, slow idle pulse otherwise
  const freq  = player.absorbing ? 18 : 3;
  const pulse = 0.65 + 0.35 * Math.sin(t * freq);
  const glow  = player.absorbing ? 24 * pulse : (fill > 0 ? 7 * pulse : 0);

  ctx.save();

  // Background track
  ctx.fillStyle   = 'rgba(5,8,15,0.85)';
  ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth   = 1;
  ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

  // Empty track
  ctx.fillStyle = 'rgba(20,30,50,0.9)';
  ctx.fillRect(barX, barY, barW, barH);

  // Filled portion
  if (fill > 0) {
    ctx.shadowBlur  = glow;
    ctx.shadowColor = color;
    ctx.fillStyle   = color;
    ctx.fillRect(barX, barY, Math.round(barW * fill), barH);
  }

  // Thin tick marks (every 10% = 1 charge unit) — structure without numbers
  ctx.shadowBlur  = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth   = 1;
  for (let i = 1; i < MAX_CHARGE; i++) {
    const tx = barX + Math.round(barW * i / MAX_CHARGE);
    ctx.beginPath();
    ctx.moveTo(tx, barY + 2);
    ctx.lineTo(tx, barY + barH - 2);
    ctx.stroke();
  }

  // Label only — no numbers
  ctx.fillStyle = player.absorbing ? '#ffe040' : '#4a6a8a';
  ctx.font      = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('CHARGE', barX, barY + barH + 11);

  ctx.restore();
}

// ── Level name banner (top-right) ────────────
function _drawLevelBanner(ctx, level, t) {
  const x = 800 - 16;
  ctx.fillStyle = '#3a5570';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${level.number}`, x, 26);
  ctx.fillStyle = '#8aaabb';
  ctx.fillText(level.name, x, 40);
}

// ── Context prompts ───────────────────────────
function _drawContextPrompts(ctx, player, t) {
  const pulse = 0.7 + 0.3 * Math.sin(t * 4);

  // Near a source
  if (player.nearSource && !player.nearSource.drained) {
    const src = player.nearSource;
    const cx  = src.cx;
    const cy  = src.y - 22;
    const needed = src.charge;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ffe040';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(`[E] ABSORB  +${Math.round(needed)}⚡`, cx, cy);
    ctx.restore();
  }

  // Near an enemy — Space = attack (overrides gate prompt)
  if (player.nearEnemy && player.nearEnemy.alive) {
    const e = player.nearEnemy;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ff4466';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ff2244';
    ctx.fillText(`[SPACE] ATTACK  (${e.hp}/${e.maxHp} HP)`, e.cx, e.y - 12);
    ctx.restore();
  }

  // Near a device (gate or switch) — only shown when no enemy nearby
  if (!player.nearEnemy && player.nearDevice && !player.nearDevice.open && !player.nearDevice.on) {
    const dev     = player.nearDevice;
    const cx      = dev.cx;
    const cy      = dev.y - 20;
    const needed  = dev.required - dev.charged;
    const hasAny  = player.charge > 0;
    ctx.save();
    ctx.globalAlpha = pulse;

    if (player.discharging) {
      // Show live transfer feedback while holding Space
      ctx.fillStyle   = '#cc44ff';
      ctx.font        = 'bold 11px monospace';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('CHARGING...', cx, cy);
    } else if (hasAny) {
      ctx.fillStyle   = '#cc44ff';
      ctx.font        = 'bold 11px monospace';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('[SPACE] HOLD TO CHARGE', cx, cy);
    } else {
      ctx.fillStyle   = '#ff4444';
      ctx.font        = 'bold 11px monospace';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ff4444';
      ctx.fillText(`NO CHARGE — absorb a source first`, cx, cy);
    }
    ctx.restore();
  }
}

// ── Level complete overlay ────────────────────
export function drawLevelComplete(ctx, level, timer, t) {
  const alpha = Math.min(1, timer * 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = 'rgba(5,8,15,0.75)';
  ctx.fillRect(0, 0, 800, 450);

  // Title
  ctx.shadowBlur  = 24;
  ctx.shadowColor = '#44ddff';
  ctx.fillStyle   = '#44ddff';
  ctx.font        = 'bold 42px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('CIRCUIT CLOSED', 400, 180);

  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#8ab4d4';
  ctx.fillStyle   = '#8ab4d4';
  ctx.font        = '18px monospace';
  ctx.fillText(`Level ${level.number} — ${level.name}`, 400, 220);

  ctx.fillStyle   = '#556677';
  ctx.font        = '13px monospace';
  ctx.fillText('[SPACE] to continue', 400, 265);
  ctx.restore();
}

// ── Title screen ──────────────────────────────
export function drawTitleScreen(ctx, t) {
  ctx.fillStyle = '#07090f';
  ctx.fillRect(0, 0, 800, 450);

  // Logo glitch / chromatic aberration effect
  const offsets = [[-2, 0, 'rgba(255,40,80,0.7)'], [2, 0, 'rgba(40,220,255,0.7)'], [0, 0, '#ffffff']];
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  for (const [dx, dy, color] of offsets) {
    ctx.fillStyle   = color;
    ctx.shadowBlur  = dx === 0 ? 30 : 0;
    ctx.shadowColor = '#44ddff';
    ctx.fillText('OVERCHARGE', 400 + dx, 200 + dy);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#3a5570';
  ctx.font      = '14px monospace';
  ctx.fillText('Explore. Steal the current. Solve the circuit.', 400, 245);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#44ddff';
  ctx.font        = '16px monospace';
  ctx.fillText('[SPACE] to start', 400, 310);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#1e2e3e';
  ctx.font      = '11px monospace';
  ctx.fillText('KIOTD STUDIOS', 400, 430);
}

// ── Game over screen ──────────────────────────
export function drawGameOver(ctx, t) {
  ctx.fillStyle = 'rgba(5,8,15,0.92)';
  ctx.fillRect(0, 0, 800, 450);

  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#ff3355';
  ctx.fillStyle   = '#ff3355';
  ctx.font        = 'bold 48px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('DISCHARGED', 400, 200);
  ctx.shadowBlur  = 0;

  ctx.fillStyle = '#5a7a8a';
  ctx.font      = '14px monospace';
  ctx.fillText('All charge lost.', 400, 240);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#cc4466';
  ctx.font        = '16px monospace';
  ctx.fillText('[R] Retry  [SPACE] Title', 400, 300);
  ctx.globalAlpha = 1;
}

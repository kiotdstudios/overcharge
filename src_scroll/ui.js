// HUD: charge meter, context prompts, level banner
import { MAX_CHARGE, MAX_BANKED_PIPS, C, W, H } from './constants.js';
import { drawGlowRect, drawText } from './render.js';

export function drawHUD(ctx, player, level, t) {
  _drawBankedPips(ctx, player, t);
  _drawChargeMeter(ctx, player, t);
  _drawLevelBanner(ctx, level, t);
  _drawContextPrompts(ctx, player, t);
  if (level.cols > 25) _drawProgressBar(ctx, player, level);
}

// ── Banked pip rack — power-up display, top-left above charge bar ──
function _drawBankedPips(ctx, player, t) {
  const pipW    = 22;
  const pipH    = 17;
  const gap     = 5;
  const startX  = 16;
  const startY  = 35;
  const count   = player.bankedPips;
  const maxed   = count >= MAX_BANKED_PIPS;
  const bankFx  = player._pipBankFx  > 0;
  const spendFx = player._pipSpendFx > 0;
  const totalW  = MAX_BANKED_PIPS * (pipW + gap) - gap;

  ctx.save();

  // ── Background panel ──
  const panelX = startX - 6;
  const panelY = startY - 4;
  const panelW = totalW + 70;
  const panelH = pipH + 8;
  ctx.fillStyle = 'rgba(3,5,12,0.92)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  // Border glows gold when maxed
  const borderAlpha = maxed ? 0.5 + 0.5 * Math.abs(Math.sin(t * 9)) : 0.18;
  ctx.strokeStyle = `rgba(255,210,30,${borderAlpha})`;
  ctx.lineWidth   = maxed ? 1.5 : 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  // ── Pips ──
  for (let i = 0; i < MAX_BANKED_PIPS; i++) {
    const x      = startX + i * (pipW + gap);
    const filled = i < count;

    if (filled) {
      const isNewest = bankFx && i === count - 1;
      // Pulse rate: fast on freshly banked, sync-fast when maxed, slow idle
      const pulse = isNewest
        ? 0.5 + 0.5 * Math.abs(Math.sin(t * 26))
        : maxed
          ? 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + i * 0.3))
          : 0.7  + 0.3  * Math.sin(t * 5 + i * 1.1);

      // Outer glow — strongest on newest + when maxed
      ctx.shadowBlur  = isNewest ? 32 * pulse : (maxed ? 22 * pulse : 14 * pulse);
      ctx.shadowColor = maxed ? '#ffee44' : '#ffcc00';

      // Fill: warm gold, shifts orange-white with pulse
      const g = Math.round(165 + 75 * pulse);
      ctx.fillStyle = `rgb(255,${g},15)`;
      ctx.fillRect(x, startY, pipW, pipH);

      // Bright inner highlight stripe
      ctx.shadowBlur = 0;
      ctx.fillStyle  = `rgba(255,255,190,${0.45 * pulse})`;
      ctx.fillRect(x + 3, startY + 2, pipW - 6, 5);

      // ⚡ glyph centred in pip
      ctx.shadowBlur  = 6 * pulse;
      ctx.shadowColor = '#fff8a0';
      ctx.fillStyle   = `rgba(255,255,130,${0.85 + 0.15 * pulse})`;
      ctx.font        = `bold ${Math.round(9 + 2 * pulse)}px monospace`;
      ctx.textAlign   = 'center';
      ctx.fillText('⚡', x + pipW / 2, startY + pipH - 3);

    } else {
      // Empty slot
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = 'rgba(8,12,22,0.9)';
      ctx.fillRect(x, startY, pipW, pipH);
      ctx.strokeStyle = '#1a2d3d';
      ctx.lineWidth   = 1;
      ctx.strokeRect(x + 0.5, startY + 0.5, pipW - 1, pipH - 1);
      // Dim ⚡ placeholder
      ctx.fillStyle  = 'rgba(30,50,70,0.6)';
      ctx.font       = '9px monospace';
      ctx.textAlign  = 'center';
      ctx.fillText('⚡', x + pipW / 2, startY + pipH - 3);
    }
  }

  // ── Label ──
  const labelX = startX + MAX_BANKED_PIPS * (pipW + gap) + 6;
  const labelY = startY + pipH - 3;
  ctx.shadowBlur = 0;
  if (maxed) {
    // "MAX!" blinks bold when all pips full
    const mPulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 10));
    ctx.shadowBlur  = 10 * mPulse;
    ctx.shadowColor = '#ffee44';
    ctx.fillStyle   = `rgba(255,230,40,${0.7 + 0.3 * mPulse})`;
    ctx.font        = 'bold 10px monospace';
    ctx.textAlign   = 'left';
    ctx.fillText('MAX!', labelX, labelY);
  } else if (count > 0) {
    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#aa8800';
    ctx.fillStyle   = '#cc9900';
    ctx.font        = 'bold 9px monospace';
    ctx.textAlign   = 'left';
    ctx.fillText(`×${count}`, labelX, labelY);
  } else {
    ctx.fillStyle = '#2a3a4a';
    ctx.font      = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PWR', labelX, labelY);
  }

  // ── Spend flash — whole panel burst ──
  if (spendFx) {
    const alpha = Math.min(0.8, player._pipSpendFx * 2.2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#ffe040';
    ctx.shadowBlur  = 24;
    ctx.shadowColor = '#ffffff';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Charge meter (top-left) — smooth bar, no numbers ─────────────
function _drawChargeMeter(ctx, player, t) {
  const barX  = 16;
  const barY  = 56;
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

    // Pip spend prompt — shown below the main prompt when player has banked pips
    if (player.bankedPips > 0) {
      const pipPulse = 0.7 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha = pulse * pipPulse;
      ctx.fillStyle   = '#ffcc00';
      ctx.font        = 'bold 10px monospace';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.fillText(`[F] SPEND PIP  (${player.bankedPips} stored)`, cx, cy + 16);
    }
    ctx.restore();
  }
}

// ── Level progress bar (scroll levels) — bottom-center ───────────
function _drawProgressBar(ctx, player, level) {
  const barW = 240;
  const barH = 5;
  const barX = W / 2 - barW / 2;
  const barY = H - 12;
  const pct  = Math.max(0, Math.min(1, player.cx / level.pxW));

  ctx.save();
  ctx.fillStyle = 'rgba(5,8,15,0.8)';
  ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
  ctx.fillStyle = '#0d1a28';
  ctx.fillRect(barX, barY, barW, barH);
  if (pct > 0) {
    ctx.shadowBlur  = 6;
    ctx.shadowColor = '#44ddff';
    ctx.fillStyle   = '#44ddff';
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
  // Player marker
  const mx = barX + barW * pct;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle   = '#ffffff';
  ctx.fillRect(mx - 2, barY - 2, 4, barH + 4);
  // Exit marker (purple dot)
  ctx.shadowBlur  = 8;
  ctx.shadowColor = '#cc44ff';
  ctx.fillStyle   = '#cc44ff';
  ctx.fillRect(barX + barW - 3, barY - 1, 5, barH + 2);
  ctx.restore();
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

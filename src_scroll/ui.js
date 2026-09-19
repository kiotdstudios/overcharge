// HUD: charge meter, context prompts, level banner
import { MAX_CHARGE, MAX_BANKED_PIPS, C, W, H } from './constants.js';
import { drawGlowRect, drawText } from './render.js';
import { viewW, safeInsetX } from './viewport.js';

// SCREEN-SPACE HUD only. Called after the camera transform has been restored,
// so everything in here is positioned in viewport pixels.
export function drawHUD(ctx, player, level, t) {
  _drawBankedPips(ctx, player, t);
  _drawChargeMeter(ctx, player, t);
  _drawLevelBanner(ctx, level, t);
  if (level.cols > 25) _drawProgressBar(ctx, player, level);
}

// WORLD-SPACE prompts. MUST be called INSIDE the camera translate (see
// main.js::_drawScrollGame), because every prompt in here anchors to a world
// object — `src.cx`, `e.cx`, `dev.cx`, `cr.cx`.
//
// This used to be called from drawHUD, which runs AFTER ctx.restore() undoes the
// camera translate. The prompts were therefore drawn at world-x as if it were
// screen-x, i.e. shifted right by exactly camX — invisible at level start where
// camX is 0, and increasingly wrong the further right the player walked. Chief
// hit it as "POWER REQUIRED / ABSORB ENERGY text is waaay to the right".
export function drawWorldPrompts(ctx, player, t) {
  _drawContextPrompts(ctx, player, t);
}

// ── Banked pip rack — power-up display, top-left above charge bar ──
// Sprites: assets/objects/pip/element.png (empty), charged.png (banked).
// Geometry from assets/objects/pip/GEOMETRY.md — MEASURED, do not re-derive.
//
//   element.png  65x65  content bottom px 60  (uncharged slot)
//   charged.png  83x83  content bottom px 69  (banked pip — pulses)
//
// Anchor from content bottom: base stays fixed, charge glow grows upward.
// Scale 0.38 keeps sprites within the pip panel height above the charge bar.

let _pipImgs = null;
function _initPipImgs() {
  if (_pipImgs || typeof Image === 'undefined') return;
  const mk = src => Object.assign(new Image(), { src });
  _pipImgs = {
    charged:   mk('assets/objects/pip/charged.png'),
    uncharged: mk('assets/objects/pip/element.png'),
  };
}
const _PIP_GEO = {
  charged:   { cw: 83, ch: 83, cBot: 69 },
  uncharged: { cw: 65, ch: 65, cBot: 60 },
};
const _PIP_SCALE = 0.55;  // increased from 0.38 — Chief: hard to notice detail

function _drawBankedPips(ctx, player, t) {
  _initPipImgs();
  const pipW    = 36;   // was 22 — wider slot for larger sprites
  const pipH    = 30;   // was 17 — taller to match scale 0.55
  const gap     = 4;    // was 5
  const startX  = safeInsetX() + 16;
  const startY  = 10;   // was 35 — moved up since pip panel is taller now
  const count   = player.bankedPips;
  const maxed   = count >= MAX_BANKED_PIPS;
  const bankFx  = player._pipBankFx  > 0;
  const spendFx = player._pipSpendFx > 0;
  const totalW  = MAX_BANKED_PIPS * (pipW + gap) - gap;
  const baseY   = startY + pipH;   // content-bottom anchor — stays fixed

  ctx.save();

  // ── Background panel ──
  const panelX = startX - 6;
  const panelY = startY - 4;
  const panelW = totalW + 70;
  const panelH = pipH + 8;
  ctx.fillStyle = 'rgba(3,5,12,0.92)';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  const borderAlpha = maxed ? 0.5 + 0.5 * Math.abs(Math.sin(t * 9)) : 0.18;
  ctx.strokeStyle = `rgba(255,210,30,${borderAlpha})`;
  ctx.lineWidth   = maxed ? 1.5 : 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  // ── Pips ──
  for (let i = 0; i < MAX_BANKED_PIPS; i++) {
    const filled  = i < count;
    const key     = filled ? 'charged' : 'uncharged';
    const geo     = _PIP_GEO[key];
    const img     = _pipImgs?.[key];
    const centerX = startX + i * (pipW + gap) + pipW / 2;
    const dw      = geo.cw * _PIP_SCALE;
    const dh      = geo.ch * _PIP_SCALE;
    const dx      = centerX - dw / 2;
    const dy      = baseY - geo.cBot * _PIP_SCALE;  // anchor content bottom to baseY

    if (filled) {
      const isNewest = bankFx && i === count - 1;
      const pulse = isNewest
        ? 0.5 + 0.5 * Math.abs(Math.sin(t * 26))
        : maxed
          ? 0.55 + 0.45 * Math.abs(Math.sin(t * 9 + i * 0.3))
          : 0.7  + 0.3  * Math.sin(t * 5 + i * 1.1);

      ctx.shadowBlur  = isNewest ? 32 * pulse : (maxed ? 22 * pulse : 14 * pulse);
      ctx.shadowColor = maxed ? '#ffee44' : '#ffcc00';

      if (img?.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.7 + 0.3 * pulse;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      } else {
        // Fallback rectangle until image loads
        const g = Math.round(165 + 75 * pulse);
        ctx.fillStyle = `rgb(255,${g},15)`;
        ctx.fillRect(dx, dy, dw, dh);
        ctx.shadowBlur = 0;
        ctx.fillStyle  = `rgba(255,255,190,${0.45 * pulse})`;
        ctx.fillRect(dx + 3, dy + 2, dw - 6, 5);
        ctx.shadowBlur  = 6 * pulse;
        ctx.shadowColor = '#fff8a0';
        ctx.fillStyle   = `rgba(255,255,130,${0.85 + 0.15 * pulse})`;
        ctx.font        = `bold ${Math.round(9 + 2 * pulse)}px monospace`;
        ctx.textAlign   = 'center';
        ctx.fillText('⚡', centerX, baseY - 3);
      }
      ctx.shadowBlur = 0;

    } else {
      // Empty slot
      if (img?.complete && img.naturalWidth > 0) {
        ctx.globalAlpha = 0.5;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      } else {
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = 'rgba(8,12,22,0.9)';
        ctx.fillRect(dx, dy, dw, dh);
        ctx.strokeStyle = '#1a2d3d';
        ctx.lineWidth   = 1;
        ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
        ctx.fillStyle  = 'rgba(30,50,70,0.6)';
        ctx.font       = '9px monospace';
        ctx.textAlign  = 'center';
        ctx.fillText('⚡', centerX, baseY - 3);
      }
    }
  }

  // ── Label ──
  const labelX = startX + MAX_BANKED_PIPS * (pipW + gap) + 6;
  const labelY = startY + pipH - 3;
  ctx.shadowBlur = 0;
  if (maxed) {
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
  const barX  = safeInsetX() + 16;     // HUD safe area (cover-crop aware)
  const barY  = 50;   // was 56 — raised to sit below pip panel (panel bottom ≈ 48)
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
  const x = viewW() - safeInsetX() - 16;   // right edge of the HUD safe area
  ctx.fillStyle = '#3a5570';
  ctx.font      = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${level.number}`, x, 26);
  ctx.fillStyle = '#8aaabb';
  ctx.fillText(level.name, x, 40);
}

// ── Context prompts ───────────────────────────
//
// Bindings after ORDER SPACE_CHARGE (Chief, 2026-09-11):
//   Source                                       → [E] ABSORB
//   Gate (player has enough usable charge)       → [SPACE] CHARGE
//   Gate (player does NOT have enough)           → POWER REQUIRED / ABSORB MORE ENERGY
//   Enemy                                        → [K] ATTACK
//
// "[E] ABSORB" is NEVER shown on a gate — it appears only under nearSource.
// The old "[F] SPEND PIP" prompt is GONE: F is unbound and no button completes
// a gate in one press.
function _drawContextPrompts(ctx, player, t) {
  const pulse = 0.7 + 0.3 * Math.sin(t * 4);

  // ── Near a source: [E] ABSORB ──
  if (player.nearSource && !player.nearSource.drained) {
    const src = player.nearSource;
    const cx  = src.cx;
    // O5.2 (ORCHA 08): was `src.y - 22` — the 28x28 HITBOX top, while the sprite
    // is 64x64 anchored at (y+h)-62, so the prompt landed on the artwork. Chief:
    // "same for generator".
    // promptAnchor() uses the CANVAS top, a STABLE reference. Finding B: content
    // top varies 6px across the pack (7,7,6,3,2,1,4,5,7) because the arcs reach
    // upward — real animation. Anchoring to the live per-frame top would make
    // this prompt bounce 6px at 8fps, i.e. new jitter caused by fixing overlap.
    const cy  = typeof src.promptAnchor === 'function' ? src.promptAnchor().aboveY : src.y - 22;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ffe040';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ffcc00';
    ctx.fillText(`[E] ABSORB`, cx, cy);
    ctx.restore();
  }

  // ── Near an enemy: [K] ATTACK ──
  // No longer "overrides" the gate prompt: charge is SPACE and attack is K, so
  // both prompts can coexist truthfully. Kept visually distinct instead.
  if (player.nearEnemy && player.nearEnemy.alive) {
    const e = player.nearEnemy;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ff4466';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ff2244';
    ctx.fillText(`[K] ATTACK  (${e.hp}/${e.maxHp} HP)`, e.cx, e.y - 12);
    ctx.restore();
  }


  // ── Near a device (gate/switch) ──
  // The [SPACE] CHARGE prompt is NO LONGER suppressed by nearSource. That
  // suppression existed because E meant both "absorb" and "discharge", so one
  // key could not advertise both. Charging is SPACE now, so a player standing
  // between a generator and a gate correctly sees BOTH [E] ABSORB and
  // [SPACE] CHARGE. This mirrors the gameplay guard removed in
  // player.js _updateDischarge — UI and gameplay stay in agreement.
  if (!player.nearEnemy && player.nearDevice && !player.nearDevice.open && !player.nearDevice.on) {
    const dev       = player.nearDevice;
    const cx        = dev.cx;
    // O5.2 (ORCHA 03/08): was `dev.y - 20` — the HITBOX top. The gate hitbox is
    // 32x64 while its art is 94x105 starting at (y+h)-105, so this printed
    // [SPACE] CHARGE straight across the sprite. Chief: "text in general need to
    // change its sitting on top of the art asset".
    // promptAnchor() places it clear of the DRAWN bounds and of the bar/EXIT
    // group, and flips below when there is no room above (ORCHA 07).
    const cy        = typeof dev.promptAnchor === 'function'
      ? dev.promptAnchor().y
      : dev.y - 20;                     // legacy devices without the accessor
    const needed    = dev.required - dev.charged;
    // SINGLE AUTHORITY: player.usableEnergy is the same getter the gameplay
    // interaction uses. UI can never disagree with what holding SPACE will
    // actually accomplish.
    const hasEnough = player.canAfford(needed);

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 11px monospace';

    if (player.discharging) {
      // Live feedback while actively holding SPACE at the device
      ctx.fillStyle   = '#cc44ff';
      ctx.shadowBlur  = 10;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('CHARGING...', cx, cy);
    } else if (hasEnough) {
      ctx.fillStyle   = '#cc44ff';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('[SPACE] CHARGE', cx, cy);
    } else {
      // Two-line prompt: POWER REQUIRED / ABSORB MORE ENERGY
      ctx.fillStyle   = '#ff4444';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ff4444';
      ctx.fillText('POWER REQUIRED', cx, cy);
      ctx.font        = 'bold 9px monospace';
      ctx.fillStyle   = '#ff8888';
      ctx.fillText('ABSORB MORE ENERGY', cx, cy + 12);
    }

    // Reserve readout. NOT a key prompt any more — F is unbound and nothing
    // inserts a whole pip on demand. It stays as information because banked
    // pips still feed the bar automatically while charging (spendEnergy →
    // _pullReserve), so the player needs to know the reserve is there and is
    // being counted by the affordability check above.
    if (player.bankedPips > 0) {
      const pipPulse = 0.7 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha = pulse * pipPulse;
      ctx.fillStyle   = '#ffcc00';
      ctx.font        = 'bold 10px monospace';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.fillText(`RESERVE: ${player.bankedPips} PIP${player.bankedPips === 1 ? '' : 'S'}`, cx, cy + 26);
    }
    ctx.restore();
  }

  // ── Crate prompts (ORDER CRATE_TIMED — D3 / D4 / D5) ──────────────
  // Reads the state resolved once in Player._updateContext, so the HUD can never
  // disagree with what holding SPACE will actually do.
  //
  // Doctrine here is honest refusal over silent no-op: when a crate cannot
  // conduct, the player is told WHY, not left pressing a key that does nothing.
  //   'ok'         [SPACE] CHARGE VIA CRATE -> <device id>
  //   'none'       NOT CONNECTED / TOUCH IT TO A GATE
  //   'ambiguous'  AMBIGUOUS CONTACT / TOUCHING <n> DEVICES
  if (!player.nearEnemy && !player.nearDevice && player.nearCrate) {
    const cr = player.nearCrate;
    const cx = cr.cx;
    const cy = cr.y - 12;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 11px monospace';

    if (player.crateBridge === 'ok' && player.crateTarget) {
      if (player.discharging) {
        ctx.fillStyle   = '#cc44ff';
        ctx.shadowBlur  = 10;
        ctx.shadowColor = '#cc44ff';
        ctx.fillText('CHARGING VIA CRATE...', cx, cy);
      } else {
        const needed = player.crateTarget.required - player.crateTarget.charged;
        ctx.fillStyle   = player.canAfford(needed) ? '#cc44ff' : '#ff4444';
        ctx.shadowBlur  = 8;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillText('[SPACE] CHARGE VIA CRATE', cx, cy);
        ctx.font      = 'bold 9px monospace';
        ctx.fillStyle = '#aa88cc';
        ctx.fillText(`-> ${player.crateTarget.id}`, cx, cy + 11);
      }
    } else if (player.crateBridge === 'ambiguous') {
      // D5 (Kiro veto): never guess which device gets the energy — say so.
      ctx.fillStyle   = '#ffaa22';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffaa22';
      ctx.fillText('AMBIGUOUS CONTACT', cx, cy);
      ctx.font      = 'bold 9px monospace';
      ctx.fillStyle = '#ddaa66';
      ctx.fillText('TOUCH ONLY ONE DEVICE', cx, cy + 11);
    } else {
      ctx.fillStyle   = '#8899aa';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#8899aa';
      ctx.fillText('NOT CONNECTED', cx, cy);
      ctx.font      = 'bold 9px monospace';
      ctx.fillStyle = '#667788';
      ctx.fillText('PUSH IT TO A GATE', cx, cy + 11);
    }
    ctx.restore();
  }
}

// ── Level progress bar (scroll levels) — bottom-center ───────────
function _drawProgressBar(ctx, player, level) {
  const barW = 240;
  const barH = 5;
  const barX = viewW() / 2 - barW / 2;
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
  ctx.fillRect(0, 0, viewW(), 450);

  // Title
  ctx.shadowBlur  = 24;
  ctx.shadowColor = '#44ddff';
  ctx.fillStyle   = '#44ddff';
  ctx.font        = 'bold 42px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('CIRCUIT CLOSED', viewW() / 2, 180);

  ctx.shadowBlur  = 12;
  ctx.shadowColor = '#8ab4d4';
  ctx.fillStyle   = '#8ab4d4';
  ctx.font        = '18px monospace';
  ctx.fillText(`Level ${level.number} — ${level.name}`, viewW() / 2, 220);

  ctx.fillStyle   = '#556677';
  ctx.font        = '13px monospace';
  ctx.fillText('[SPACE] to continue', viewW() / 2, 265);
  ctx.restore();
}

// ── Title screen ──────────────────────────────
// CHIEF 2026-09-19 17:17: "on this screen add lighting flashing; lets make this
// more dynamic".
//
// WHY THIS IS DRAWN ON THE CANVAS AND NOT REUSED FROM background.js:
// background.js already has a lightning system (tickLightning), but it drives a DOM
// element sitting BEHIND the canvas, and it is data-driven off the level's
// `background` field — Level 1 does not request one. The title screen also paints an
// OPAQUE `#07090f` over the full frame, so even if that layer were running it would
// be invisible here. So the storm is canvas-native. What IS reused is its RHYTHM:
// the double-flash shape and the multi-second irregular gap are taken from
// tickLightning so the title reads as the same weather as the game, not a second
// unrelated effect.
//
// EVERYTHING IS DERIVED FROM `t`, WITH NO MUTABLE STATE AND NO Math.random().
// drawTitleScreen only receives accumulated time, so a seeded hash keyed on the
// strike index gives bolts that look random but are reproducible — which is the only
// reason this is testable at all. A Math.random() bolt could not be asserted.
const STORM_H = 450;      // matches the existing title backdrop exactly, so no seam
// ── CHIEF'S DIAL. Say "more" or "less" and these three are what move. ──
// Tuned by sweeping, not guessed. At these values, measured over 5 minutes of idling:
//   128 bolts, gaps 1.0s min / 2.3s avg / 5.5s max, longest fully-dark stretch 2.3s,
//   and only 2.6% of frames above half brightness — dramatic, never a strobe.
// The first pass used 2.6 / 1.7 and left a 14.5s dead stretch, which is too static for
// a title Chief asked to make "more dynamic".
const STRIKE_PERIOD = 1.8;   // one strike opportunity per this many seconds
const STRIKE_JITTER = 0.95;  // how far into the window a strike can land
const NEAR_THRESHOLD = 0.20; // below this a cycle is distant rumble, no visible bolt
// LOAD-BEARING INVARIANT: STRIKE_JITTER + FLASH_DUR must stay under STRIKE_PERIOD, or a
// late strike is cut off mid-flash when the cycle rolls over. Current margin is 0.30s.
// Asserted in _dev/title_storm.mjs — do not tune the period down without re-running it.
const FLASH_DUR = 0.55;

// Deterministic 0..1 hash. Same integer-mix style as the tile variant hash.
function _h(n) {
  let x = (n | 0) * 2654435761;
  x = (x ^ (x >>> 15)) * 2246822519;
  x = (x ^ (x >>> 13)) * 3266489917;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// The storm's whole state at time t. Exported for the suite — asserting a number is
// worth more than eyeballing a canvas.
// Dial exposed so the suite can assert the truncation invariant against the REAL
// numbers instead of hard-coding a copy of them that can drift.
export const STORM_DIAL = Object.freeze({ STRIKE_PERIOD, STRIKE_JITTER, NEAR_THRESHOLD, FLASH_DUR });

export function titleStormState(t) {
  const cycle = Math.floor(t / STRIKE_PERIOD);
  // Strike lands at an irregular offset inside its cycle, so gaps vary rather than
  // ticking like a metronome. A fixed offset would read as mechanical.
  const at    = cycle * STRIKE_PERIOD + _h(cycle) * STRIKE_JITTER;
  const age   = t - at;
  let flash = 0;
  if (age >= 0) {
    // Double-flash, shaped after tickLightning's 55/80/140ms steps but continuous:
    // hard strike, brief dark gap, weaker second hit, then a soft afterglow.
    if      (age < 0.06) flash = 1;
    else if (age < 0.10) flash = 0.08;
    else if (age < 0.17) flash = 0.5;
    else if (age < FLASH_DUR) flash = 0.5 * Math.pow(1 - (age - 0.17) / (FLASH_DUR - 0.17), 2);
  }
  // Some cycles are distant rumble only — no bolt, just a dim sky lift. Keeps it from
  // feeling like a loop.
  const near = _h(cycle * 7 + 11) > NEAR_THRESHOLD;
  return { cycle, age, flash: near ? flash : flash * 0.22, near, seed: cycle };
}

// One jagged bolt, fully determined by `seed`.
function _drawBolt(ctx, seed, w, alpha) {
  const segs = 9;
  const x0   = 60 + _h(seed * 31 + 3) * (w - 120);
  const endY = 150 + _h(seed * 17 + 5) * 120;
  const pts  = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const spread = 70 * (1 - f) + 14;
    pts.push({
      x: x0 + (_h(seed * 101 + i * 13) - 0.5) * spread + f * (_h(seed * 7 + 1) - 0.5) * 90,
      y: f * endY,
    });
  }
  const stroke = (lw, col, a) => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.globalAlpha = a;
    ctx.stroke();
  };
  // Wide soft halo under a tight white core reads as light rather than as a drawn line.
  ctx.shadowBlur = 24; ctx.shadowColor = '#7fd4ff';
  stroke(7, 'rgba(90,190,255,0.30)', alpha * 0.8);
  stroke(2.4, '#eaf8ff', alpha);
  // A branch or two, forking off a mid-point.
  const forks = _h(seed * 53 + 9) > 0.45 ? 2 : 1;
  for (let b = 0; b < forks; b++) {
    const i0 = 3 + Math.floor(_h(seed * 71 + b * 19) * 4);
    const p  = pts[Math.min(i0, pts.length - 2)];
    const dir = _h(seed * 91 + b) > 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    let bx = p.x, by = p.y;
    for (let k = 0; k < 4; k++) {
      bx += dir * (12 + _h(seed * 37 + b * 7 + k) * 26);
      by += 16 + _h(seed * 43 + k) * 22;
      ctx.lineTo(bx, by);
    }
    ctx.lineWidth = 1.4; ctx.strokeStyle = '#cfefff'; ctx.globalAlpha = alpha * 0.7;
    ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

export function drawTitleScreen(ctx, t) {
  const w = viewW();
  const S = titleStormState(t);

  ctx.fillStyle = '#07090f';
  ctx.fillRect(0, 0, w, STORM_H);

  // Sky lift: the flash washes the whole backdrop, brightest at the top where the
  // bolt is, so the light appears to come from somewhere.
  if (S.flash > 0.01) {
    const g = ctx.createLinearGradient(0, 0, 0, STORM_H);
    g.addColorStop(0,    `rgba(120,180,255,${0.30 * S.flash})`);
    g.addColorStop(0.45, `rgba(70,130,210,${0.12 * S.flash})`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, STORM_H);
  }

  // Rain. Deterministic per-streak so it never re-randomises between frames.
  ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const sp = 120 + _h(i * 3 + 1) * 90;
    const x  = (_h(i) * (w + 200) - 60 + t * 22) % (w + 200) - 60;
    const y  = (_h(i * 5 + 2) * STORM_H + t * sp) % STORM_H;
    const len = 9 + _h(i * 9) * 13;
    ctx.strokeStyle = `rgba(150,190,240,${0.05 + 0.10 * _h(i * 11) + 0.22 * S.flash})`;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y + len); ctx.stroke();
  }

  // The bolt itself, only while the strike is actually bright.
  if (S.near && S.age >= 0 && S.age < 0.20) {
    _drawBolt(ctx, S.seed, w, S.age < 0.06 ? 1 : (S.age < 0.10 ? 0.12 : 0.55));
  }

  // Logo. The chromatic split WIDENS on the flash — the glitch reacts to the storm
  // instead of running at a constant amplitude, which is what sells it as one effect.
  const split = 2 + S.flash * 4.5;
  const offsets = [[-split, 0, 'rgba(255,40,80,0.7)'], [split, 0, 'rgba(40,220,255,0.7)'], [0, 0, '#ffffff']];
  ctx.font = 'bold 72px monospace';
  ctx.textAlign = 'center';
  for (const [dx, dy, color] of offsets) {
    ctx.fillStyle   = color;
    ctx.shadowBlur  = dx === 0 ? 30 + S.flash * 45 : 0;
    ctx.shadowColor = '#44ddff';
    ctx.fillText('OVERCHARGE', w / 2 + dx, 200 + dy);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#3a5570';
  ctx.font      = '14px monospace';
  ctx.fillText('Explore. Steal the current. Solve the circuit.', w / 2, 245);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#44ddff';
  ctx.font        = '16px monospace';
  ctx.fillText('[SPACE] to start', w / 2, 310);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#1e2e3e';
  ctx.font      = '11px monospace';
  ctx.fillText('KIOTD STUDIOS', w / 2, 430);
}

// ── Game over screen ──────────────────────────
export function drawGameOver(ctx, t) {
  ctx.fillStyle = 'rgba(5,8,15,0.92)';
  ctx.fillRect(0, 0, viewW(), 450);

  ctx.shadowBlur  = 20;
  ctx.shadowColor = '#ff3355';
  ctx.fillStyle   = '#ff3355';
  ctx.font        = 'bold 48px monospace';
  ctx.textAlign   = 'center';
  ctx.fillText('DISCHARGED', viewW() / 2, 200);
  ctx.shadowBlur  = 0;

  ctx.fillStyle = '#5a7a8a';
  ctx.font      = '14px monospace';
  ctx.fillText('All charge lost.', viewW() / 2, 240);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#cc4466';
  ctx.font        = '16px monospace';
  ctx.fillText('[R] Retry  [SPACE] Title', viewW() / 2, 300);
  ctx.globalAlpha = 1;
}

// HUD: charge meter, context prompts, level banner
import { MAX_CHARGE, MAX_BANKED_PIPS, C, W, H } from './constants.js';
import { drawGlowRect, drawText } from './render.js';
import { drawEnergyHUD } from './energy-hud.js';
import { viewW, safeInsetX } from './viewport.js';
import { isNightCityStreetlight } from './source-visuals.js';
import { PowerGate, Switch } from './electricity.js';

// SCREEN-SPACE HUD only. Called after the camera transform has been restored,
// so everything in here is positioned in viewport pixels.
// Returns true the one frame an onboarding objective's checkbox just ticked, so main.js
// can fire the "achievement" chime for it (Chief: objective completion should sound just
// like earning an achievement). false the rest of the time, including the easter-egg card
// branch, which has its own completion sound (sfx.play('egg-complete')) wired in main.js.
export function drawHUD(ctx, player, level, t) {
  _drawPlayerAvatar(ctx);
  drawEnergyHUD(ctx, player, t, { x: safeInsetX() + 84, y: 22 });
  _drawLevelBanner(ctx, level, t);
  let objectiveJustCompleted = false;
  if (_easterEggActive(level, t)) _drawEasterEggCard(ctx, t);
  else objectiveJustCompleted = _drawLevelOneObjective(ctx, player, level, t);
  if (level.cols > 25) _drawProgressBar(ctx, player, level);
  return objectiveJustCompleted;
}

// Level 1's two short onboarding objectives are derived from live gameplay state.
// A checkpoint restore therefore rewinds the checklist along with sources and gates.
export function levelOneObjective(level, player) {
  if (level?.number !== 1) return null;
  const lamps = level.sources?.filter(isNightCityStreetlight) || [];
  const exit = level.gates?.find(gate => gate.isExit);
  if (!lamps.length || !exit) return null;
  if (!lamps.some(lamp => lamp.charge < lamp.max - 1e-9)) {
    return { stage: 0, title: 'NEED TO POWER UP', task: 'Try absorbing power from a street lamp', checked: false };
  }
  const remaining = Math.max(0, exit.required - exit.charged);
  return { stage: 1, title: 'POWER THE EXIT', task: 'Absorb enough energy to exit gate',
    checked: !!exit.open || player.usableEnergy >= remaining - 1e-9 };
}

// Keep the checked first step visible long enough to read before the next prompt
// charges in. Time comes from the game clock, so pause and frame rate are respected.
export function advanceLevelOneObjectivePresentation(state, objective, t) {
  if (!state || objective.stage < state.stage) {
    return { stage: objective.stage, enteredAt: t, checked: objective.checked,
      sparkAt: -Infinity, nextAt: null, justCompleted: false };
  }
  state.justCompleted = false;   // reset every call; set below only on a genuine fresh completion
  if (state.nextAt !== null && objective.stage === state.stage) {
    state.nextAt = null;
    state.checked = objective.checked;
    state.sparkAt = -Infinity;
  }
  if (objective.stage > state.stage && state.nextAt === null) {
    state.checked = true;
    state.sparkAt = t;
    state.nextAt = t + 0.8;
    state.justCompleted = true;   // finished this stage's task, moving to the next one
  }
  if (state.nextAt !== null && t >= state.nextAt) {
    state.stage = objective.stage;
    state.enteredAt = t;
    state.checked = objective.checked;
    state.sparkAt = objective.checked ? t : -Infinity;
    state.nextAt = null;
  } else if (state.nextAt === null && state.checked !== objective.checked) {
    const becameChecked = objective.checked && !state.checked;
    state.checked = objective.checked;
    if (state.checked) state.sparkAt = t;
    if (becameChecked) state.justCompleted = true;   // the last objective (no further stage) just got checked
  }
  return state;
}

const _objectivePresentations = new WeakMap();
function _drawLevelOneObjective(ctx, player, level, t) {
  const objective = levelOneObjective(level, player);
  if (!objective) return false;
  const state = advanceLevelOneObjectivePresentation(_objectivePresentations.get(level), objective, t);
  _objectivePresentations.set(level, state);
  const second = state.stage === 1;
  const title = second ? 'POWER THE EXIT' : 'NEED TO POWER UP';
  const task = second ? 'Absorb enough energy to exit gate' : 'Try absorbing power from a street lamp';
  const reducedMotion = !!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const reveal = reducedMotion ? 1 : Math.min(1, Math.max(0, (t - state.enteredAt) / 0.42));
  const w = 302, h = 62;
  const x = viewW() - safeInsetX() - w - 16, y = 51;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w * reveal, h); ctx.clip();
  ctx.fillStyle = 'rgba(4, 7, 20, 0.91)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = second ? '#7150ae' : '#b77d3b';
  ctx.fillRect(x, y, 3, h);
  ctx.fillStyle = second ? '#412875' : '#263f60';
  ctx.fillRect(x + 3, y + h - 2, w - 3, 2);
  ctx.fillStyle = second ? '#7ccaff' : '#ffc070';
  ctx.font = 'bold 8px monospace';
  ctx.fillText(second ? '02 / 02' : '01 / 02', x + 13, y + 12);
  ctx.strokeStyle = second ? '#9a6be0' : '#a06f37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 19, y + 20); ctx.lineTo(x + 26, y + 27);
  ctx.lineTo(x + 19, y + 34); ctx.lineTo(x + 12, y + 27);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = second ? '#c29aff' : '#ffc070';
  ctx.font = 'bold italic 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 38, y + 30);
  const boxX = x + 39, boxY = y + 40;
  ctx.strokeStyle = state.checked ? '#44ddff' : '#88a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, 11, 11);
  if (state.checked) {
    ctx.strokeStyle = '#44ddff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX + 2, boxY + 6); ctx.lineTo(boxX + 5, boxY + 9);
    ctx.lineTo(boxX + 10, boxY + 2); ctx.stroke();
  }
  ctx.fillStyle = state.checked ? '#7ecbd7' : '#c2cfda';
  ctx.font = '10px monospace';
  ctx.fillText(task, x + 57, y + 50);
  // Square pixel sparks radiate from the checkbox only when it becomes checked.
  const age = t - state.sparkAt;
  if (!reducedMotion && age >= 0 && age < 0.55) {
    const distance = 5 + age * 31;
    ctx.globalAlpha = 1 - age / 0.55;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      ctx.fillStyle = i % 2 ? '#a565ef' : '#44ddff';
      ctx.fillRect(Math.round(boxX + 6 + Math.cos(angle) * distance),
        Math.round(boxY + 6 + Math.sin(angle) * distance), 3, 3);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // The reveal edge flickers in pixel steps, then disappears once fully charged in.
  if (!reducedMotion && reveal > 0 && reveal < 1) {
    ctx.save();
    ctx.fillStyle = second ? '#a565ef' : '#44ddff';
    const edge = x + Math.round(w * reveal);
    for (let i = 0; i < 4; i++) ctx.fillRect(edge + (i % 2) * 3, y + 8 + i * 12, 3, 4);
    ctx.restore();
  }
  return state.justCompleted;
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
export function drawWorldPrompts(ctx, player, t, bubbleRects) {
  _drawContextPrompts(ctx, player, t, bubbleRects);
}

// ── Player avatar box — top-left corner ──────────────────────────
// Shows a 52×52 panel with the player idle sprite (frame_001).
// Sits at x=safeInsetX()+4, y=4 — pip rack starts at +64 to clear it.

let _avatarImg = null;
function _initAvatarImg() {
  if (_avatarImg || typeof Image === 'undefined') return;
  _avatarImg = Object.assign(new Image(), { src: 'assets/sprites/hero-v3/idle/east/frame_000.png' });
}

function _drawPlayerAvatar(ctx) {
  _initAvatarImg();
  const ax = safeInsetX() + 4;
  const ay = 20;
  const aw = 72, ah = 72;
  ctx.save();
  // dark background panel
  ctx.fillStyle = 'rgba(3,5,12,0.92)';
  ctx.fillRect(ax, ay, aw, ah);
  // cyan border (matches HUD palette)
  ctx.strokeStyle = 'rgba(68,221,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ax + 0.5, ay + 0.5, aw - 1, ah - 1);
  // Head crop: source region x=35,y=14,w=21,h=26 (measured from idle east frame).
  // Scale to fill box height, preserve aspect ratio, nearest-neighbor for pixel crispness.
  if (_avatarImg?.complete && _avatarImg.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    const sx = 210, sy = 78, sw = 120, sh = 135; // hero-v3 head and shoulders
    const dh = ah - 8;                            // fill most of box height
    const dw = Math.round(dh * sw / sh);          // preserve aspect ratio (~52px wide)
    ctx.drawImage(_avatarImg, sx, sy, sw, sh, ax + (aw - dw) / 2, ay + (ah - dh) / 2, dw, dh);
  }
  ctx.restore();
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
const _PIP_SCALE = 0.72;  // bumped again — Chief: make bigger

function _drawBankedPips(ctx, player, t) {
  _initPipImgs();
  const pipW    = 48;   // bigger — Chief: make section bigger
  const pipH    = 40;   // taller to match scale 0.72
  const gap     = 4;
  const startX  = safeInsetX() + 84;  // clear 72px avatar (4+72+8)
  const startY  = 26;   // moved down 16px from top edge
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
  const barX  = safeInsetX() + 84;     // clear 72px avatar
  const barY  = 70;   // moved down — sits below bigger pip panel
  const barW  = 272;
  const barH  = 20;
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
// Reported bug (Chief screenshot): the streetlamp woman's dialogue bubble and
// that same lamp's "[E] ABSORB" prompt both anchor near the lamp and landed
// on top of each other — two independent systems (npc.js bubbles, this file's
// context prompts) with no mutual awareness. Rather than hardcode a fix for
// that one lamp, any one-line world prompt can call this first: if its own
// (cx, cy) text box would overlap a currently-drawn bubble, it lifts clear
// above the highest bubble it collides with. No bubbles active (the common
// case) or no collision: returns cy unchanged.
function _clearOfBubbles(ctx, cx, cy, text, bubbleRects) {
  if (!bubbleRects || !bubbleRects.length) return cy;
  const fontSize = parseInt((/(\d+)px/.exec(ctx.font) || [])[1], 10) || 11;
  const halfW = ctx.measureText(text).width / 2 + 4;
  // textBaseline is left at its default ('alphabetic') for every prompt that
  // calls this, so cy is the text's baseline: the glyphs sit roughly from
  // cy - fontSize (ascent) to cy + fontSize * 0.25 (descent).
  const rect = { bx: cx - halfW, by: cy - fontSize, w: halfW * 2, h: fontSize * 1.25 };
  let highestTop = null;
  for (const b of bubbleRects) {
    const overlap = rect.bx < b.bx + b.w && rect.bx + rect.w > b.bx && rect.by < b.by + b.h && rect.by + rect.h > b.by;
    if (overlap) highestTop = highestTop === null ? b.by : Math.min(highestTop, b.by);
  }
  // Place the prompt's own bottom edge `gap` px above the collided bubble's
  // top edge, converting back from box-top to baseline the same way `rect.by`
  // above converted from baseline to box-top.
  const gap = 8;
  return highestTop === null ? cy : highestTop - gap - fontSize * 0.25;
}

function _drawContextPrompts(ctx, player, t, bubbleRects) {
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
    ctx.fillText(`[E] ABSORB`, cx, _clearOfBubbles(ctx, cx, cy, '[E] ABSORB', bubbleRects));
    ctx.restore();
  }

  // ── Near an enemy: [K] ATTACK ──
  // No longer "overrides" the gate prompt: charge is SPACE and attack is K, so
  // both prompts can coexist truthfully. Kept visually distinct instead.
  if (player.nearChargeSource) {
    const src = player.nearChargeSource;
    const anchor = typeof src.promptAnchor === 'function' ? src.promptAnchor() : null;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#b981f3';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    const chargeCy = anchor ? anchor.belowY : src.y + src.h + 12;
    ctx.fillText('[SPACE] CHARGE', src.cx, _clearOfBubbles(ctx, src.cx, chargeCy, '[SPACE] CHARGE', bubbleRects));
    ctx.restore();
  }

  if (player.nearEnemy && player.nearEnemy.alive && player.levelAbilities?.melee !== false) {
    const e = player.nearEnemy;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ff4466';
    ctx.font        = 'bold 11px monospace';
    ctx.textAlign   = 'center';
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ff2244';
    ctx.fillText(`[K] MELEE  (${e.hp}/${e.maxHp} HP)`, e.cx, e.y - 12);
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

    // lineOff: extra upshift applied only to multi-line prompts so the second
    // line never lands on the gate's own EXIT label (which sits ~1px below cy).
    let lineOff = 0;

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
      // Two-line prompt — shift both lines up so line 2 clears the gate's EXIT label.
      lineOff = 14;
      ctx.fillStyle   = '#ff4444';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ff4444';
      ctx.fillText('POWER REQUIRED', cx, cy - lineOff);
      ctx.font        = 'bold 9px monospace';
      ctx.fillStyle   = '#ff8888';
      ctx.fillText('ABSORB MORE ENERGY', cx, cy - lineOff + 12);
    }

    // Reserve readout. NOT a key prompt any more — F is unbound and nothing
    // inserts a whole pip on demand. It stays as information because banked
    // pips still feed the bar automatically while charging (spendEnergy →
    // _pullReserve), so the player needs to know the reserve is there and is
    // being counted by the affordability check above.
    if (player.bankedPips > 0 && (dev instanceof PowerGate || dev instanceof Switch)) {
      const pipPulse = 0.7 + 0.3 * Math.sin(t * 5);
      ctx.globalAlpha = pulse * pipPulse;
      ctx.fillStyle   = '#ffcc00';
      ctx.font        = 'bold 10px monospace';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffaa00';
      ctx.fillText(`[Q] SPEND PIP (${player.bankedPips})`, cx, cy - lineOff + 26);
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
  const w = viewW();
  const panelW = Math.min(720, w - 36);
  const x = (w - panelW) / 2;
  const y = 98;
  const panelH = 374;
  const reducedMotion = !!(globalThis.matchMedia && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // The gate has already had four seconds on screen. Start the card with a
  // center strike, then reveal it in broken scanline bands. All positions are
  // derived from timer, so the effect is a one-shot and never flickers at rest.
  const impactX = Math.round(w / 2), impactY = Math.round(y + panelH / 2);
  ctx.save();
  ctx.fillStyle = `rgba(3,5,14,${Math.min(0.76, timer * 1.9)})`;
  ctx.fillRect(0, 0, w, H);
  if (!reducedMotion && timer < 0.78) {
    const boltEnd = Math.min(1, Math.max(0, (timer - 0.05) / 0.17));
    if (timer >= 0.05 && timer < 0.34) {
      const points = [[impactX - 34, 0], [impactX - 21, 54], [impactX + 5, 94],
        [impactX - 8, 142], [impactX + 17, 185], [impactX, impactY]];
      const count = Math.max(1, Math.ceil(boltEnd * (points.length - 1)));
      ctx.strokeStyle = '#39cfff'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(...points[0]);
      for (let i = 1; i <= count; i++) ctx.lineTo(...points[i]);
      ctx.stroke();
      ctx.strokeStyle = '#ebffff'; ctx.lineWidth = 2;
      ctx.stroke();
    }
    const age = timer - 0.22;
    if (age >= 0 && age < 0.56) {
      const progress = age / 0.56;
      ctx.fillStyle = `rgba(220,250,255,${(1 - progress) * 0.5})`;
      ctx.fillRect(0, 0, w, H);
      for (let i = 0; i < 24; i++) {
        const angle = i * 2.39996;
        const distance = (18 + (i % 5) * 9) * (0.3 + progress * 2.5);
        const px = Math.round(impactX + Math.cos(angle) * distance);
        const py = Math.round(impactY + Math.sin(angle) * distance);
        ctx.fillStyle = i % 3 ? '#45dfff' : '#d94aff';
        ctx.fillRect(px, py, i % 4 ? 4 : 7, i % 4 ? 2 : 3);
      }
    }
  }
  ctx.restore();
  if (timer < (reducedMotion ? 0.18 : 0.4)) return;

  const reveal = reducedMotion ? Math.min(1, (timer - 0.18) / 0.25)
    : Math.min(1, (timer - 0.4) / 0.65);
  const alpha = Math.min(1, reveal * 3);
  const pulse = reducedMotion ? 0.65 : 0.65 + 0.35 * Math.sin(timer * 5);
  ctx.save();
  if (!reducedMotion && reveal < 1) {
    ctx.beginPath();
    for (let band = 0; band < 24; band++) {
      const threshold = (band * 11 % 24) / 24;
      if (reveal >= threshold) {
        const shift = Math.round((1 - reveal) * ((band * 7 % 5) - 2) * 9);
        ctx.rect(x + shift, y + band * panelH / 24, panelW, panelH / 24 + 1);
      }
    }
    ctx.clip();
  }
  ctx.globalAlpha = alpha;
  const wash = ctx.createLinearGradient(0, y, 0, y + panelH);
  wash.addColorStop(0, '#101330');
  wash.addColorStop(0.55, '#111028');
  wash.addColorStop(1, '#090e20');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = '#5b3b91';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, panelW - 2, panelH - 2);

  // A charged circuit around the card, with deterministic short lightning
  // branches. The reduced-motion version keeps the circuit lit without motion.
  const circuitY = y + 111;
  ctx.strokeStyle = '#44ddff';
  ctx.shadowColor = '#44ddff';
  ctx.shadowBlur = reducedMotion ? 0 : 12 + 9 * pulse;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 22, circuitY);
  ctx.lineTo(x + panelW - 22, circuitY);
  ctx.stroke();
  for (let side = 0; side < 2; side++) {
    const bx = side ? x + panelW - 28 : x + 28;
    ctx.fillStyle = side ? '#cc44ff' : '#44ddff';
    ctx.fillRect(bx - 8, circuitY - 8, 16, 16);
    if (!reducedMotion) {
      ctx.strokeStyle = side ? '#cc44ff' : '#8cf0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx, circuitY);
      for (let i = 1; i <= 5; i++) {
        const sx = bx + (side ? -1 : 1) * i * 12;
        const sy = circuitY - i * 14 + Math.sin(timer * 13 + i * 2.1 + side) * 7;
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aebddd';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CIRCUIT CLOSED  //  POWER RESTORED', w / 2, y + 49, panelW - 28);
  ctx.shadowColor = '#cc44ff';
  ctx.shadowBlur = reducedMotion ? 0 : 22 * pulse;
  ctx.fillStyle = '#efe5ff';
  ctx.font = `bold ${Math.min(53, Math.max(25, panelW / 13))}px monospace`;
  ctx.fillText('LEVEL COMPLETE', w / 2, y + 200, panelW - 24);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7de6ff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`LV ${level.number}  //  ${level.name}`, w / 2, y + 249, panelW - 30);
  ctx.fillStyle = '#586b90';
  ctx.fillRect(x + 48, y + 281, panelW - 96, 2);
  ctx.fillStyle = '#cbaaff';
  ctx.font = '14px monospace';
  ctx.globalAlpha = alpha * (reducedMotion ? 1 : 0.72 + 0.28 * Math.sin(timer * 4));
  ctx.fillText('[SPACE / ENTER] CONTINUE', w / 2, y + 333, panelW - 24);
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
// STORM_H is the FULL canvas height, not the old 450 title-backdrop box. Chief asked
// for bolts reaching `top of the screen to bottom`, and 450 is not the bottom - H is
// 578. Safe to extend because C.BG (what clear() paints below 450) is '#07090f', the
// exact same colour as the title backdrop, so the boundary was never visible and
// widening the fill changes no pixel. Verified against constants.js, not assumed.
const STORM_H = H;
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
// CHIEF 2026-09-20 03:28 dials, same block so `more/less` is a one-line change:
//   PAIR_RARITY      higher = rarer double strikes. 0.84 -> about 1 strike in 6.
//   FULL_REACH_CHANCE fraction of bolts that drop the FULL screen height. 0.22 -> ~1 in 5,
//                     which is the `a few varying top to bottom` he asked for. The rest
//                     stop in the sky between 40% and 80% of the drop.
const PAIR_RARITY       = 0.84;
const FULL_REACH_CHANCE = 0.22;

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
export const STORM_DIAL = Object.freeze({ STRIKE_PERIOD, STRIKE_JITTER, NEAR_THRESHOLD, FLASH_DUR, PAIR_RARITY, FULL_REACH_CHANCE });

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
//
// CHIEF 2026-09-19 17:45: "make sure at least 1 or two lightning bolts reaches from
// top of the screen to bottom". The first version stopped at endY 150..270 — barely
// past the logo — so nothing ever struck THROUGH the frame. Bolts now span y=0 to the
// full screen height, and every near strike fires one or two of them.
// One jagged bolt. `reach` is the fraction of screen height it spans (0..1).
//
// CHIEF 2026-09-20 03:28: "all lightning is from top to bottom i said a few varying top
// to bottom ... a lot of 2 strikes at once that should be rare and at different lengths
// not both top to bottom".
//
// I over-corrected the 17:45 note. He asked for one or two bolts to REACH the bottom;
// I made EVERY bolt full height and 55% of strikes a pair, so the variation he wanted
// was gone in both dimensions. Length is now a parameter, and only a minority of bolts
// get the full drop.
function _drawBolt(ctx, seed, w, alpha, reach) {
  const endY = STORM_H * reach;
  // Segment count scales with length so short bolts are not over-tessellated and long
  // ones still jag tightly. 16 over the full drop was tuned earlier; keep that density.
  const segs = Math.max(6, Math.round(16 * reach));
  const x0   = 70 + _h(seed * 31 + 3) * (w - 140);
  const drift = (_h(seed * 7 + 1) - 0.5) * 150 * reach;   // lean, scaled to the drop
  const pts  = [];
  for (let i = 0; i <= segs; i++) {
    const f = i / segs;
    const spread = 54 * (1 - 0.45 * f);
    const x = x0 + (_h(seed * 101 + i * 13) - 0.5) * spread + f * drift;
    pts.push({
      x: Math.max(8, Math.min(w - 8, x)),          // never wander off-frame
      y: f * endY,                                 // starts at the top, ends at `reach`
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
  ctx.shadowBlur = 26; ctx.shadowColor = '#7fd4ff';
  stroke(9, 'rgba(90,190,255,0.26)', alpha * 0.8);
  stroke(3.4, 'rgba(170,225,255,0.85)', alpha * 0.9);
  stroke(1.6, '#f2fbff', alpha);
  // Branches fork off mid-points and taper away. Spread across the bolt's length so
  // the lower half gets them too, not just the top.
  const forks = _h(seed * 53 + 9) > 0.4 ? 3 : 2;
  for (let b = 0; b < forks; b++) {
    const i0 = 3 + Math.floor(_h(seed * 71 + b * 19) * (segs - 5));
    const p   = pts[Math.min(i0, pts.length - 2)];
    const dir = _h(seed * 91 + b) > 0.5 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    let bx = p.x, by = p.y;
    for (let k = 0; k < 5; k++) {
      // Forks need the SAME clamp as the trunk. Without it they ran up to 98px past
      // the edge and got hard-clipped by the canvas, so a fork near the frame border
      // ended in a straight cut instead of tapering. Found by the frame-bounds
      // assertion once it sampled wide enough to reach cycle 1979.
      bx = Math.max(6, Math.min(w - 6, bx + dir * (10 + _h(seed * 37 + b * 7 + k) * 24)));
      by += 14 + _h(seed * 43 + k + b) * 24;
      ctx.lineTo(bx, by);
    }
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#cfefff'; ctx.globalAlpha = alpha * 0.65;
    ctx.stroke();
  }
  // Ground glow ONLY for a bolt that actually reaches the ground. A short bolt that
  // dies in the sky must not light up the floor — that was the tell that would have
  // made varying lengths look broken rather than deliberate.
  if (reach >= 0.92) {
    const land = pts[pts.length - 1];
    const rg = ctx.createRadialGradient(land.x, STORM_H, 0, land.x, STORM_H, 170);
    rg.addColorStop(0, `rgba(150,210,255,${0.30 * alpha})`);
    rg.addColorStop(1, 'rgba(150,210,255,0)');
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.fillStyle = rg;
    ctx.fillRect(land.x - 170, STORM_H - 150, 340, 150);
  }
  ctx.globalAlpha = 1;
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

  // RAIN REMOVED — CHIEF 2026-09-19 17:45 "take away the rain effect". It was 90
  // deterministic streaks drawn here. Deleted outright rather than left behind a flag.

  // BOLT COUNT AND LENGTH — CHIEF 2026-09-20 03:28.
  // "all lightning is from top to bottom i said a few varying top to bottom also there
  //  are a lot of 2 strikes at once that should be rare and at different lengths not
  //  both top to bottom"
  //
  // Three corrections to my 17:45 over-shoot:
  //  1 LENGTH VARIES. Most bolts die in the sky; only a MINORITY drop the full height.
  //    Chief asked for "a few" reaching bottom, not all of them.
  //  2 PAIRS ARE RARE. Was 55% of strikes, which is not "at once occasionally", it is
  //    the norm. Now ~1 in 6.
  //  3 A PAIR IS NEVER TWO FULL-HEIGHT BOLTS. The second is explicitly forced short, so
  //    a double strike reads as one big bolt plus a smaller one, never two identical
  //    curtains.
  if (S.near && S.age >= 0 && S.age < 0.20) {
    const a = S.age < 0.06 ? 1 : (S.age < 0.10 ? 0.12 : 0.55);
    const pair = _h(S.seed * 211 + 17) > PAIR_RARITY;
    // Primary reach: FULL_REACH_CHANCE of strikes go top-to-bottom, the rest stop in the
    // sky somewhere between 40% and 80% of the drop.
    const r0 = _h(S.seed * 409 + 23) < FULL_REACH_CHANCE
      ? 1
      : 0.40 + _h(S.seed * 577 + 31) * 0.40;
    _drawBolt(ctx, S.seed * 1000, w, a, r0);
    if (pair) {
      // Secondary is always clearly shorter than the primary, and never full height.
      const r1 = Math.min(r0 * 0.65, 0.30 + _h(S.seed * 733 + 41) * 0.35);
      _drawBolt(ctx, S.seed * 1000 + 337, w, a * 0.8, r1);
    }
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
export function drawGameOver(ctx, t, player = null) {
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
  ctx.fillText(player?.dead ? 'All charge lost.' : 'Not enough charge to power the exit.', viewW() / 2, 240);

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle   = '#cc4466';
  ctx.font        = '16px monospace';
  ctx.fillText('[R] Retry  [SPACE] Title', viewW() / 2, 300);
  ctx.globalAlpha = 1;
}

// ── Easter egg complete card (Chief, 2026-10-16) ───────────────────────────────
// "should be a card like the objective top right, so the objective would be replaced by the easter egg
// completion animation for at least 6 to 9 seconds." A finished Easter egg takes over the objective card's
// place for 8 seconds with a small version of the level complete strike: lightning into the card, a flash,
// pixel sparks, a scanline reveal, a charged circuit line, a pulsing glow, a checked box. Then the objective
// charges back in. Everything is derived from the game clock `t`, so pause and frame rate are respected.
const EGG_SECONDS = 8;
let _egg = null;
export function showEasterEggCard(card, t, seconds = EGG_SECONDS) {
  _egg = { title: String(card?.title || 'EASTER EGG'), text: String(card?.text || ''), icon: card?.icon ? String(card.icon) : null, at: t,
    seconds: Math.min(9, Math.max(6, Number(seconds) || EGG_SECONDS)) };
}
export function clearEasterEggCard() { _egg = null; }
export function easterEggCardState(t) {
  if (!_egg) return { active: false, ended: false };
  const age = t - _egg.at;
  if (age < 0) return { active: false, ended: false };
  if (age >= _egg.seconds) return { active: false, ended: true };
  return { active: true, ended: false, age, left: _egg.seconds - age, seconds: _egg.seconds, card: _egg };
}
function _easterEggActive(level, t) {
  const s = easterEggCardState(t);
  if (s.active) return true;
  if (s.ended) { _egg = null; _objectivePresentations.delete(level); }   // the objective charges back in
  return false;
}
// The achievement's icon art (assets/ui/achievements/*.png), loaded once. Returns null until the image is ready.
const _eggIcons = new Map();
function _eggIcon(src) {
  if (!src) return null;
  let img = _eggIcons.get(src);
  if (!img) { img = new Image(); img.src = src; _eggIcons.set(src, img); }
  return (img.complete && img.naturalWidth) ? img : null;
}
export function preloadEasterEggIcon(src) { _eggIcon(src); }
// Pop-up scale for the icon: 0 -> a bit past 1 -> 1 (ease out back), over `dur` seconds.
export function eggIconScale(pa, dur = 0.42, overshoot = 2.2) {
  if (pa <= 0) return 0;
  if (pa >= dur) return 1;
  const p = pa / dur - 1;
  return 1 + (overshoot + 1) * p * p * p + overshoot * p * p;
}
function _drawEasterEggCard(ctx, t) {
  const s = easterEggCardState(t);
  if (!s.active) return;
  const { age, left, card } = s;
  const reduced = !!(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const w = 302, h = 82;
  const x = viewW() - safeInsetX() - w - 16, y = 51;
  const cx = Math.round(x + w / 2), cy = Math.round(y + h / 2);
  const fade = Math.min(1, left / 0.6);
  const reveal = reduced ? 1 : Math.min(1, Math.max(0, (age - 0.28) / 0.55));
  const pulse = reduced ? 0.7 : 0.65 + 0.35 * Math.sin(age * 5);
  ctx.save();
  ctx.globalAlpha = fade;
  // 1. The strike: a bolt from the top of the screen into the card, a cyan-white flash, radiating pixel sparks.
  if (!reduced && age < 0.9) {
    if (age >= 0.04 && age < 0.34) {
      const end = Math.min(1, (age - 0.04) / 0.16);
      const pts = [[cx - 30, 0], [cx - 18, 14], [cx + 4, 26], [cx - 6, 38], [cx + 12, 46], [cx, cy]];
      const n = Math.max(1, Math.ceil(end * (pts.length - 1)));
      ctx.strokeStyle = '#39cfff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      ctx.strokeStyle = '#ebffff'; ctx.lineWidth = 2; ctx.stroke();
    }
    const fa = age - 0.2;
    if (fa >= 0 && fa < 0.5) {
      const p = fa / 0.5;
      ctx.fillStyle = `rgba(220,250,255,${(1 - p) * 0.16})`;
      ctx.fillRect(0, 0, viewW(), H);
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39996, d = (14 + (i % 5) * 8) * (0.3 + p * 2.6);
        ctx.fillStyle = i % 3 ? '#ffd36a' : (i % 2 ? '#45dfff' : '#d94aff');
        ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), i % 4 ? 4 : 6, i % 4 ? 2 : 3);
      }
    }
  }
  // 2. The card, revealed in broken scanline bands like the level complete card.
  if (reveal > 0) {
    ctx.beginPath();
    if (reveal < 1) {
      for (let b = 0; b < 12; b++) {
        if (reveal >= (b * 5 % 12) / 12) {
          const shift = Math.round((1 - reveal) * ((b * 7 % 5) - 2) * 7);
          ctx.rect(x + shift, y + b * h / 12, w, h / 12 + 1);
        }
      }
    } else ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(8, 6, 22, 0.94)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#d9a63f'; ctx.fillRect(x, y, 3, h);
    ctx.fillStyle = '#4a2f7c'; ctx.fillRect(x + 3, y + h - 2, w - 3, 2);
    ctx.strokeStyle = `rgba(255,207,106,${0.35 + 0.35 * pulse})`; ctx.lineWidth = 1;
    ctx.strokeRect(x + 3.5, y + 0.5, w - 4, h - 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffcf6a'; ctx.font = 'bold 8px monospace';
    const icon = _eggIcon(s.card.icon);
    const L = s.card.icon ? 76 : 13;                       // left edge of the text column
    ctx.fillText('EASTER EGG COMPLETE', x + L, y + 13, 170);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7de6ff';
    ctx.fillText('CIRCUIT CLOSED', x + w - 10, y + 13, 110);
    // the charged circuit line with a travelling pulse
    ctx.textAlign = 'left';
    ctx.strokeStyle = '#44ddff'; ctx.lineWidth = 2;
    if (!reduced) { ctx.shadowColor = '#44ddff'; ctx.shadowBlur = 5 + 6 * pulse; }
    ctx.beginPath(); ctx.moveTo(x + L, y + 20); ctx.lineTo(x + w - 10, y + 20); ctx.stroke();
    ctx.shadowBlur = 0;
    if (!reduced) {
      const px = x + L + ((age * 0.55) % 1) * (w - L - 10);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(px) - 2, y + 18, 5, 4);
    }
    // the icon pops up (or the gold diamond if the art is missing) and the achievement name
    const popAt = 0.78;                                      // just after the card has finished revealing
    const pa = age - popAt;
    let tx = 40;
    if (icon) {
      tx = L;
      const S = reduced ? 1 : eggIconScale(pa);
      if (S > 0) {
        const size = 64, icx = Math.round(x + 40), icy = Math.round(y + 41 + (reduced ? 0 : Math.sin(age * 3) * 1.2));
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (!reduced) { ctx.shadowColor = '#44ddff'; ctx.shadowBlur = 8 + 6 * pulse; }
        ctx.translate(icx, icy); ctx.scale(S, S);
        ctx.drawImage(icon, -size / 2, -size / 2, size, size);
        ctx.restore();
        // a ring and a few pixel sparks leave the icon as it lands
        if (!reduced && pa >= 0 && pa < 0.55) {
          const q = pa / 0.55;
          ctx.save(); ctx.globalAlpha = fade * (1 - q);
          ctx.strokeStyle = '#ffcf6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(icx, icy, 16 + q * 30, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4 + 0.4; ctx.fillStyle = i % 2 ? '#ffffff' : '#44ddff'; ctx.fillRect(Math.round(icx + Math.cos(ang) * (18 + q * 34)), Math.round(icy + Math.sin(ang) * (18 + q * 34)), 3, 3); }
          ctx.restore();
        }
      }
    } else {
      const dx = x + 21, dy = y + 40, r = 7 + (reduced ? 0 : 1.5 * Math.sin(age * 6));
      ctx.fillStyle = '#ffcf6a';
      ctx.beginPath(); ctx.moveTo(dx, dy - r); ctx.lineTo(dx + r, dy); ctx.lineTo(dx, dy + r); ctx.lineTo(dx - r, dy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a1840'; ctx.fillRect(dx - 1, dy - 3, 2, 4); ctx.fillRect(dx - 1, dy + 2, 2, 2);
    }
    if (!reduced) { ctx.shadowColor = '#cc44ff'; ctx.shadowBlur = 10 * pulse; }
    ctx.fillStyle = '#f4ecff'; ctx.font = 'bold italic 16px monospace';
    ctx.fillText(card.title, x + tx, y + 46, w - tx - 12);
    ctx.shadowBlur = 0;
    // the checked box and the achievement text
    const bx = x + tx + 1, by = y + 56;
    ctx.strokeStyle = '#44ddff'; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, by + 0.5, 11, 11);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx + 2, by + 6); ctx.lineTo(bx + 5, by + 9); ctx.lineTo(bx + 10, by + 2); ctx.stroke();
    ctx.fillStyle = '#9fe4ee'; ctx.font = '10px monospace';
    ctx.fillText(card.text, bx + 18, y + 66, w - tx - 30);    // time left, as a thin bar
    ctx.fillStyle = 'rgba(255,207,106,0.55)';
    ctx.fillRect(x + 3, y + h - 3, Math.round((w - 3) * Math.max(0, left / s.seconds)), 1);
    // pixel sparks pop off the box once, like the objective check
    const sa = age - 0.95;
    if (!reduced && sa >= 0 && sa < 0.55) {
      const dist = 5 + sa * 31;
      ctx.globalAlpha = fade * (1 - sa / 0.55);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.fillStyle = i % 2 ? '#ffcf6a' : '#44ddff';
        ctx.fillRect(Math.round(bx + 6 + Math.cos(a) * dist), Math.round(by + 6 + Math.sin(a) * dist), 3, 3);
      }
    }
  }
  ctx.restore();
}

// Player: movement, jumping, absorb/discharge, charge meter
import {
  TILE, COLS, ROWS, GRAVITY, PLAYER_SPEED, JUMP_FORCE,
  PLAYER_W, PLAYER_H, MAX_CHARGE, MAX_BANKED_PIPS, ABSORB_RATE, DISCHARGE_RATE, C,
  RUN_MULTIPLIER, STUN_DURATION, ATTACK_RADIUS, ATTACK_COOLDOWN
} from './constants.js';
import * as Input from './input.js';
import { drawGlowRect, drawSparks, drawLightningArc } from './render.js';
import { ChargePickup } from './electricity.js';
import { PlayerSprites } from './sprites.js';

// Sprite PNGs are 92x92; character content sits from y=14 to y=78 (feet at y=78)
const SPRITE_W      = 92;
const SPRITE_H      = 92;
const SPRITE_FEET_Y = 78;  // pixel row of character feet within the 92px frame

const COYOTE_TIME  = 0.1;   // seconds of grace after walking off an edge
const JUMP_BUFFER  = 0.1;   // pre-jump input buffer

export class Player {
  constructor(x, y) {
    this.x       = x;
    this.y       = y;
    this.vx      = 0;
    this.vy      = 0;
    this.w       = PLAYER_W;
    this.h       = PLAYER_H;
    this.grounded = false;
    this.charge  = 0;

    // Interaction state
    this.absorbing    = false;
    this.absorbTarget = null;

    // Coyote + jump buffer
    this._coyote   = 0;
    this._jumpBuf  = 0;
    this._dropTimer = 0;  // >0 = skip one-way platforms (drop-through window)

    // Banked charge pips
    this.bankedPips  = 0;
    this._pipBankFx  = 0;  // flash when a pip is banked
    this._pipSpendFx = 0;  // flash when a pip is spent

    // Visual
    this._t          = 0;
    this._absorbFx   = 0;   // absorption arc timer
    this._dischargeFx = 0;  // discharge arc timer
    this._hurtFlash  = 0;   // flash duration on damage
    this._facingRight = true;
    this.dead        = false;  // true = hit with no charge + no pips → game over

    // Movement state
    this.running        = false;
    this._stunTime      = 0;  // >0 → input frozen, red flash active
    this._attackCooldown = 0;
    this._attackFx      = 0;  // brief arc-flash timer on swing

    // Discharge state
    this.discharging       = false;
    this.dischargeTarget   = null;

    // Sprite animator
    this._sprites = new PlayerSprites();

    // Context prompt shown near devices / enemies
    this.nearSource = null;
    this.nearDevice = null;  // gate or switch
    this.nearEnemy  = null;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // ── Update ────────────────────────────────────
  update(dt, level) {
    this._t             += dt;
    this._stunTime       = Math.max(0, this._stunTime       - dt);
    this._hurtFlash      = Math.max(0, this._hurtFlash      - dt);
    this._absorbFx       = Math.max(0, this._absorbFx       - dt);
    this._dischargeFx    = Math.max(0, this._dischargeFx    - dt);
    this._attackCooldown = Math.max(0, this._attackCooldown - dt);
    this._attackFx       = Math.max(0, this._attackFx       - dt);
    this._pipBankFx      = Math.max(0, this._pipBankFx      - dt);
    this._pipSpendFx     = Math.max(0, this._pipSpendFx     - dt);

    this._updateContext(level);       // context first — nearDevice/Enemy known before input
    this._handleMovement(dt);
    this._applyPhysics(dt, level);
    this._updateAbsorb(dt, level);
    this._updateAttack(dt, level);    // Space near enemy → attack
    this._updateDischarge(dt, level); // Space near gate (no enemy) → charge
    this._updatePipSpend(dt, level);  // F near gate + has pip → instant power
    this._collectPickups(level);

    // Tick sprite animator — threshold at 20 avoids idle/walk flicker during decel
    const isMoving = Math.abs(this.vx) > 20;
    this._sprites.update(dt, isMoving, this._facingRight, this.absorbing, this.running, !this.grounded, this.discharging, Math.abs(this.vx), this.vy);
  }

  // ── Movement & jump ──────────────────────────
  _handleMovement(dt) {
    // Stunned: bleed off velocity, ignore all input
    if (this._stunTime > 0) {
      this.vx *= 0.8;
      if (Math.abs(this.vx) < 5) this.vx = 0;
      this.running = false;
      return;
    }
    const left  = Input.heldAny('ArrowLeft',  'KeyA');
    const right = Input.heldAny('ArrowRight', 'KeyD');
    // Jump: Up / W only. Space is reserved for charge discharge.
    const jump = Input.pressedAny('ArrowUp', 'KeyW');

    const shift = Input.heldAny('ShiftLeft', 'ShiftRight');
    this.running = shift && (left || right);
    const speed  = this.running ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;

    if (left)  { this.vx = -speed; this._facingRight = false; }
    else if (right) { this.vx =  speed; this._facingRight = true; }
    else       { this.vx *= 0.75; if (Math.abs(this.vx) < 5) this.vx = 0; }

    if (jump) this._jumpBuf = JUMP_BUFFER;
    this._jumpBuf = Math.max(0, this._jumpBuf - dt);

    if (this._jumpBuf > 0 && (this.grounded || this._coyote > 0)) {
      this.vy        = JUMP_FORCE;
      this.grounded  = false;
      this._coyote   = 0;
      this._jumpBuf  = 0;
    }
  }

  // ── Physics + AABB tilemap collision ─────────
  _applyPhysics(dt, level) {
    this.vy += GRAVITY * dt;
    this.vy = Math.min(this.vy, 700); // terminal velocity

    const wasGrounded = this.grounded;
    this.grounded = false;

    // Floor-press: when grounded, _resolveY must fire every frame so snapping stays active.
    // Without this, y+h lands exactly on a tile boundary — the tBot-1 check misses the
    // floor tile and gravity accumulates for 3-4 frames before snapping back, causing vibration.
    if (wasGrounded && this.vy > 60) this.vy = 60;

    // Drop-through one-way platforms: press Down/S while grounded to open a 0.25s window.
    // A small downward nudge gets the player moving before the window closes.
    if (Input.pressedAny('ArrowDown', 'KeyS') && wasGrounded) {
      this._dropTimer = 0.25;
      this.vy = Math.max(this.vy, 60); // nudge past the platform surface
    }
    this._dropTimer = Math.max(0, this._dropTimer - dt);
    const dropDown  = this._dropTimer > 0;

    // ── Horizontal ──
    this.x += this.vx * dt;
    this._resolveX(level);

    // ── Vertical ──
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this._resolveY(level, prevBottom, dropDown);
    this._resolvePlatforms(level, prevBottom, dt);

    // Clamp to canvas bounds — ceiling at y=0 prevents jumping above all barriers
    if (this.x < 0) { this.x = 0; this.vx = 0; }
    if (this.x + this.w > level.pxW) { this.x = level.pxW - this.w; this.vx = 0; }
    if (this.y < 0) { this.y = 0; this.vy = 0; } // hard ceiling — no escaping over walls

    // Coyote
    if (wasGrounded && !this.grounded) {
      this._coyote = COYOTE_TIME;
    } else {
      this._coyote = Math.max(0, this._coyote - dt);
    }
  }

  _resolveX(level) {
    const tTop = Math.floor(this.y / TILE);
    const tBot = Math.floor((this.y + this.h - 1) / TILE);
    if (this.vx > 0) {
      const tRight = Math.floor((this.x + this.w - 1) / TILE);
      for (let ty = tTop; ty <= tBot; ty++) {
        if (level.solidAt(tRight, ty)) {
          this.x  = tRight * TILE - this.w;
          this.vx = 0;
          break;
        }
      }
    } else if (this.vx < 0) {
      const tLeft = Math.floor(this.x / TILE);
      for (let ty = tTop; ty <= tBot; ty++) {
        if (level.solidAt(tLeft, ty)) {
          this.x  = (tLeft + 1) * TILE;
          this.vx = 0;
          break;
        }
      }
    }
    // Also check gate collisions (dynamic solid rects)
    for (const gate of level.gates) {
      if (gate.blocks(this.x, this.y, this.w, this.h)) {
        if (this.vx > 0) this.x = gate.x - this.w;
        else if (this.vx < 0) this.x = gate.x + gate.w;
        this.vx = 0;
      }
    }
  }

  // ── Moving platform collision ──────────────
  // Must run after _resolveY so tilemap grounding takes priority
  _resolvePlatforms(level, prevBottom, dt) {
    for (const pl of level.platforms) {
      // Overlap check: player rect vs platform rect
      const overlapX = this.x < pl.x + pl.w && this.x + this.w > pl.x;
      if (!overlapX) continue;
      const playerBottom = this.y + this.h;
      const withinY = playerBottom >= pl.y && playerBottom <= pl.y + pl.h + 4;
      // prevBottom from before this frame's y-move — reliable even if _resolveY zeroed vy.
      // 8px tolerance: falling player can overshoot tile top by a few px within one frame.
      if (withinY && prevBottom <= pl.y + 8 && this.vy >= 0) {
        this.y        = pl.y - this.h;
        this.vy       = 0;
        this.grounded = true;
        // Carry player horizontally with the platform
        this.x += pl.vx * dt;
      }
    }
  }

  _resolveY(level, prevBottom, dropThrough) {
    const tLeft  = Math.floor(this.x / TILE);
    const tRight = Math.floor((this.x + this.w - 1) / TILE);
    if (this.vy >= 0) {
      const tBot = Math.floor((this.y + this.h) / TILE);
      for (let tx = tLeft; tx <= tRight; tx++) {
        const tile = level.tileAt(tx, tBot);
        if (tile === 1) {
          this.y        = tBot * TILE - this.h;
          this.vy       = 0;
          this.grounded = true;
          break;
        }
        // One-way: land if feet were anywhere at or above bottom of this tile last frame.
        // Using (tBot+1)*TILE instead of tBot*TILE prevents fall-through when
        // standing still — gravity nudges the player ~0.23px per frame which
        // rounds the tile index one row up, missing the narrow top-of-tile check.
        if (tile === 2 && !dropThrough && prevBottom <= tBot * TILE + 8) {
          this.y        = tBot * TILE - this.h;
          this.vy       = 0;
          this.grounded = true;
          break;
        }
      }
      // Gate collisions
      for (const gate of level.gates) {
        if (!gate.open && gate.blocks(this.x, this.y, this.w, this.h)) {
          this.y        = gate.y - this.h;
          this.vy       = 0;
          this.grounded = true;
        }
      }
    } else {
      const tTop = Math.floor(this.y / TILE);
      for (let tx = tLeft; tx <= tRight; tx++) {
        if (level.solidAt(tx, tTop)) {
          this.y  = (tTop + 1) * TILE;
          this.vy = 0;
          break;
        }
      }
    }
  }

  // ── Absorb (hold E near source) ──────────────
  _updateAbsorb(dt, level) {
    const holdE = Input.heldAny('KeyE');

    // Find closest in-range source
    this.nearSource = null;
    for (const src of level.sources) {
      if (!src.drained && src.inRange(this.cx, this.cy)) {
        this.nearSource = src;
        break;
      }
    }

    if (holdE && this.nearSource && (this.charge < MAX_CHARGE || this.bankedPips < MAX_BANKED_PIPS)) {
      this.absorbing    = true;
      this.absorbTarget = this.nearSource;
      const rate    = ABSORB_RATE;
      const amount  = Math.min(rate * dt, MAX_CHARGE - this.charge, this.nearSource.charge);
      const gained  = this.nearSource.drain(amount);
      this.charge   += gained;
      this._absorbFx = 0.15;
      // Bar full → bank one pip and reset so absorbing continues
      if (this.charge >= MAX_CHARGE && this.bankedPips < MAX_BANKED_PIPS) {
        this.charge     = 0;
        this.bankedPips++;
        this._pipBankFx = 0.5;
      }
    } else {
      this.absorbing    = false;
      this.absorbTarget = null;
    }
  }

  // ── Attack (press SPACE near enemy) ──────────────────────────────
  _updateAttack(dt, level) {
    if (!this.nearEnemy || this._stunTime > 0) return;
    if (Input.pressed('Space') && this._attackCooldown <= 0) {
      this.nearEnemy.hit(level);
      this._attackCooldown = ATTACK_COOLDOWN;
      this._attackFx       = 0.15;
    }
  }

  // ── Discharge (hold SPACE near device — only when no enemy nearby) ────
  // Charge drains gradually — same feel as absorbing, just reversed.
  // Banked pips auto-feed: when the bar empties mid-discharge, pop a pip
  // and refill to MAX_CHARGE so the transfer continues uninterrupted.
  _updateDischarge(dt, level) {
    const holdSpace = Input.heldAny('Space');
    const hasCharge = this.charge > 0 || this.bankedPips > 0;

    // Enemy takes priority — Space is attack when a target is in range
    if (!holdSpace || !this.grounded || !this.nearDevice || !hasCharge || this.nearEnemy) {
      this.discharging     = false;
      this.dischargeTarget = null;
      return;
    }

    const needed = this.nearDevice.required - this.nearDevice.charged;
    if (needed <= 0) {
      this.discharging     = false;
      this.dischargeTarget = null;
      return;
    }

    // Auto-refill from banked pip when bar runs dry mid-discharge
    if (this.charge <= 0 && this.bankedPips > 0) {
      this.charge      = MAX_CHARGE;
      this.bankedPips--;
      this._pipSpendFx = 0.45;  // pip rack flashes to signal the spend
    }

    // Full rate if banked pips are available (each pip = a full bar in reserve).
    // Only scale down when running on bar charge alone.
    const rate = this.bankedPips > 0
      ? DISCHARGE_RATE
      : Math.max(0.5, DISCHARGE_RATE * (this.charge / MAX_CHARGE));
    const amount = Math.min(rate * dt, this.charge, needed);
    this.charge            -= amount;
    this.discharging        = true;
    this.dischargeTarget    = this.nearDevice;
    this._dischargeFx       = 0.15;
    this.nearDevice.receive(amount);
  }

  // ── Spend a banked pip at a gate (press F) ──────────────────────
  _updatePipSpend(dt, level) {
    if (!Input.pressedAny('KeyF')) return;
    if (this.bankedPips <= 0) return;
    if (!this.nearDevice) return;
    const dev = this.nearDevice;
    if (dev.open || dev.on) return;

    // One pip fully powers the device — contribute all remaining charge needed
    const needed = dev.required - dev.charged;
    if (needed <= 0) return;
    dev.receive(needed + 0.001);  // epsilon ensures the epsilon-guard inside receive() fires
    this.bankedPips--;
    this._pipSpendFx  = 0.5;
    dev._pipFlash     = 0.5;     // gate flashes white for clear feedback
  }

  // ── Collect dropped charge pickups ───────────
  _collectPickups(level) {
    for (const p of level.pickups) {
      const barFull  = this.charge >= MAX_CHARGE;
      const pipsFull = this.bankedPips >= MAX_BANKED_PIPS;
      if (!p.done && p.collectable && p.inRange(this.cx, this.cy) && !(barFull && pipsFull)) {
        p.done = true;
        if (!barFull) {
          this.charge = Math.min(MAX_CHARGE, this.charge + p.value);
        } else {
          // Bar full — bank directly into a pip
          this.bankedPips = Math.min(MAX_BANKED_PIPS, this.bankedPips + 1);
          this._pipBankFx = 0.3;
        }
      }
    }
  }

  // ── Update context prompts ────────────────────
  _updateContext(level) {
    // Nearest alive enemy within attack range
    this.nearEnemy = null;
    for (const e of level.enemies) {
      if (!e.alive) continue;
      const dx = e.cx - this.cx, dy = e.cy - this.cy;
      if (Math.sqrt(dx * dx + dy * dy) < ATTACK_RADIUS) {
        this.nearEnemy = e; break;
      }
    }

    this.nearDevice = null;
    for (const gate of level.gates) {
      if (!gate.open && !gate.blockOnly && gate.inRange(this.cx, this.cy)) {
        this.nearDevice = gate; break;
      }
    }
    if (!this.nearDevice) {
      for (const sw of level.switches) {
        if (!sw.on && sw.inRange(this.cx, this.cy)) {
          this.nearDevice = sw; break;
        }
      }
    }
  }

  // ── Stun: freeze input, knock back, flash red ───
  // knockbackVx: horizontal push velocity (negative = left, positive = right)
  stun(duration = STUN_DURATION, knockbackVx = 0) {
    this._stunTime  = Math.max(this._stunTime, duration);
    this._hurtFlash = duration;
    if (knockbackVx !== 0) {
      this.vx = knockbackVx;
      this.vy = Math.min(this.vy, -150); // pop slightly upward on hit
    }
  }

  // ── Charge scatter on hit ────────────────────────────────────────
  // Has charge  → scatter 1 unit as a pickup
  // No charge, has pips → spend a pip (no scatter)
  // Nothing left → die
  scatter(level) {
    if (this.charge > 0) {
      this.charge = Math.max(0, this.charge - 1);
      const xDir = this._facingRight ? -1 : 1;
      const vx   = xDir * (110 + Math.random() * 70);
      const vy   = -170 - Math.random() * 60;
      level.pickups.push(new ChargePickup(this.cx, this.cy, 1, vx, vy));
    } else if (this.bankedPips > 0) {
      this.bankedPips--;
      this._pipSpendFx = 0.4;
    } else {
      // No charge, no pips — dead
      this.dead = true;
    }
  }

  // ── Take damage (charge scatter) — kept for future use ──────────
  // Enemy contact no longer calls this; stun() is used instead.
  takeDamage(level, amount = 1) {
    const lost = Math.min(this.charge, amount);
    this.charge -= lost;
    this._hurtFlash = 0.4;
    for (let i = 0; i < lost; i++) {
      level.pickups.push(new ChargePickup(this.cx, this.cy, 1));
    }
  }

  // ── Draw ──────────────────────────────────────
  draw(ctx) {
    const t           = this._t;
    const hurt        = this._hurtFlash > 0;
    const chargeRatio = this.charge / MAX_CHARGE;

    // Charge-based glow color
    let glowColor;
    if      (chargeRatio > 0.6) glowColor = '#44ddff';
    else if (chargeRatio > 0.3) glowColor = '#ffcc00';
    else                        glowColor = chargeRatio > 0 ? '#ff8800' : '#334455';

    // Absorption arc: source → player
    if (this.absorbing && this.absorbTarget && this._absorbFx > 0) {
      drawLightningArc(ctx,
        this.absorbTarget.cx, this.absorbTarget.cy,
        this.cx, this.cy,
        '#ffe040', t);
    }

    // Discharge arc: player → device
    // More arcs for bigger gates — endpoints spread across gate face
    if (this.discharging && this.dischargeTarget && this._dischargeFx > 0) {
      const tgt = this.dischargeTarget;
      // Arc count: 2 for small gates, 3 for required>=3, 4 for required>=5
      const arcCount = (tgt.required >= 5) ? 4 : (tgt.required >= 3) ? 3 : 2;
      for (let i = 0; i < arcCount; i++) {
        // Distribute end-points horizontally across gate face; oscillate vertically
        const tx = tgt.x + tgt.w * (i + 0.5) / arcCount;
        const ty = tgt.y + tgt.h / 2 + Math.sin(t * 7 + i * 2.3) * (tgt.h * 0.28);
        drawLightningArc(ctx, this.cx, this.cy, tx, ty, '#cc44ff', t + i * 0.22, 8);
      }
    }

    // Attack arc: player → enemy on swing
    if (this._attackFx > 0 && this.nearEnemy) {
      drawLightningArc(ctx,
        this.cx, this.cy,
        this.nearEnemy.cx, this.nearEnemy.cy,
        '#ffffff', t);
    }

    // Sprite: centered horizontally on hitbox; feet row (y=78 in 92px frame) pinned to hitbox bottom
    // Rounding to integers prevents sub-pixel jitter from floating-point position
    const frame = this._sprites.currentFrame;
    const sx    = Math.round(this.cx - SPRITE_W / 2);
    const sy    = Math.round(this.y + this.h - SPRITE_FEET_Y);

    ctx.save();

    // Hurt flash: tint red with rapid flicker
    if (hurt) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 30);
    }

    if (frame && frame.complete && frame.naturalWidth > 0) {
      ctx.drawImage(frame, sx, sy, SPRITE_W, SPRITE_H);
    } else {
      // Fallback box while images load
      ctx.fillStyle = C.PLAYER;
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }

    ctx.restore();

    // Hurt red overlay on top of sprite — alpha fades as stun expires
    if (hurt) {
      ctx.save();
      ctx.globalAlpha  = 0.5 * Math.min(1, this._hurtFlash);
      ctx.fillStyle    = '#ff3333';
      ctx.fillRect(sx, sy, SPRITE_W, SPRITE_H);
      ctx.restore();
    }


  }
}

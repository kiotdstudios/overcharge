// Enemy types: DrainEnemy, PatrolEnemy
// All enemies: contact stuns + scatters charge. Can be killed with the K attack.
// Drops are defined as an array — { type: 'charge', value: N } for now;
// new drop types (keys, upgrades, etc.) get added here later.
import { TILE, STUN_DURATION, STUN_COOLDOWN, GRAVITY, CRATE_CONTACT_PAD, CRATE_SIZE } from './constants.js';
import { ChargePickup } from './electricity.js';
import { drawGlowRect } from './render.js';

function _resolveDrops(drops, cx, cy, level) {
  for (const drop of drops) {
    if (drop.type === 'charge') {
      for (let i = 0; i < drop.value; i++) {
        const ox = (Math.random() - 0.5) * 28;
        level.pickups.push(new ChargePickup(cx + ox, cy, 1));
      }
    }
    // future: keys, powerups, etc. added here
  }
}

// ──────────────────────────────────────────────
// DrainEnemy: fast patrol, hp=2, drops 2 charge
// ──────────────────────────────────────────────
export class DrainEnemy {
  constructor({ x, y, patrolLeft, patrolRight, speed = 60 }) {
    this.x           = x;
    this.y           = y;
    this.w           = 22;
    this.h           = 24;
    this.vx          = speed;
    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;
    this.speed       = speed;
    this._cooldown   = 0;
    this._t          = 0;
    this.alive       = true;
    this.hp          = 2;
    this.maxHp       = 2;
    this._hitFlash   = 0;

    // Drop table — extend with new types later
    this.drops = [{ type: 'charge', value: 2 }];
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, level) {
    if (!this.alive) return;
    this._t        += dt;
    this._cooldown  = Math.max(0, this._cooldown - dt);
    this._hitFlash  = Math.max(0, this._hitFlash  - dt);
    this.x += this.vx * dt;
    if (this.x < this.patrolLeft)  { this.x = this.patrolLeft;  this.vx =  this.speed; }
    if (this.x + this.w > this.patrolRight) {
      this.x = this.patrolRight - this.w; this.vx = -this.speed;
    }
  }

  overlaps(px, py, pw, ph) {
    return !(this.x + this.w <= px || this.x >= px + pw ||
             this.y + this.h <= py || this.y >= py + ph);
  }

  // Called by player attack
  hit(level) {
    if (!this.alive) return;
    this.hp--;
    this._hitFlash = 0.25;
    if (this.hp <= 0) {
      this.alive = false;
      _resolveDrops(this.drops, this.cx, this.cy, level);
    }
  }

  tryContact(player, level) {
    if (!this.alive || this._cooldown > 0) return;
    if (this.overlaps(player.x, player.y, player.w, player.h)) {
      const dir = player.cx <= this.cx ? -1 : 1;
      player.stun(STUN_DURATION, dir * 300);
      player.scatter(level);
      this._cooldown = STUN_COOLDOWN;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const t     = this._t;
    const flash = this._hitFlash > 0;
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);

    drawGlowRect(ctx, this.x, this.y, this.w, this.h,
      flash ? '#ffffff' : '#2a0010',
      flash ? '#ffffff' : '#ff3355',
      flash ? 20 : 12 * pulse);

    ctx.fillStyle = flash
      ? `rgba(255,255,255,0.9)`
      : `rgba(255,50,80,${0.7 * pulse})`;
    ctx.fillRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);

    // Eye antennae
    ctx.fillStyle = flash ? '#ffffff' : '#ff88aa';
    ctx.fillRect(this.x + 4,          this.y - 4, 3, 5);
    ctx.fillRect(this.x + this.w - 7, this.y - 4, 3, 5);

    // HP bar
    _drawHpBar(ctx, this.x, this.y, this.w, this.hp, this.maxHp);
  }
}

// ──────────────────────────────────────────────
// PatrolEnemy: slower patrol, hp=1, drops 1 charge
// ──────────────────────────────────────────────
export class PatrolEnemy {
  constructor({ x, y, patrolLeft, patrolRight, speed = 50 }) {
    this.x           = x;
    this.y           = y;
    this.w           = 20;
    this.h           = 26;
    this.vx          = speed;
    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;
    this.speed       = speed;
    this._cooldown   = 0;
    this.alive       = true;
    this._t          = 0;
    this.hp          = 1;
    this.maxHp       = 1;
    this._hitFlash   = 0;

    this.drops = [{ type: 'charge', value: 1 }];
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    if (!this.alive) return;
    this._t        += dt;
    this._cooldown  = Math.max(0, this._cooldown - dt);
    this._hitFlash  = Math.max(0, this._hitFlash  - dt);
    this.x  += this.vx * dt;
    if (this.x < this.patrolLeft)  { this.x = this.patrolLeft;  this.vx =  this.speed; }
    if (this.x + this.w > this.patrolRight) {
      this.x = this.patrolRight - this.w; this.vx = -this.speed;
    }
  }

  overlaps(px, py, pw, ph) {
    return !(this.x + this.w <= px || this.x >= px + pw ||
             this.y + this.h <= py || this.y >= py + ph);
  }

  hit(level) {
    if (!this.alive) return;
    this.hp--;
    this._hitFlash = 0.25;
    if (this.hp <= 0) {
      this.alive = false;
      _resolveDrops(this.drops, this.cx, this.cy, level);
    }
  }

  tryContact(player, level) {
    if (!this.alive || this._cooldown > 0) return;
    if (this.overlaps(player.x, player.y, player.w, player.h)) {
      const dir = player.cx <= this.cx ? -1 : 1;
      player.stun(STUN_DURATION, dir * 300);
      player.scatter(level);
      this._cooldown = STUN_COOLDOWN;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const t     = this._t;
    const flash = this._hitFlash > 0;
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);

    drawGlowRect(ctx, this.x, this.y, this.w, this.h,
      flash ? '#ffffff' : '#1a0d00',
      flash ? '#ffffff' : '#ff7733',
      flash ? 18 : 10 * pulse);

    ctx.fillStyle = flash
      ? `rgba(255,255,255,0.9)`
      : `rgba(255,120,50,${0.65 * pulse})`;
    ctx.fillRect(this.x + 3, this.y + 3, this.w - 6, this.h - 6);

    const ex = this.vx > 0 ? this.x + this.w - 5 : this.x + 3;
    ctx.fillStyle = flash ? '#ffffff' : '#ffaa66';
    ctx.fillRect(ex, this.y + 8, 3, 3);

    _drawHpBar(ctx, this.x, this.y, this.w, this.hp, this.maxHp);
  }
}

// ── Shared HP bar ─────────────────────────────
function _drawHpBar(ctx, ex, ey, ew, hp, maxHp) {
  const bw  = ew;
  const bh  = 3;
  const by  = ey - 7;
  ctx.fillStyle = '#330000';
  ctx.fillRect(ex, by, bw, bh);
  ctx.fillStyle = hp === maxHp ? '#ff3355' : '#ff8800'; // orange when damaged
  ctx.fillRect(ex, by, bw * (hp / maxHp), bh);
}

// ──────────────────────────────────────────────
// Checkpoint: flag pole — saves respawn position
// ──────────────────────────────────────────────
// Sprite art (Chief-supplied 2026-09-12, "checkpoint_flag"): a 9-frame LED sign.
//   frame 0      = DARK / inactive panel   (byte-identical to the pack's
//                  powered_off_led_pane.png, verified by hash — one set covers
//                  both states, so there is no separate dead file to drift)
//   frames 1..8  = "GAME SAVED" lit, flickering
// All 9 frames are 128x128 with an identical opaque bbox of 17,10..103,117
// (87x108) — measured, so the anchor constants below are derived from real
// pixels rather than guessed padding.
const CP_FRAMES   = 9;
const CP_ART_H    = 56;            // on-screen height of the sign art (~1.9x player)
const CP_SRC      = 128;           // source canvas is square
const CP_BOX_H    = 108;           // measured art height inside the canvas
const CP_BOX_CX   = 60;            // measured art centre x inside the canvas
const CP_BOX_BOT  = 117;           // measured art bottom y inside the canvas
const CP_SCALE    = CP_ART_H / CP_BOX_H;
const CP_DEST     = Math.round(CP_SRC * CP_SCALE);        // dest square size
const CP_OFF_X    = Math.round(CP_BOX_CX  * CP_SCALE);    // centre-x offset
const CP_OFF_Y    = Math.round(CP_BOX_BOT * CP_SCALE);    // ground-align offset
const CP_FPS      = 8;             // matches the generator's flicker cadence

export class Checkpoint {
  constructor({ x, y }) {
    this.x         = x;   // world-space center x
    this.y         = y;   // top of player standing here (ground level)
    this.activated = false;
    this._animT    = 0;
    this._range    = 40;  // px horizontal trigger zone
    this._frame    = 0;   // 0 = dark; 1..8 cycle once activated
    // Guarded so importing this module in a plain Node context (no Image stub)
    // can never throw — the draw path falls back to vector art if unloaded.
    this._imgs = typeof Image !== 'undefined'
      ? Array.from({ length: CP_FRAMES }, (_, i) => {
          const img = new Image();
          img.src = `assets/objects/checkpoint_flag/frame_${String(i).padStart(3, '0')}.png`;
          return img;
        })
      : [];
  }

  tryActivate(player) {
    if (this.activated) return false;
    if (Math.abs(player.cx - this.x) < this._range && player.grounded) {
      this.activated = true;
      return true;
    }
    return false;
  }

  update(dt) {
    this._animT += dt;
    // Same model as the generator: frame 0 is the dead state, frames 1-8 cycle
    // only once the thing is live. An inactive checkpoint must never animate.
    if (!this.activated) { this._frame = 0; return; }
    this._frame += dt * CP_FPS;
    if (this._frame >= CP_FRAMES) this._frame = 1;   // cycle 1..8, never back to 0
    if (this._frame < 1)          this._frame = 1;
  }

  draw(ctx) {
    // ── Sprite path: Chief's checkpoint_flag art ──────────────────────
    const fi  = this.activated ? Math.floor(this._frame) % CP_FRAMES : 0;
    const img = this._imgs[fi];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      // Activated sign glows; a dark panel must not (same rule as the dead gate).
      ctx.shadowBlur  = this.activated ? 10 : 0;
      ctx.shadowColor = '#7fdfff';
      ctx.drawImage(img, 0, 0, CP_SRC, CP_SRC,
        Math.round(this.x - CP_OFF_X), Math.round(this.y - CP_OFF_Y),
        CP_DEST, CP_DEST);
      ctx.restore();
      return;
    }

    // ── Fallback: original vector flag, if the art has not loaded ─────
    const t       = this._animT;
    const poleTop = this.y - 44;
    const poleBot = this.y + 4;
    ctx.save();

    // Pole
    ctx.strokeStyle = this.activated ? '#44ff88' : '#2a4a5a';
    ctx.lineWidth   = 3;
    ctx.shadowBlur  = this.activated ? 8 : 0;
    ctx.shadowColor = '#44ff88';
    ctx.beginPath();
    ctx.moveTo(this.x, poleBot);
    ctx.lineTo(this.x, poleTop);
    ctx.stroke();

    // Flag
    const pulse = this.activated ? 0.65 + 0.35 * Math.abs(Math.sin(t * 9)) : 0.35;
    ctx.shadowBlur  = this.activated ? 14 * pulse : 0;
    ctx.fillStyle   = this.activated
      ? `rgba(40,220,100,${pulse})`
      : 'rgba(30,60,80,0.7)';
    ctx.beginPath();
    ctx.moveTo(this.x,      poleTop);
    ctx.lineTo(this.x + 18, poleTop + 9);
    ctx.lineTo(this.x,      poleTop + 18);
    ctx.closePath();
    ctx.fill();

    // Base label
    ctx.shadowBlur = 0;
    ctx.fillStyle  = this.activated ? '#44ff88' : '#3a5570';
    ctx.font       = 'bold 8px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(this.activated ? 'SAVED' : 'CP', this.x, poleBot + 12);
    ctx.restore();
  }
}

// ── MovingPlatform ─────────────────────────────────────────────────────
// Slides horizontally between x1 and x2 at given speed.
// Player stands on top and rides with it.
export class MovingPlatform {
  constructor({ x, y, w = 96, h = 12, x1, x2, speed = 80 }) {
    this.x  = x;
    this.y  = y;
    this.w  = w;
    this.h  = h;
    this.x1 = x1;
    this.x2 = x2;
    this.vx = speed;  // positive = moving right
  }

  update(dt) {
    this.x += this.vx * dt;
    if (this.x <= this.x1) { this.x = this.x1; this.vx =  Math.abs(this.vx); }
    if (this.x + this.w >= this.x2) { this.x = this.x2 - this.w; this.vx = -Math.abs(this.vx); }
  }

  draw(ctx) {
    // Main platform body
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    // Bright top edge — makes it readable as a surface
    ctx.fillStyle = '#44aadd';
    ctx.fillRect(this.x, this.y, this.w, 3);
    // Side rails
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(this.x,               this.y + 3, 6, this.h - 3);
    ctx.fillRect(this.x + this.w - 6,  this.y + 3, 6, this.h - 3);
    // Glow under platform
    ctx.save();
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#44aadd';
    ctx.fillStyle   = 'rgba(68,170,221,0.15)';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}

// ── DroneEnemy ─────────────────────────────────────────────────────────
// Hovers and patrols. Uses helicopter drone sprites.
// Switches to shooting animation when player is within 180px.
export class DroneEnemy {
  constructor({ x, y, patrolLeft, patrolRight, speed = 55 }) {
    this.x           = x;
    this.y           = y;
    this._baseY      = y;           // hover oscillates around this
    this.w           = 40;
    this.h           = 36;
    this.vx          = speed;
    this.patrolLeft  = patrolLeft;
    this.patrolRight = patrolRight;
    this.speed       = speed;
    this._cooldown   = 0;
    this.alive       = true;
    this._t          = 0;
    this.hp          = 2;
    this.maxHp       = 2;
    this._hitFlash   = 0;
    this.drops       = [{ type: 'charge', value: 2 }];

    // Load sprite frames
    const load = (anim, count) => Array.from({ length: count }, (_, i) => {
      const img = new Image();
      img.src = `assets/sprites/drone/${anim}/frame_${String(i).padStart(3,'0')}.png`;
      return img;
    });
    this._idleFrames     = load('idle', 9);
    this._shootFrames    = load('shooting', 9);
    this._frame          = 0;
    this._fps            = 12;
    this._shooting       = false;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  overlaps(px, py, pw, ph) {
    return !(this.x + this.w <= px || this.x >= px + pw ||
             this.y + this.h <= py || this.y >= py + ph);
  }

  update(dt, level, player) {
    if (!this.alive) return;
    this._t        += dt;
    this._cooldown  = Math.max(0, this._cooldown - dt);
    this._hitFlash  = Math.max(0, this._hitFlash  - dt);

    // Patrol
    this.x += this.vx * dt;
    if (this.x < this.patrolLeft)             { this.x = this.patrolLeft;             this.vx =  this.speed; }
    if (this.x + this.w > this.patrolRight)   { this.x = this.patrolRight - this.w;   this.vx = -this.speed; }

    // Hover bob
    this.y = this._baseY + Math.sin(this._t * 2.5) * 8;

    // Animate
    this._frame += dt * this._fps;
    if (this._frame >= 9) this._frame = 0;
  }

  hit(level) {
    if (!this.alive) return;
    this.hp--;
    this._hitFlash = 0.25;
    if (this.hp <= 0) {
      this.alive = false;
      _resolveDrops(this.drops, this.cx, this.cy, level);
    }
  }

  tryContact(player, level) {
    if (!this.alive || this._cooldown > 0) return;
    const dx = player.cx - this.cx, dy = player.cy - this.cy;
    this._shooting = Math.sqrt(dx*dx + dy*dy) < 180;
    if (this.overlaps(player.x, player.y, player.w, player.h)) {
      const dir = player.cx <= this.cx ? -1 : 1;
      player.stun(STUN_DURATION, dir * 300);
      player.scatter(level);
      this._cooldown = STUN_COOLDOWN;
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const frames = this._idleFrames;  // shooting anim disabled until fixed
    const fi     = Math.floor(this._frame) % 9;
    const img    = frames[fi];
    const flash  = this._hitFlash > 0;

    ctx.save();
    if (flash) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this._t * 40); }
    // Flip horizontally when moving left
    if (this.vx < 0) {
      ctx.translate(this.x + this.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(this.x + this.w / 2), 0);
    }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, this.x, this.y, this.w, this.h);
    } else {
      ctx.fillStyle = '#884400';
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
    ctx.restore();

    _drawHpBar(ctx, this.x, this.y, this.w, this.hp, this.maxHp);
  }
}

// ── Crate (conductive, pushable) ───────────────────────────────────────
// ORDER CRATE_TIMED System 1, semantics ratified in docs/KIRO_RULING_CRATE_TIMED_V1.md.
//
// D1: a crate is a PURE CONDUIT with ZERO capacity. It never stores, buffers or
//     leaks energy — what enters passes straight through to the device it
//     bridges, or is refused at the door. It is a wire, not a power bank.
//     There is deliberately no `charge` field on this class.
// D6: pushed horizontally by walking into it. No lift, no carry, no grab.
// D7: solid to the player and to enemies; crates block each other.
export class Crate {
  constructor({ id, x, y, w = CRATE_SIZE, h = CRATE_SIZE }) {
    this.id       = id;
    this.x        = x;
    this.y        = y;
    this.w        = w;
    this.h        = h;
    this.vy       = 0;
    this.grounded = false;
    this._bridgeFx = 0;   // brief flash while energy is passing through
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // ── D2: contact test — AABB overlap, crate box inflated by CRATE_CONTACT_PAD ──
  touches(dev) {
    const p = CRATE_CONTACT_PAD;
    return this.x - p          < dev.x + dev.w &&
           this.x + this.w + p > dev.x &&
           this.y - p          < dev.y + dev.h &&
           this.y + this.h + p > dev.y;
  }

  // ── D5 (Kiro VETO of first-in-order): resolve what this crate bridges ──
  // Returns { state, target, all } where state is:
  //   'ok'        exactly one eligible device      → conduct into it
  //   'none'      bridges nothing                  → refuse, HUD NOT CONNECTED
  //   'ambiguous' touching 2+ eligible devices     → REFUSE + warn (never guess)
  //
  // Delivery eligibility is GATES + SWITCHES ONLY. ElectricalSource has no
  // receive() method (only drain()), so including it would throw TypeError at
  // runtime — Kiro caught this on paper before implementation.
  // Absorb-through-crate is explicitly deferred to v2.
  //
  // Devices already finished (open gate / switch already on) are skipped: they
  // are not valid targets, and counting them would raise spurious ambiguity for
  // a crate parked next to something already solved.
  //
  // blockOnly gates are EXCLUDED. blockOnly means "switch-only gate; the player
  // cannot discharge into it directly" — letting a crate bridge into one would
  // launder energy around that authoring intent. Derived from the documented
  // meaning of blockOnly, not from the order text; flagged in the report.
  bridgeTarget(level) {
    const hits = [];
    for (const g of level.gates) {
      if (g.open || g.blockOnly) continue;
      if (this.touches(g)) hits.push(g);
    }
    for (const sw of level.switches) {
      if (sw.on) continue;
      if (this.touches(sw)) hits.push(sw);
    }
    if (hits.length === 0) return { state: 'none',      target: null,    all: hits };
    if (hits.length > 1)   return { state: 'ambiguous', target: null,    all: hits };
    return                        { state: 'ok',        target: hits[0], all: hits };
  }

  // ── D6: horizontal push, all-or-nothing ──
  // Returns the dx actually applied (0 = blocked). All-or-nothing is safe at
  // 60fps because per-frame deltas are a few px; it guarantees a crate can never
  // end up partially inside geometry.
  tryMoveX(dx, level) {
    if (dx === 0) return 0;
    const nx = this.x + dx;
    if (nx < 0 || nx + this.w > level.pxW) return 0;      // level edge
    if (this._blockedAt(nx, this.y, level)) return 0;
    this.x = nx;
    return dx;
  }

  _overlaps(nx, ny, r) {
    return nx < r.x + r.w && nx + this.w > r.x &&
           ny < r.y + r.h && ny + this.h > r.y;
  }

  _blockedAt(nx, ny, level) {
    const tL = Math.floor(nx / TILE);
    const tR = Math.floor((nx + this.w - 1) / TILE);
    const tT = Math.floor(ny / TILE);
    const tB = Math.floor((ny + this.h - 1) / TILE);
    for (let tx = tL; tx <= tR; tx++) {
      for (let ty = tT; ty <= tB; ty++) {
        if (level.solidAt(tx, ty)) return true;
      }
    }
    for (const g of level.gates) {                 // a CLOSED gate is a wall
      if (!g.open && this._overlaps(nx, ny, g)) return true;
    }
    for (const c of level.crates) {                // crates block each other
      if (c !== this && this._overlaps(nx, ny, c)) return true;
    }
    return false;
  }

  // ── Gravity + resting ──
  update(dt, level) {
    this._bridgeFx = Math.max(0, this._bridgeFx - dt);
    this.vy = Math.min(this.vy + GRAVITY * dt, 700);

    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.grounded = false;

    if (this.vy >= 0) {
      const tL   = Math.floor(this.x / TILE);
      const tR   = Math.floor((this.x + this.w - 1) / TILE);
      const tBot = Math.floor((this.y + this.h - 1) / TILE);

      for (let tx = tL; tx <= tR; tx++) {                    // solid tiles
        if (level.solidAt(tx, tBot)) { this._land(tBot * TILE); break; }
      }
      if (!this.grounded) {                                  // one-way (tile 2), from above only
        for (let tx = tL; tx <= tR; tx++) {
          if (level.tileAt(tx, tBot) === 2) {
            const surf = tBot * TILE;
            if (prevBottom <= surf + 8) { this._land(surf); break; }
          }
        }
      }
      if (!this.grounded) {                                  // stack on another crate
        for (const c of level.crates) {
          if (c === this) continue;
          if (this.x < c.x + c.w && this.x + this.w > c.x &&
              prevBottom <= c.y + 8 && this.y + this.h >= c.y) { this._land(c.y); break; }
        }
      }
      if (!this.grounded) {                                  // rest on a mover (no carry — D6a)
        for (const pl of level.platforms) {
          if (this.x < pl.x + pl.w && this.x + this.w > pl.x &&
              prevBottom <= pl.y + 8 && this.y + this.h >= pl.y) { this._land(pl.y); break; }
        }
      }
    }
    if (this.y < 0) { this.y = 0; this.vy = 0; }
  }

  _land(surfaceY) {
    this.y        = surfaceY - this.h;
    this.vy       = 0;
    this.grounded = true;
  }

  // Solid AABB for player/enemy resolution (same shape as PowerGate.blocks)
  blocks(rx, ry, rw, rh) {
    return !(rx + rw <= this.x || rx >= this.x + this.w ||
             ry + rh <= this.y || ry >= this.y + this.h);
  }

  // Procedural art — no new asset dependency (same approach as MovingPlatform).
  draw(ctx) {
    const x = Math.round(this.x), y = Math.round(this.y);
    ctx.save();
    ctx.fillStyle = '#4a3a2a';                       // body
    ctx.fillRect(x, y, this.w, this.h);
    ctx.fillStyle = '#6a5238';                       // top face
    ctx.fillRect(x, y, this.w, 4);
    ctx.strokeStyle = '#2a1d12';                     // frame
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, this.w - 2, this.h - 2);
    ctx.beginPath();                                 // diagonal brace
    ctx.moveTo(x + 2, y + this.h - 2);
    ctx.lineTo(x + this.w - 2, y + 2);
    ctx.strokeStyle = '#3a2a1c';
    ctx.stroke();
    // Copper contacts — reads as "this thing conducts"
    ctx.fillStyle = '#cc8844';
    ctx.fillRect(x, y + this.h / 2 - 3, 3, 6);
    ctx.fillRect(x + this.w - 3, y + this.h / 2 - 3, 3, 6);
    if (this._bridgeFx > 0) {                        // energy passing through
      ctx.globalAlpha = Math.min(1, this._bridgeFx * 3);
      ctx.shadowBlur  = 16;
      ctx.shadowColor = '#cc44ff';
      ctx.fillStyle   = 'rgba(204,68,255,0.35)';
      ctx.fillRect(x, y, this.w, this.h);
    }
    ctx.restore();
  }
}

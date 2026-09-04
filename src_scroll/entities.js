// Enemy types: DrainEnemy, PatrolEnemy
// All enemies: contact stuns + scatters charge. Can be killed with Space attack.
// Drops are defined as an array — { type: 'charge', value: N } for now;
// new drop types (keys, upgrades, etc.) get added here later.
import { TILE, STUN_DURATION, STUN_COOLDOWN } from './constants.js';
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
export class Checkpoint {
  constructor({ x, y }) {
    this.x         = x;   // world-space center x
    this.y         = y;   // top of player standing here (ground level)
    this.activated = false;
    this._animT    = 0;
    this._range    = 40;  // px horizontal trigger zone
  }

  tryActivate(player) {
    if (this.activated) return false;
    if (Math.abs(player.cx - this.x) < this._range && player.grounded) {
      this.activated = true;
      return true;
    }
    return false;
  }

  update(dt) { this._animT += dt; }

  draw(ctx) {
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

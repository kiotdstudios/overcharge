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

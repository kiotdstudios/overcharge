// Electrical objects: sources, gates, switches, pickups
import { ABSORB_RADIUS, INTERACT_RADIUS, PICKUP_GRAVITY, PICKUP_LIFETIME, TILE } from './constants.js';
import { drawSparks, drawGlowRect, drawText } from './render.js';

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ──────────────────────────────────────────────
// ElectricalSource: fuse box / battery / generator
// ──────────────────────────────────────────────
export class ElectricalSource {
  constructor({ id, x, y, charge, label = '' }) {
    this.id     = id;
    this.x      = x; this.y = y;
    this.w      = 28; this.h = 28;
    this.charge = charge;
    this.max    = charge;
    this.label  = label;
    this.drained = false;
    this._t      = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) { this._t += dt; }

  inRange(px, py) { return dist(px, py, this.cx, this.cy) < ABSORB_RADIUS; }

  drain(amount) {
    if (this.drained) return 0;
    const actual = Math.min(this.charge, amount);
    this.charge -= actual;
    if (this.charge <= 0) { this.charge = 0; this.drained = true; }
    return actual;
  }

  draw(ctx) {
    const t = this._t;
    if (this.drained) {
      ctx.fillStyle = '#1c1c28';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#2a2a38';
      ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
      ctx.fillStyle = '#444';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ ]', this.cx, this.y + this.h + 10);
      return;
    }
    const pulse = 0.7 + 0.3 * Math.sin(t * 5.5);
    drawGlowRect(ctx, this.x, this.y, this.w, this.h, '#1e1c06', '#ffcc00', 18 * pulse);
    // Inner glow cell
    ctx.fillStyle = `rgba(255,220,40,${0.75 * pulse})`;
    ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
    // Drain bar above source — full→empty as player absorbs
    const bW = this.w + 8, bH = 6;
    const bX = this.x - 4, bY = this.y - 10;
    const fill = this.max > 0 ? this.charge / this.max : 0;
    ctx.fillStyle = '#332a00';
    ctx.fillRect(bX, bY, bW, bH);
    if (fill > 0) {
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffcc00';
      ctx.fillStyle   = '#ffe040';
      ctx.fillRect(bX, bY, Math.round(bW * fill), bH);
      ctx.shadowBlur  = 0;
    }
    // Sparkle
    drawSparks(ctx, this.cx, this.cy, t, '#ffee66', 5, 10);
    // Label
    if (this.label) {
      ctx.fillStyle = '#aa8800';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.cx, this.y + this.h + 10);
    }
  }
}

// ──────────────────────────────────────────────
// PowerGate: exit or barrier — opens when charged
// ──────────────────────────────────────────────
export class PowerGate {
  constructor({ id, x, y, w, h, required, isExit = false, blockOnly = false, label = '' }) {
    this.id        = id;
    this.x         = x; this.y = y;
    this.w         = w; this.h = h;
    this.required  = required;
    this.charged   = 0;
    this.open      = false;
    this.isExit    = isExit;
    this.blockOnly = blockOnly; // switch-only barrier — player can't discharge into it
    this.label     = label;
    this._t        = 0;
    this._openAge  = 0;
    this._pipFlash = 0;  // white flash when powered by a banked pip
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    this._t += dt;
    if (this.open) this._openAge += dt;
    this._pipFlash = Math.max(0, this._pipFlash - dt);
  }

  inRange(px, py) {
    // Use nearest-point-on-AABB distance so full-height gates work
    // even when the player is standing at ground level
    const cx = Math.max(this.x, Math.min(px, this.x + this.w));
    const cy = Math.max(this.y, Math.min(py, this.y + this.h));
    return dist(px, py, cx, cy) < INTERACT_RADIUS;
  }

  receive(amount) {
    if (this.open) return false;
    const take = Math.min(amount, this.required - this.charged);
    this.charged += take;
    // Epsilon guard: float drip-charging never lands on exactly N.0
    if (this.charged >= this.required - 1e-9) { this.charged = this.required; this.open = true; return true; }
    return false;
  }

  // Returns true if this gate blocks the AABB (rx,ry,rw,rh)
  blocks(rx, ry, rw, rh) {
    if (this.open) return false;
    return !(rx + rw <= this.x || rx >= this.x + this.w ||
             ry + rh <= this.y || ry >= this.y + this.h);
  }

  draw(ctx) {
    const t = this._t;
    if (this.open) {
      const alpha = Math.max(0, 1 - this._openAge * 3);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawGlowRect(ctx, this.x, this.y, this.w, this.h, '#3a0066', '#cc44ff', 20);
      ctx.restore();
      return;
    }

    const fill    = this.required > 0 ? Math.min(1, this.charged / this.required) : 0;
    const fillH   = Math.round(this.h * fill);
    const splitY  = this.y + this.h - fillH; // boundary: animated above, solid below

    const pulse = 0.55 + 0.45 * Math.sin(t * 3.8);
    ctx.save();
    ctx.shadowBlur  = 20 * pulse;
    ctx.shadowColor = '#9910dd';
    // Animated strips only in the uncharged (top) portion
    for (let yy = this.y; yy < splitY; yy += 9) {
      const alpha = 0.5 + 0.5 * Math.sin(t * 6 + yy * 0.15);
      ctx.fillStyle = `rgba(180, 55, 255, ${alpha})`;
      ctx.fillRect(this.x, yy, this.w, Math.min(5, splitY - yy));
    }
    ctx.restore();

    // Solid charged fill — bottom rising upward, no animation
    if (fillH > 0) {
      ctx.save();
      ctx.shadowBlur  = 18;
      ctx.shadowColor = '#cc44ff';
      ctx.fillStyle   = '#cc44ff';
      ctx.fillRect(this.x, splitY, this.w, fillH);
      ctx.restore();
    }

    // blockOnly barriers just show a lock — no charge bar, no player interaction
    if (this.blockOnly) {
      ctx.fillStyle = '#9922cc';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#cc44ff';
      const labelY = Math.min(this.y + this.h + 14, 435);
      ctx.fillText('LOCKED', this.cx, labelY);
      ctx.shadowBlur = 0;
      return;
    }
    // Horizontal progress bar pinned just above ground level — always visible
    const barW = 48, barH = 6;
    const barX = this.cx - barW / 2;
    const barY = 362;
    ctx.fillStyle = '#1a0030';
    ctx.fillRect(barX, barY, barW, barH);
    if (fill > 0) {
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#cc44ff';
      ctx.fillStyle   = '#cc44ff';
      ctx.fillRect(barX, barY, Math.round(barW * fill), barH);
      ctx.shadowBlur  = 0;
    }

    // EXIT label only — no numbers, bar above conveys progress
    if (this.isExit) {
      const labelY = Math.min(this.y + this.h + 14, 435);
      ctx.fillStyle = '#aa44ff';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('EXIT', this.cx, labelY);
      ctx.shadowBlur = 0;
    }

    // Pip-spend flash: bright white burst over the gate
    if (this._pipFlash > 0) {
      const alpha = this._pipFlash * 1.8;  // fades out quickly
      ctx.save();
      ctx.globalAlpha = Math.min(0.85, alpha);
      ctx.shadowBlur  = 40;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle   = '#cc44ff';
      ctx.fillRect(this.x - 2, this.y, this.w + 4, this.h);
      ctx.restore();
    }
  }
}

// ──────────────────────────────────────────────
// Switch: spend charge to trigger linked gate/barrier
// ──────────────────────────────────────────────
export class Switch {
  constructor({ id, x, y, required, linkedId, label = '' }) {
    this.id       = id;
    this.x        = x; this.y = y;
    this.w        = 22; this.h = 22;
    this.required = required;
    this.charged  = 0;
    this.on       = false;
    this.linkedId = linkedId;
    this.label    = label;
    this._t       = 0;
    this._pipFlash = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) { this._t += dt; this._pipFlash = Math.max(0, this._pipFlash - dt); }

  inRange(px, py) { return dist(px, py, this.cx, this.cy) < INTERACT_RADIUS; }

  receive(amount) {
    if (this.on) return false;
    this.charged += amount;
    if (this.charged >= this.required - 1e-9) { this.charged = this.required; this.on = true; return true; }
    return false;
  }

  draw(ctx) {
    const t     = this._t;
    const color = this.on ? '#44ff88' : '#ff8800';
    const pulse = this.on ? 1 : (0.5 + 0.5 * Math.sin(t * 4));
    drawGlowRect(ctx, this.x, this.y, this.w, this.h,
      this.on ? '#082010' : '#1a0a00', color, 14 * pulse);
    ctx.fillStyle = `rgba(${this.on ? '60,255,120' : '255,140,0'},${0.8 * pulse})`;
    ctx.fillRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);

    // Fill bar above switch — empty→full as player charges it
    if (!this.on) {
      const sbW = this.w + 8, sbH = 5;
      const sbX = this.x - 4, sbY = this.y - 9;
      const sfill = this.required > 0 ? this.charged / this.required : 0;
      ctx.fillStyle = '#1a0a00';
      ctx.fillRect(sbX, sbY, sbW, sbH);
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#ff8800';
      ctx.fillStyle   = '#ff8800';
      ctx.fillRect(sbX, sbY, Math.round(sbW * sfill), sbH);
      ctx.shadowBlur  = 0;
    }
    ctx.fillStyle = color;
    ctx.font      = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.on ? 'ON' : 'SW', this.cx, this.y + this.h + 11);
    if (this.label) {
      ctx.fillStyle = '#888';
      ctx.fillText(this.label, this.cx, this.y + this.h + 22);
    }
    // Pip-spend flash
    if (this._pipFlash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.9, this._pipFlash * 1.8);
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle   = '#44ff88';
      ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
      ctx.restore();
    }
  }
}

// ──────────────────────────────────────────────
// ChargePickup: burst out on damage, can be recollected
// ──────────────────────────────────────────────
export class ChargePickup {
  // vx/vy: override initial velocity for directional scatter (null = random)
  constructor(x, y, value = 1, vx = null, vy = null) {
    this.x      = x;
    this.y      = y;
    this.value  = value;
    this.vx     = vx !== null ? vx : (Math.random() - 0.5) * 90;
    this.vy     = vy !== null ? vy : (-130 - Math.random() * 80);
    this.life   = PICKUP_LIFETIME;
    this.maxLife = PICKUP_LIFETIME;
    this.done   = false;
    this._t     = 0;
  }

  update(dt, level = null) {
    this._t += dt;
    this.life -= dt;
    if (this.life <= 0) { this.done = true; return; }
    this.vy += PICKUP_GRAVITY * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vx *= 0.97;
    // Bounce off solid tiles — use level tilemap when available
    const foot = this.y + 7;
    if (level) {
      const tx = Math.floor(this.x / TILE);
      const ty = Math.floor(foot / TILE);
      if (level.solidAt(tx, ty) && this.vy > 0) {
        this.y  = ty * TILE - 7;
        this.vy *= -0.4;
        this.vx *= 0.8;
      }
    } else {
      // Fallback: canvas-bottom clamp
      if (foot > 377) { this.y = 370; this.vy *= -0.4; this.vx *= 0.8; }
    }
    // Horizontal wall clamp — use level bounds so drops don't teleport on scroll levels
    const maxX = level ? level.pxW - 4 : 796;
    if (this.x < 4)    { this.x = 4;    this.vx =  Math.abs(this.vx) * 0.6; }
    if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx) * 0.6; }
  }

  // Not collectable for the first 0.35s — scatter pickups spawn on the player
  // and would be instantly re-absorbed without this delay
  get collectable() { return this._t >= 0.35; }

  inRange(px, py) { return dist(px, py, this.x, this.y) < 30; }

  draw(ctx) {
    const t     = this._t;
    const alpha = Math.min(1, this.life * 1.5);
    const pulse = 0.8 + 0.2 * Math.sin(t * 14);
    const s     = pulse * 1.8;  // scale up bolt size
    // Classic ⚡ bolt polygon — 8 points, ~14px tall
    // Upper bar slants right-to-left, notch steps right, lower bar continues
    const bx = this.x, by = this.y;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur  = 14 * pulse;
    ctx.shadowColor = '#ffcc00';
    ctx.fillStyle   = '#ffe040';
    ctx.beginPath();
    ctx.moveTo(bx - 2*s, by - 7*s);   // top-left
    ctx.lineTo(bx + 2*s, by - 7*s);   // top-right
    ctx.lineTo(bx + 1*s, by        );  // upper-bar bottom-right
    ctx.lineTo(bx + 3*s, by        );  // notch: step right
    ctx.lineTo(bx + 2*s, by + 7*s );  // lower-bar bottom-right
    ctx.lineTo(bx - 2*s, by + 7*s );  // lower-bar bottom-left
    ctx.lineTo(bx - 1*s, by        );  // lower-bar top-left
    ctx.lineTo(bx - 3*s, by        );  // notch: step left
    ctx.closePath();
    ctx.fill();
    // Bright inner highlight
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle   = '#fff8c0';
    ctx.beginPath();
    ctx.moveTo(bx - 1*s, by - 5*s);
    ctx.lineTo(bx + 1*s, by - 5*s);
    ctx.lineTo(bx + 0,   by - 1*s);
    ctx.lineTo(bx + 2*s, by - 1*s);
    ctx.lineTo(bx + 1*s, by + 5*s);
    ctx.lineTo(bx - 1*s, by + 5*s);
    ctx.lineTo(bx + 0,   by + 1*s);
    ctx.lineTo(bx - 2*s, by + 1*s);
    ctx.closePath();
    ctx.fill();
    // Flash warning ring when about to expire
    if (this.life < 1.5) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(bx, by, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

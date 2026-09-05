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
    this.w      = 28; this.h = 28;  // logical hitbox; sprite is drawn 64x64 above
    this.charge = charge;
    this.max    = charge;
    this.label  = label;
    this.drained = false;
    this._t      = 0;
    this._frame  = 0;
    this._frameFps = 8;
    // Load generator 1 sprite frames
    this._frames = Array.from({ length: 9 }, (_, i) => {
      const img = new Image();
      img.src = `assets/sprites/generator 1/frame_${String(i).padStart(3, '0')}.png`;
      return img;
    });
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    this._t += dt;
    // Advance animation frames 1-8 when active (frame 0 = drained state)
    if (!this.drained) {
      this._frame += dt * this._frameFps;
      // cycle frames 1–8
      if (this._frame >= 9) this._frame = 1;
      if (this._frame < 1)  this._frame = 1;
    }
  }

  inRange(px, py) { return dist(px, py, this.cx, this.cy) < ABSORB_RADIUS; }

  drain(amount) {
    if (this.drained) return 0;
    const actual = Math.min(this.charge, amount);
    this.charge -= actual;
    if (this.charge <= 0) { this.charge = 0; this.drained = true; }
    return actual;
  }

  draw(ctx) {
    const t  = this._t;
    // Pick sprite: frame 0 when drained, animated frames 1-8 when active
    const fi  = this.drained ? 0 : Math.floor(this._frame) % 9;
    const img = this._frames[fi];

    if (img && img.complete && img.naturalWidth > 0) {
      // Draw 64x64 sprite centered on hitbox, bottom of sprite = bottom of hitbox
      const dX = this.cx - 32;
      const dY = this.y + this.h - 64;
      ctx.drawImage(img, dX, dY, 64, 64);
    } else {
      // Fallback box while images load
      ctx.fillStyle = this.drained ? '#1c1c28' : '#ffcc00';
      ctx.fillRect(this.cx - 14, this.y, 28, 28);
    }

    // Drain bar above — full→empty as player absorbs (hidden when drained)
    if (!this.drained) {
      const dY2 = this.y + this.h - 64;
      const bW = 64, bH = 5;
      const bX = this.cx - 32, bY = dY2 - 8;
      const fill = this.max > 0 ? this.charge / this.max : 0;
      ctx.fillStyle = '#332a00';
      ctx.fillRect(bX, bY, bW, bH);
      if (fill > 0) {
        ctx.shadowBlur  = 6;
        ctx.shadowColor = '#ffcc00';
        ctx.fillStyle   = '#ffe040';
        ctx.fillRect(bX, bY, Math.round(bW * fill), bH);
        ctx.shadowBlur  = 0;
      }
    }


  }
}

// ──────────────────────────────────────────────
// PowerGate: exit or barrier — opens when charged
//
// Visual states (Aki spritesheet `gate_electric_spritesheet.png`, 9 cols x 3 rows, 128x128 cells):
//   Row 0: static base (unused — we play idle instead when closed)
//   Row 1: 9-frame idle       → CLOSED, no active discharge
//   Row 2: 9-frame charging   → CLOSED, currently receiving charge (POWERED-REACTION)
//   `gate_electric_open.png` single 64x128 frame → OPEN state (fades out over 1s)
//
// Idle/charging switch is triggered by `receive()` bumping `_reactT`;
// while _reactT > 0 the gate plays the 'charging' animation, otherwise 'idle'.
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
    // Sprite art — fallback + animated sheet + open frame.
    // Attach onload logging so we can verify in the browser devtools
    // that the sheet actually loaded (prior "static gate" report was
    // most likely: the sheet loaded but the visible size (40×64 into
    // the hitbox slot) made the plasma animation subtle. Fix below is
    // to draw at the sprite's natural 64×128 aspect anchored on the
    // hitbox — animation clearly visible; hitbox untouched).
    this._imgClosed = new Image();
    this._imgClosed.src = 'assets/objects/gate_closed.png';
    this._sheet     = new Image();
    this._sheet.addEventListener('load',  () => console.info('[gate] spritesheet loaded:',  this._sheet.naturalWidth + 'x' + this._sheet.naturalHeight));
    this._sheet.addEventListener('error', () => console.warn('[gate] spritesheet FAILED to load — falling back to static gate_closed.png'));
    this._sheet.src = 'assets/objects/gate_electric_spritesheet.png';
    this._openImg   = new Image();
    this._openImg.src = 'assets/objects/gate_electric_open.png';
    this._frame     = 0;
    this._fps       = 8;
    this._reactT    = 0;   // >0 → play 'charging' row instead of 'idle'
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt) {
    this._t += dt;
    if (this.open) this._openAge += dt;
    this._pipFlash = Math.max(0, this._pipFlash - dt);
    this._reactT   = Math.max(0, this._reactT   - dt);
    this._frame    = (this._frame + dt * this._fps) % 9;
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
    if (take > 0) this._reactT = 0.18;   // ~11 frames of 'charging' anim per receive tick
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

    // ── Draw geometry (independent from hitbox) ──
    // The hitbox (this.x, this.y, this.w, this.h) is what the player
    // collides with (e.g. 40x64 in Level 1). The sprite renders LARGER
    // so the animation is unambiguously visible. Same convention the
    // generator sprite uses (28x28 hitbox, 64x64 sprite). Anchor:
    //   horizontally centered on hitbox center
    //   vertically bottom-aligned to hitbox bottom
    // Sprite size = 64x128 (matches gate_electric_open.png native +
    // matches the centered 64-wide crop of each 128x128 sheet cell).
    const spriteW = 64;
    const spriteH = 128;
    const dX      = Math.round(this.cx - spriteW / 2);
    const dY      = (this.y + this.h) - spriteH;   // bottom-aligned

    // ── OPEN state: bright flash → fade to invisible over ~1.0s ──
    if (this.open) {
      const age = this._openAge;
      if (age >= 1.0) return;
      const alpha = age < 0.5 ? 1.0 : Math.max(0, 1.0 - (age - 0.5) / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;
      if (age < 0.2) { ctx.shadowBlur = 30; ctx.shadowColor = '#ffffff'; }
      else            { ctx.shadowBlur = 16; ctx.shadowColor = '#cc44ff'; }
      const openImg = this._openImg;
      if (openImg && openImg.complete && openImg.naturalWidth > 0) {
        ctx.drawImage(openImg, dX, dY, spriteW, spriteH);
      } else {
        drawGlowRect(ctx, this.x, this.y, this.w, this.h, '#3a0066', '#cc44ff', 20);
      }
      ctx.restore();
      return;
    }

    const fill = this.required > 0 ? Math.min(1, this.charged / this.required) : 0;

    // ── CLOSED state: play spritesheet idle (row 1) or charging (row 2) ──
    // Sheet is 1152×384: 9 cols × 3 rows of 128×128 cells.
    //   Row 0 = base (unused)   Row 1 = idle   Row 2 = charging
    // Each frame's 128×128 cell is cropped centered to 64×128 so the
    // gate art (which is portrait-shaped) is drawn at its natural
    // aspect into a 64×128 destination.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sheet = this._sheet;
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const CELL = 128;
      const fi   = Math.floor(this._frame) % 9;
      const row  = this._reactT > 0 ? 2 : 1;
      const sx   = fi * CELL + 32;   // centered 64-wide crop within 128-wide cell
      const sy   = row * CELL;
      ctx.shadowBlur  = this._reactT > 0 ? 18 : 8;
      ctx.shadowColor = '#cc44ff';
      ctx.drawImage(sheet, sx, sy, 64, CELL, dX, dY, spriteW, spriteH);
    } else if (this._imgClosed.complete && this._imgClosed.naturalWidth > 0) {
      // Sheet not loaded yet — legacy static gate for one frame or two.
      ctx.drawImage(this._imgClosed, dX, dY, spriteW, spriteH);
    }
    ctx.restore();

    // Charge fill overlay -- bright strip rising from bottom as player charges gate
    if (fill > 0 && fill < 1) {
      const fillH  = Math.round(this.h * fill);
      const splitY = this.y + this.h - fillH;
      ctx.save();
      ctx.globalAlpha  = 0.45;
      ctx.shadowBlur   = 14;
      ctx.shadowColor  = '#cc44ff';
      ctx.fillStyle    = '#cc44ff';
      ctx.fillRect(this.x + 2, splitY, this.w - 4, fillH);
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
    // Bounce off solid tiles and one-way platforms (tile 1 and 2)
    const foot = this.y + 7;
    if (level) {
      const tx   = Math.floor(this.x / TILE);
      const ty   = Math.floor(foot / TILE);
      const tile = level.tileAt(tx, ty);
      if ((tile === 1 || tile === 2 || tile >= 10) && this.vy > 0) {   // solid or platform
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

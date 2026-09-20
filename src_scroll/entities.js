// Enemy types: DrainEnemy, PatrolEnemy
// All enemies: contact stuns + scatters charge. Can be killed with the K attack.
// Drops are defined as an array — { type: 'charge', value: N } for now;
// new drop types (keys, upgrades, etc.) get added here later.
import { TILE, STUN_DURATION, STUN_COOLDOWN, GRAVITY, CRATE_CONTACT_PAD, CRATE_SIZE, INTERACT_RADIUS } from './constants.js';
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
      // NO glow (Chief 2026-09-12). The art already carries its own lighting —
      // an added canvas shadow just smeared a halo around the sign.
      ctx.shadowBlur = 0;
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

  // ── DRONE COMBAT DIAL (Chief 2026-09-17, vision decoupled ORCHA 12/14) ──
  // One place to retune. Distances in px, times in seconds.
  //
  // WHY visionX AND visionY, NOT ONE RADIUS:
  // Drones fly, the player walks, so in a side-scroller the threat sits
  // permanently ABOVE the target. A symmetric radius spends its whole budget on
  // vertical separation before horizontal distance matters at all. Level 3
  // measured: drone y=200, spawn y=482, centre-to-centre separation 280px against
  // a 220px radius -> the drone could NEVER see the player, at any horizontal
  // distance. Chief: "drone didnt try to chase me."
  //
  // Raising the radius to 320 was REJECTED (ORCHA 12): that also extends
  // horizontal reach to 320 and the drone aggros from off-screen, which is worse.
  // The axes have to be decoupled.
  static CFG = Object.freeze({
    // O10 — CHIEF'S DIAL. He said outright "will test and see how that feels", so
    // these three are expected to move. Keep them together and keep the relationship.
    visionX: 240,       // horizontal reach — roughly one screen-third
    visionY: 340,       // vertical tolerance — covers elevated drone (y=200)
                        // over grounded player (y=482); real gap is 280px
    CHASE_MULT: 1.35,   // chase speed = speed * this
    LEASH: 160,         // may chase this far past patrol bounds before stopping
    FIRE_ARC: 340,      // A13.5: = visionY. 300 left a 40px blind band where drone saw but never shot
    SHOT_CD: 1.1,       // seconds between blasts
    ALERT_TIME: 0.55,   // O9: telegraph. Alert shows for this long BEFORE the
                        // first shot, so being hit has a warning and reads as a
                        // lesson rather than as unfair
    DEAGGRO_TIME: 0.7,  // O9: how long the "lost him" tell stays visible
    B_W: 14, B_H: 6,    // blast size
    B_SPEED: 260,       // blast px/sec
    B_LIFE: 1.6,        // blast lifetime in seconds
  });

  update(dt, level, player) {
    const C = DroneEnemy.CFG;
    if (!this.alive) { this._updateBlasts(dt, level, player); return; }
    this._t        += dt;
    this._cooldown  = Math.max(0, this._cooldown - dt);
    this._hitFlash  = Math.max(0, this._hitFlash  - dt);
    this._shotCd    = Math.max(0, (this._shotCd ?? 0) - dt);

    // ── VISION -> ALERT -> CHASE -> SHOOT ─────────────────────────────
    // CHIEF 2026-09-19 10:38: "the drone does only chase a bit and stays locked to
    // the edge of the next platform ... it should follow the player until the player
    // gets out of its vision for more than x amount ... the drone stops and doesnt
    // move past a certain point".
    //
    // The LEASH clamp is GONE. It pinned the chase to patrolLeft-160 .. patrolRight+160
    // — on Level 3 that is x 240..720, which is the invisible wall he hit. The leash
    // existed for one reason: terrain used to stop at x=1216 with 62% void beyond, so
    // an unleashed drone would fly out over nothing. The 03:28 L3 finish extended
    // terrain to the full declared width (col 99 / x=3200), so that reason is gone and
    // the clamp is now pure obstruction.
    //
    // Replaced by a LEVEL-BOUNDS clamp, which protects the original concern (never
    // leave authored space) without capping pursuit anywhere inside the level.
    //
    // Pursuit also PERSISTS through DEAGGRO_TIME rather than ending the instant sight
    // breaks. Chief: the current timing "is perfect", so DEAGGRO_TIME is untouched at
    // 0.7s — it is now what governs how long he must stay out of sight, instead of
    // only how long the "lost him" tell renders. Without this the drone froze whenever
    // he passed behind any pillar for a single frame.
    //
    // O9 (Chief: "needs an alert animation to know it found u"): aggro is now a
    // THREE-phase state machine, not a boolean. On first sight the drone enters
    // ALERT and cannot fire for ALERT_TIME; only then does it start shooting. Being
    // hit therefore always has a warning, which is what makes Level 3's lesson read
    // as a lesson instead of as unfair. Contrast the F7 fence ruling where
    // immediacy won — here the warning IS the mechanic.
    const canSee   = !!player && this._sees(player, level);
    const wasAggro = this._aggro === true;

    if (canSee && !wasAggro) {
      this._alertT   = C.ALERT_TIME;      // just spotted him — telegraph first
      this._deaggroT = 0;
    } else if (!canSee && wasAggro) {
      this._deaggroT = C.DEAGGRO_TIME;    // lost him — distinct "gave up" tell
      this._alertT   = 0;
    }
    this._aggro    = canSee;
    this._alertT   = Math.max(0, (this._alertT   ?? 0) - dt);
    this._deaggroT = Math.max(0, (this._deaggroT ?? 0) - dt);
    // Armed only once the telegraph has elapsed.
    const armed = canSee && this._alertT <= 0;

    // `pursuing` is the chase gate: in sight, OR within the de-aggro grace window.
    // Firing stays gated on `armed` (which requires canSee), so the drone follows
    // through a brief break in sight but never shoots at where it guesses he is.
    //
    // `!!player` is LOAD-BEARING, not defensive noise. Without it the grace window
    // could enter this branch on a frame where the caller passed no player at all and
    // `player.cx` threw a TypeError mid-chase. My own suite caught that before it
    // shipped — the level-complete and death frames legitimately tick with no player.
    const pursuing = !!player && (canSee || this._deaggroT > 0);

    if (pursuing) {
      const dir = Math.sign(player.cx - this.cx) || 1;
      // Level bounds, not patrol bounds. `level.pxW` is the authored width; the
      // fallback keeps the old behaviour if a caller ever omits the level, rather
      // than letting the drone run to infinity.
      const minX = 0;
      const maxX = (level && level.pxW ? level.pxW : this.patrolRight + C.LEASH) - this.w;
      this.x  = Math.max(minX, Math.min(maxX, this.x + dir * this.speed * C.CHASE_MULT * dt));
      this.vx = dir * this.speed;                  // keeps the sprite facing correctly
      if (armed && this._shotCd <= 0 && Math.abs(player.cy - this.cy) < C.FIRE_ARC) {
        this._fire(dir, player);
        this._shotCd = C.SHOT_CD;
      }
    } else {
      // O12: smooth patrol return -- no instant clamp. If the drone chased past its
      // patrol bounds (up to LEASH px), move back at most speed*dt per frame.
      // A hard clamp here was the one-frame teleport Chief reported on de-aggro.
      if (this.x < this.patrolLeft) {
        this.vx = this.speed;
        this.x  = Math.min(this.x + this.speed * dt, this.patrolLeft);
      } else if (this.x + this.w > this.patrolRight) {
        this.vx = -this.speed;
        this.x  = Math.max(this.x - this.speed * dt, this.patrolRight - this.w);
      } else {
        this.x += this.vx * dt;
        if (this.x < this.patrolLeft)           { this.x = this.patrolLeft;           this.vx =  this.speed; }
        if (this.x + this.w > this.patrolRight) { this.x = this.patrolRight - this.w; this.vx = -this.speed; }
      }
    }

    this.y = this._baseY + Math.sin(this._t * 2.5) * 8;   // hover bob

    // The 9 shooting frames are for FIRING, not for noticing (ORCHA 12 §3), so the
    // shooting pose follows `armed`, never the alert phase.
    this._shooting = armed;
    this._frame += dt * this._fps;
    if (this._frame >= 9) this._frame = 0;

    this._updateBlasts(dt, level, player);
  }

  // Decoupled axes (ORCHA 12/14). NOT a radius — see the CFG comment for why a
  // symmetric radius is structurally wrong for a flying threat over a walking
  // target. Rectangular test: generous vertically, tight horizontally.
  //
  // O10 / ORCHA 18 — TERRAIN-BLOCKED and NARROW, per Chief: "notices me through the
  // floor - big no no; it should only notice me if im on the same horizontal axis as
  // me and x tiles away". Kiro's earlier "leave terrain-awareness alone" ruling is
  // REVERSED — he saw it matter in play.
  //
  // This is ONE loop scoped to drone sensing, not a general raycast engine. Do not
  // generalise it.
  _sees(player, level) {
    const C = DroneEnemy.CFG;
    if (Math.abs(player.cx - this.cx) >= C.visionX) return false;
    if (Math.abs(player.cy - this.cy) >= C.visionY) return false;
    return this._hasLineOfSight(player, level);
  }

  // Walks the line from drone centre to player centre sampling level.tileAt(). Any
  // solid sample between them breaks sight. Solidity uses the SAME rule as
  // Level.solidAt (v === 1 || v >= 10) so tile 2 one-way platforms stay see-through,
  // which is correct: you can see someone through a platform you can jump up into.
  //
  // Endpoints are deliberately skipped — the drone's own tile and the player's own
  // tile must never block, or a drone hugging a ceiling would blind itself.
  //
  // Fails OPEN when no level is supplied, so any caller without terrain data behaves
  // exactly as before rather than going silently blind. The suite always drives this
  // through Level.update, which does supply it.
  _hasLineOfSight(player, level) {
    if (!level || typeof level.tileAt !== 'function') return true;
    const x0 = this.cx, y0 = this.cy;
    const dx = player.cx - x0, dy = player.cy - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const steps = Math.ceil(dist / 8);          // ~8px sampling, <= ~40 samples here
    for (let i = 1; i < steps; i++) {
      const t  = i / steps;
      const v  = level.tileAt(Math.floor((x0 + dx * t) / TILE), Math.floor((y0 + dy * t) / TILE));
      if (v === 1 || v >= 10) return false;
    }
    return true;
  }

  // O9 tell state, exposed so tests assert STATE rather than pixels — the same
  // reasoning as PowerGate.visualState (ORCHA 06).
  get alertState() {
    if (!this.alive)          return 'dead';
    if ((this._alertT ?? 0) > 0)   return 'alert';      // spotted, not yet firing
    if (this._aggro)          return 'engaged';         // armed and shooting
    if ((this._deaggroT ?? 0) > 0) return 'lost';       // gave up, still showing it
    return 'patrol';
  }

  // Blasts are AIMED, not purely horizontal. A flying drone shooting level would
  // send every shot over a grounded player's head — the third form of the same
  // flying-vs-walking mismatch. Velocity is normalised so the blast speed is
  // constant regardless of angle.
  _fire(dir, player) {
    const C = DroneEnemy.CFG;
    // Muzzle: offset along the FIRING DIRECTION, not blindly along X.
    // A blind `cx + dir*w/2` muzzle put the blast 8px right of centre while the aim
    // vector was computed FROM cx — so a near-vertical shot at a player directly
    // below travelled down x=544 while the player box spanned 512..536 and missed
    // by 8px, every time. Traced frame-by-frame; the blast passed clean beside him.
    let ax = dir, ay = 0;
    if (player) {
      const dx = player.cx - this.cx, dy = player.cy - this.cy;
      const len = Math.hypot(dx, dy) || 1;
      ax = dx / len; ay = dy / len;
    }
    const muzzle = this.w / 2;
    this._blasts = this._blasts || [];
    this._blasts.push({
      x: this.cx + ax * muzzle - C.B_W / 2,
      y: this.cy + ay * muzzle - C.B_H / 2,
      vx: ax * C.B_SPEED,
      vy: ay * C.B_SPEED,
      life: C.B_LIFE, dir,
    });
  }

  // Blasts live ON THE DRONE, not on the level. Self-contained: no level-schema
  // field and no level.js wiring, so an absent `enemies` array still means exactly
  // zero behavioural change for every existing level.
  _updateBlasts(dt, level, player) {
    if (!this._blasts || !this._blasts.length) return;
    const C = DroneEnemy.CFG;
    for (const b of this._blasts) {
      b.x += b.vx * dt;
      b.y += (b.vy || 0) * dt;      // aimed blasts descend; `|| 0` keeps old flat
                                    // blasts valid if any are mid-flight on reload
      b.life -= dt;
      if (b.life <= 0 || !player) continue;
      // A hit routes through the SAME player methods contact damage uses, so a
      // blast cannot invent its own energy path (single-authority rule).
      const hit = !(b.x + C.B_W <= player.x || b.x >= player.x + player.w ||
                    b.y + C.B_H <= player.y || b.y >= player.y + player.h);
      if (hit && this._cooldown <= 0) {
        player.stun(STUN_DURATION, b.dir * 260);
        player.scatter(level);
        this._cooldown = STUN_COOLDOWN;
        b.life = 0;
      }
    }
    this._blasts = this._blasts.filter(b => b.life > 0);
  }

  drawBlasts(ctx) {
    if (!this._blasts || !this._blasts.length) return;
    const C = DroneEnemy.CFG;
    // Procedural blast. The PixelLab sprite (job 377c6617) GENERATED fine but their
    // MCP cannot return a COMPLETED image — every response carrying one fails with
    // "Value is not JSON serializable: dict". This matches the vector-fallback
    // pattern used throughout this codebase; drop the PNG in here when retrievable
    // and nothing else needs to change.
    ctx.save();
    for (const b of this._blasts) {
      ctx.globalAlpha = Math.min(1, b.life * 4);      // fade as it expires
      ctx.shadowBlur  = 14; ctx.shadowColor = '#ff5522';
      ctx.fillStyle   = '#ff7733';
      ctx.fillRect(b.x, b.y, C.B_W, C.B_H);
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(b.x + C.B_W * 0.25, b.y + 2, C.B_W * 0.5, C.B_H - 4);
    }
    ctx.restore();
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
    // `!player` guard: PRE-EXISTING latent crash, not introduced by the chase change.
    // Level.update calls e.tryContact(player, this) unconditionally, so any frame that
    // ticks the level without a player (level-complete, death, menu) dereferenced null
    // here. Found by a chase test that passes null for one frame to simulate a sight
    // break. Same class as the one in update(); both are guarded now.
    if (!this.alive || this._cooldown > 0 || !player) return;
    const dx = player.cx - this.cx, dy = player.cy - this.cy;
    this._shooting = Math.sqrt(dx*dx + dy*dy) < 180;
    if (this.overlaps(player.x, player.y, player.w, player.h)) {
      const dir = player.cx <= this.cx ? -1 : 1;
      player.stun(STUN_DURATION, dir * 300);
      player.scatter(level);
      this._cooldown = STUN_COOLDOWN;
    }
  }

  // ── O9 ALERT TELL (Chief: "needs an alert animation to know it found u") ──
  // Procedural, per the ruling not to block on art — same precedent as the one-way
  // platform markers. If Chief supplies an alert sprite it drops in here.
  //
  // Three readable states, deliberately different in SHAPE not just colour: colour
  // alone has already misled twice on this project (switch_destroyed measured as the
  // greenest sprite, fence_dead brighter than the live frames).
  //   alert    a rising exclamation mark + expanding ring, before the first shot
  //   engaged  a steady underline bar, so "it is still on me" stays legible
  //   lost     a shrinking, fading ring — the drone gave up
  drawTell(ctx) {
    const C = DroneEnemy.CFG;
    const st = this.alertState;
    if (st === 'patrol' || st === 'dead') return;
    const cx = this.cx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (st === 'alert') {
      const p    = 1 - (this._alertT / C.ALERT_TIME);      // 0 -> 1 over the telegraph
      const rise = 10 * (1 - p);                            // pops up as it resolves
      const y    = this.y - 12 - rise;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this._t * 30);   // urgent flicker
      ctx.shadowBlur  = 12; ctx.shadowColor = '#ff3344';
      ctx.fillStyle   = '#ff4455';
      ctx.fillRect(cx - 2, y, 4, 9);                        // exclamation stem
      ctx.fillRect(cx - 2, y + 11, 4, 3);                   // exclamation dot
      ctx.globalAlpha = (1 - p) * 0.8;                      // ring expands and fades
      ctx.strokeStyle = '#ff3344'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, this.cy, 14 + p * 26, 0, Math.PI * 2); ctx.stroke();
    } else if (st === 'engaged') {
      ctx.globalAlpha = 0.85;
      ctx.shadowBlur  = 8; ctx.shadowColor = '#ff5522';
      ctx.fillStyle   = '#ff5522';
      ctx.fillRect(cx - 10, this.y - 7, 20, 3);             // steady "locked on" bar
    } else if (st === 'lost') {
      const p = this._deaggroT / C.DEAGGRO_TIME;            // 1 -> 0
      ctx.globalAlpha = p * 0.7;
      ctx.strokeStyle = '#66ddff'; ctx.lineWidth = 2;       // cool colour = disengaged
      ctx.beginPath(); ctx.arc(cx, this.cy, 6 + p * 12, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  draw(ctx) {
    // Blasts draw FIRST and outside the alive check, so a blast already in flight
    // still renders (and still lands) after the player kills the drone. Killing the
    // shooter mid-shot should not make an incoming blast silently vanish.
    this.drawBlasts(ctx);
    if (!this.alive) return;
    // Shooting pose while aggroed (Chief 2026-09-17). This line previously read
    //   const frames = this._idleFrames;  // shooting anim disabled until fixed
    // so all 9 shooting frames were loaded on every drone and never once drawn.
    const frames = (this._shooting && this._shootFrames) ? this._shootFrames : this._idleFrames;
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

    // Tell draws AFTER ctx.restore() so the horizontal flip above cannot mirror it —
    // a mirrored exclamation mark reads as a glitch.
    this.drawTell(ctx);
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

// ── Chest ──────────────────────────────────────────────────────────────
// ORCHA_CHEST_V1_SEMANTICS.md, fully ratified by Chief 2026-09-18, plus
// CHIEF_RULING_CHEST_PIP_RESERVE.md which amended decision 7.
//
// D1 costs 2 charge to open (his override of my free-to-open proposal — and his
//    version is better: the player spends twice and is well rewarded, so
//    "spend to gain" is unmistakable. Level 2 margin goes 0 -> +8.)
// D3 rewards ONE BANKED PIP placed directly in the reserve. Reward 10 == MAX_CHARGE
//    == one pip, so no conversion arithmetic exists to get wrong.
// D4 opens ONCE and latches.
// D5 the `opened` flag is snapshotted, which gives exactly Chief's rule: die
//    before a checkpoint and it reopens; cross a checkpoint first and it stays open.
// D6 hold SPACE within INTERACT_RADIUS, like every other device.
// D7 reward routes through player.bankPip() — a new AUTHORITY ENTRY POINT, not a
//    bypass. The bar is never touched. That invariant IS the ruling.
//
// Art: assets/objects/chest/, geometry measured in its GEOMETRY.md. Sequence is
// closed -> opening/frame_000..008 -> open_empty, and it never loops back.
// frame_000 IS a real frame in this pack (hash-verified, unlike fence/switch/gate).
const CHEST_CANVAS  = 128;
const CHEST_SRC_X   = 12;   // content box, uniform on all 11 files
const CHEST_SRC_Y   = 12;
const CHEST_SRC_W   = 104;
const CHEST_SRC_H   = 104;
const CHEST_FRAMES  = 9;    // 000..008 — a real 9-frame animation here
const CHEST_FPS     = 12;
// On-screen draw size. Chief's dial, same pattern as GATE_DRAW_W/H.
const CHEST_DRAW_W  = 36;   // Chief resize: was 52 (3-block visual) -> 36 (2-block visual)
const CHEST_DRAW_H  = 36;
const _chestImg = (p) => { const i = new Image(); i.src = `assets/objects/chest/${p}`; return i; };
const CHEST_ART = {
  closed: _chestImg('closed.png'),
  empty:  _chestImg('open_empty.png'),
  opening: Array.from({ length: CHEST_FRAMES }, (_, k) => _chestImg(`opening/frame_${String(k).padStart(3,'0')}.png`)),
};

export class Chest {
  constructor({ id, x, y, cost = 2, reward = 10, opened = false }) {
    this.id     = id;
    this.x      = x;
    this.y      = y;
    this.w      = 32;          // hitbox; the sprite draws larger, like every device
    this.h      = 32;
    this.cost   = cost;
    this.reward = reward;
    this.opened = opened;      // latched, and snapshotted (D4 + D5)
    this.charged = 0;          // accumulated toward `cost` while holding SPACE
    this._openT  = 0;          // animation clock, only runs after opening
    this._refusedFx = 0;       // brief tell when a full reserve refuses the open
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // `required` aliases `cost` so a chest flows through the EXISTING SPACE-charge
  // path in player._updateDischarge with no second transfer implementation. That
  // path already reads `target.required - target.charged` and calls
  // `target.receive(n)`, and its own comment states there is deliberately no second
  // transfer path for crates — the same reasoning applies here.
  get required() { return this.cost; }

  // Same content-box crop the gate uses: excludes the uniform 12px bottom pad so
  // the artwork grounds exactly on (y + h). Uniform across every frame, so this is
  // NOT per-frame bbox anchoring and §6.2 stays intact.
  spriteBox() {
    return {
      dX: Math.round(this.cx - CHEST_DRAW_W / 2),
      dY: (this.y + this.h) - CHEST_DRAW_H,
      dW: CHEST_DRAW_W, dH: CHEST_DRAW_H,
    };
  }

  // Exposed so tests assert STATE, not pixels (the PowerGate.visualState pattern).
  get visualState() {
    if (this.opened && this._openT >= CHEST_FRAMES / CHEST_FPS) return 'empty';
    if (this.opened) return 'opening';
    return 'closed';
  }

  frameFor(state) {
    if (state === 'empty')   return CHEST_ART.empty;
    if (state === 'opening') return CHEST_ART.opening[Math.min(CHEST_FRAMES - 1, Math.floor(this._openT * CHEST_FPS))];
    return CHEST_ART.closed;
  }

  // Local hypot rather than importing electricity.js's private dist() — a second
  // cross-module dependency for one line of arithmetic is not worth it.
  inRange(px, py) { return Math.hypot(px - this.cx, py - this.cy) < INTERACT_RADIUS; }

  // Accept charge toward the cost. Returns the amount actually consumed so the
  // caller (player._updateDischarge) can spend exactly that through spendEnergy —
  // the chest never touches player energy itself.
  receive(amount) {
    if (this.opened) return 0;
    const take = Math.min(amount, this.cost - this.charged);
    if (take <= 0) return 0;
    this.charged += take;
    return take;
  }

  // Called when `charged` reaches `cost`. Returns true if the chest opened.
  //
  // CAP BEHAVIOUR (Chief's ruling): at MAX_BANKED_PIPS the pip is REFUSED and the
  // chest DOES NOT OPEN, so the reward is not destroyed and the player can return
  // after spending a pip. The accumulated `charged` is also rolled back, so he is
  // not billed 2 for nothing.
  tryOpen(player) {
    if (this.opened || this.charged < this.cost - 1e-9) return false;
    if (!player.bankPip()) {
      this.charged   = 0;        // refund the accumulation, do not bill him
      this._refusedFx = 0.6;     // visible "reserve full" tell
      return false;
    }
    this.opened = true;
    this._openT = 0;
    return true;
  }

  update(dt) {
    this._refusedFx = Math.max(0, this._refusedFx - dt);
    if (this.opened) this._openT += dt;
  }

  draw(ctx) {
    const sb = this.spriteBox();
    const img = this.frameFor(this.visualState);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this._refusedFx > 0) {
      // Reserve-full refusal: red pulse, distinct in SHAPE from the charge bar so
      // it cannot be misread as progress.
      ctx.globalAlpha = Math.min(1, this._refusedFx * 2);
      ctx.fillStyle = '#ff4455';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('RESERVE FULL', this.cx, sb.dY - 6);
      ctx.globalAlpha = 1;
    }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, CHEST_SRC_X, CHEST_SRC_Y, CHEST_SRC_W, CHEST_SRC_H, sb.dX, sb.dY, sb.dW, sb.dH);
    } else {
      drawGlowRect(ctx, this.x, this.y, this.w, this.h, '#2a1a00', '#ffaa22', 10);
    }
    ctx.restore();
    // Charge progress toward the cost, above the sprite — never over the art, and
    // only while actually accumulating (the P4 lesson: an unconditional background
    // reads as a stray tile).
    if (!this.opened && this.charged > 0) {
      const bw = 40, bh = 5, bx = this.cx - bw / 2, by = sb.dY - 8;
      ctx.fillStyle = '#0e0018';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(bx, by, Math.round(bw * (this.charged / this.cost)), bh);
    }
  }
}

// ── ElectricBolt (player projectile — K fires this when no melee target in range) ──
// Aim is 8-directional: caller derives vx/vy from held movement keys.
// No auto-aim — the player picks the direction.
const BOLT_SPEED    = 320;   // px/s
const BOLT_W        = 6;
const BOLT_H        = 6;
const BOLT_MAX_LIFE = 1.5;   // seconds before despawn

export class ElectricBolt {
  constructor(x, y, vx, vy) {
    this.x  = x - BOLT_W / 2;
    this.y  = y - BOLT_H / 2;
    this.vx = vx;
    this.vy = vy;
    this.w  = BOLT_W;
    this.h  = BOLT_H;
    this.alive = true;
    this._life = 0;
    this._t    = 0;   // oscillator for pulse glow
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, level, enemies) {
    if (!this.alive) return;
    this._life += dt;
    this._t    += dt;
    if (this._life > BOLT_MAX_LIFE) { this.alive = false; return; }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // solidAt takes tile coords (world_px / TILE)
    const TILE = 32;
    if (level.solidAt(Math.floor(this.cx / TILE), Math.floor(this.cy / TILE))) {
      this.alive = false;
      return;
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (this.cx >= e.x && this.cx <= e.x + e.w &&
          this.cy >= e.y && this.cy <= e.y + e.h) {
        e.hit(level);
        this.alive = false;
        return;
      }
    }
  }

  draw(ctx) {
    if (!this.alive) return;
    const pulse = 0.7 + 0.3 * Math.sin(this._t * 30);
    ctx.save();
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#44ddff';
    ctx.fillStyle   = `rgba(68,221,255,${pulse})`;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.restore();
  }
}

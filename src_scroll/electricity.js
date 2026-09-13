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
      // Draw 64x64 sprite. Sprite has 1px fully-transparent bottom row (row 63),
      // so visual feet are at dY+62. To land on the floor (y+h) we need dY+62 = y+h
      // → dY = y+h-62. Using -64 floated the generator 2px above the surface.
      const dX = this.cx - 32;
      const dY = this.y + this.h - 62;
      ctx.drawImage(img, dX, dY, 64, 64);
    } else {
      // Fallback box while images load
      ctx.fillStyle = this.drained ? '#1c1c28' : '#ffcc00';
      ctx.fillRect(this.cx - 14, this.y, 28, 28);
    }

    // Drain bar above — full→empty as player absorbs (hidden when drained)
    if (!this.drained) {
      const dY2 = this.y + this.h - 62;   // matches sprite anchor above
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
// ── Fence art (ORDER FENCE_SHORT_CIRCUIT, ratified F1/F2/F3/F4) ─────────────
//
// FRAME INDEXING — the live loop is frames 001..008, EIGHT frames, never 000.
// `fence/frame_000.png` is BYTE-IDENTICAL to `fence_dead.png` (sha256
// 5b6955205a5fc63b): PixelLab exported the rest pose as frame 0, and
// metadata.json shows the animation belongs to an object named "uncharged gate"
// whose base rotation IS that image. Looping 000..008 would render the DEAD,
// PASSABLE-LOOKING art one frame in nine on a LIVE, BLOCKING fence — telling the
// player to walk into it. Kiro corrected his own order on this; parity guards it
// mechanically now.
//
// F2 — MOTION is the state signal, NOT brightness. Measured mean luma:
//   fence_dead 50.4 | 001 22.7 | 002 80.4 | 003 94.5 | 004 108.5 (peak)
//                   | 005 95.3 | 006 82.9 | 007 38.9 | 008 22.0
// Live frames 001/008 are DARKER than dead, so brightness cannot carry the
// state and is deliberately not compensated for in code. A live fence MOVES; a
// dead fence is static and slack. If brightness should also carry it, that is an
// art change to 001/008 and Chief's call.
const FENCE_FPS    = 10;
const FENCE_CANVAS = 64;          // uniform export canvas; anchor from THIS (F4)
const _fenceImg = (name) => { const i = new Image(); i.src = `assets/objects/fence/${name}`; return i; };
const FENCE = {
  dead: _fenceImg('fence_dead.png'),
  live: Array.from({ length: 8 }, (_, k) => _fenceImg(`frame_00${k + 1}.png`)),
};
// ──────────────────────────────────────────────
export class PowerGate {
  constructor({ id, x, y, w, h, required, isExit = false, blockOnly = false, label = '',
                timed = false, duration = 3, style = null }) {
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

    // ── TIMED DEVICE (ORDER CRATE_TIMED System 2, ratified D9) ──────────
    // A timed gate opens when charged, stays open for `duration` seconds, then
    // drains to empty and re-blocks. Non-timed gates are COMPLETELY unaffected:
    // every timed branch below is gated on `this.timed`.
    //
    // timed + isExit is REFUSED as an authoring error. A timed exit could expire
    // during the level-complete transition and strand the player behind a gate
    // they already paid for. Warn loudly and ignore `timed` rather than shipping
    // a level that can soft-lock on a race.
    if (timed && isExit) {
      console.warn(`[gate] "${id}" declares BOTH timed and isExit — ignoring timed. ` +
        `A timed exit can expire mid level-completion and strand the player.`);
      this.timed = false;
    } else {
      this.timed = timed;
    }
    this.duration  = duration;
    this._timeLeft = 0;     // >0 only while a timed gate is open and counting down

    // ── style (F6/F9): additive, default-off ────────────────────────────
    // "fence" renders the powered-fence art instead of the gate art. It is only
    // meaningful on a blockOnly barrier — a fence is held up by a wall switch,
    // not charged by the player — so style:"fence" on a chargeable gate is an
    // authoring error. Warn and ignore, same doctrine as timed+isExit.
    if (style !== null && style !== undefined && style !== 'default' && style !== 'fence') {
      console.warn(`[gate] "${id}" has unknown style "${style}" — falling back to default.`);
      style = null;
    }
    if (style === 'fence' && !blockOnly) {
      console.warn(`[gate] "${id}" declares style:"fence" but is not blockOnly — ignoring style. ` +
        `A fence is opened by its linked wall switch, never charged directly.`);
      style = null;
    }
    this.style = (style === 'fence') ? 'fence' : null;
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
    // TRUE DEAD art (Chief-supplied 2026-09-12): a dedicated unlit gate with no
    // plasma in the centre gap, for the DORMANT state. Registered on the same
    // 128×128 grid as the spritesheet cells, so the same centred 64-wide crop
    // lines it up exactly with the awake states.
    this._deadImg   = new Image();
    this._deadImg.src = 'assets/objects/gate_electric_dead.png';
    this._frame     = 0;
    this._fps       = 8;
    this._reactT    = 0;   // >0 → play 'charging' row instead of 'idle'
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // ── DORMANT (un-energized) state ──────────────────────────────────
  // Chief, 2026-09-11: "gate before charge is moving, animated; should be in a
  // dead state until given charge."
  //
  // A gate that has received nothing is inert: static art, no glow, no frame
  // advance. It wakes the moment energy arrives and stays awake while it holds
  // any charge, so the animation reads as "this thing is now live".
  //
  // blockOnly barriers are EXEMPT: they are switch-controlled force fields, not
  // things awaiting player charge, and their `charged` is always 0 — treating
  // them as dormant would freeze them permanently.
  get isDormant() {
    return !this.open && !this.blockOnly && this.charged <= 1e-9 && this._reactT <= 0;
  }

  update(dt) {
    this._t += dt;
    if (this.open) this._openAge += dt;
    this._pipFlash = Math.max(0, this._pipFlash - dt);
    this._reactT   = Math.max(0, this._reactT   - dt);

    // ── D9: timed expiry ──────────────────────────────────────────────
    // Runs BEFORE the isDormant check below, so the frame a timed gate expires
    // it is already seen as dormant and renders the TRUE DEAD art immediately —
    // no one-frame flash of the idle animation on the way down.
    if (this.timed && this.open && this._timeLeft > 0) {
      this._timeLeft -= dt;
      if (this._timeLeft <= 0) {
        this._timeLeft = 0;
        this.open      = false;   // blocking resumes
        this.charged   = 0;       // drains to empty — must be re-charged
        this._openAge  = 0;       // so a re-open replays the open flash cleanly
        // _reactT is deliberately NOT touched: it has already lapsed by now, and
        // isDormant depends on it being 0. Zeroing charged + open is exactly what
        // makes isDormant true on this same frame (verified, not assumed).
      }
    }
    // Dormant gates do not animate. Frame is pinned to 0 rather than merely
    // left alone, so waking always starts the idle loop at its first frame —
    // and because row 0 has content ONLY at frame 0 (see draw()).
    if (this.isDormant) { this._frame = 0; return; }
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
    if (this.charged >= this.required - 1e-9) {
      this.charged = this.required;
      this.open    = true;
      // D9: a timed gate starts its countdown the moment it opens. Non-timed
      // gates stay open forever exactly as before — _timeLeft remains 0 and the
      // expiry branch in update() never fires for them.
      if (this.timed) this._timeLeft = this.duration;
      return true;
    }
    return false;
  }

  // Returns true if this gate blocks the AABB (rx,ry,rw,rh)
  blocks(rx, ry, rw, rh) {
    if (this.open) return false;
    return !(rx + rw <= this.x || rx >= this.x + this.w ||
             ry + rh <= this.y || ry >= this.y + this.h);
  }

  // Returns true if the player's X range overlaps the gate column, regardless
  // of Y. Used for horizontal movement collision so the player cannot jump
  // over a closed gate — the gate is treated as a floor-to-ceiling barrier.
  // The regular blocks() AABB is still used for _resolveY (landing on top).
  blocksHorizontal(rx, rw) {
    if (this.open) return false;
    return !(rx + rw <= this.x || rx >= this.x + this.w);
  }

  // ── Fence render (F1/F2/F3/F4) ──────────────────────────────────────
  // F3: the sprite is drawn LARGER than the hitbox and TILED to cover it — the
  // same convention PowerGate already uses for its own art (40x64 hitbox under a
  // 64x128 sprite). Level 2's BARRIER is 32w x 128h, so a 64x64 fence tiles
  // exactly 2x vertically and is centred horizontally on the 32-wide hitbox.
  // The HITBOX IS NEVER CHANGED — collision stays exactly as authored.
  //
  // Anchored from the uniform 64x64 canvas, never per-frame bbox: measured,
  // frame_008 is 4,10..58,58 against 1,10..62,59 everywhere else, so per-frame
  // anchoring would make the fence twitch sideways on the last frame.
  _drawFence(ctx) {
    const cols = Math.max(1, Math.ceil(this.w / FENCE_CANVAS));
    const rows = Math.max(1, Math.ceil(this.h / FENCE_CANVAS));
    // Centre the tiled block horizontally on the hitbox, bottom-align it.
    const totalW = cols * FENCE_CANVAS;
    const baseX  = Math.round(this.cx - totalW / 2);
    const baseY  = (this.y + this.h) - rows * FENCE_CANVAS;

    let img;
    if (this.open) {
      img = FENCE.dead;                    // shorted out — slack, static, passable
    } else {
      // Live: cycle frames 001..008. `% 8` over an 8-element array, so index 0
      // here is frame_001 — frame_000 is not in the array at all and can never
      // be drawn while live.
      const k = Math.floor(this._t * FENCE_FPS) % FENCE.live.length;
      img = FENCE.live[k];
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (!this.open) { ctx.shadowBlur = 12; ctx.shadowColor = '#66ccff'; }
    if (img && img.complete && img.naturalWidth > 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.drawImage(img,
            baseX + c * FENCE_CANVAS, baseY + r * FENCE_CANVAS,
            FENCE_CANVAS, FENCE_CANVAS);
        }
      }
    } else if (!this.open) {
      // Art not loaded yet — never leave a BLOCKING fence invisible.
      drawGlowRect(ctx, this.x, this.y, this.w, this.h, '#0a1a26', '#66ccff', 14);
    }
    ctx.restore();
  }

  draw(ctx) {
    // Style branch FIRST. A fence is blockOnly, so it never shows a charge bar,
    // never shows a [SPACE] prompt, and never reaches the gate/dormancy art path
    // below. A styleless gate is completely unaffected by this branch.
    if (this.style === 'fence') { this._drawFence(ctx); return; }
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
      // D9 countdown: a TIMED gate that has finished its open-flash still needs a
      // visible readout, so it does not silently slam shut on the player. A
      // non-timed gate keeps the original behaviour exactly (draw nothing once
      // faded out).
      if (age >= 1.0) {
        if (this.timed && this._timeLeft > 0) this._drawCountdown(ctx);
        return;
      }
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
      if (this.timed && this._timeLeft > 0) this._drawCountdown(ctx);
      return;
    }

    const fill = this.required > 0 ? Math.min(1, this.charged / this.required) : 0;

    // ── CLOSED state: three visual states, driven by energy ──────────
    // Sheet is 1152×384: 9 cols × 3 rows of 128×128 cells. Each frame's cell is
    // cropped to its centered 64 wide slice (sx = col*128 + 32) so the portrait
    // gate art draws at natural aspect into a 64×128 destination.
    //
    //   DORMANT   dedicated gate_electric_dead.png, static, no glow (charged == 0)
    //             (falls back to sheet row 0 frame 0 if that file is missing)
    //   IDLE      row 1, 9-frame loop                    (holds some charge)
    //   CHARGING  row 2, 9-frame loop, stronger glow      (_reactT > 0)
    //
    // ⚠ ROW 0 HAZARD — verified by decoding the sheet: row 0 contains artwork
    // ONLY at frame 0 (6572 opaque px); frames 1-8 are completely EMPTY. Row 0
    // frame 0 is pixel-identical to row 1 frame 0, i.e. it is the neutral base
    // gate. So the dormant frame index is hard-pinned to 0 here and in update();
    // letting the frame counter run on row 0 would make the gate DISAPPEAR.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const sheet   = this._sheet;
    const dormant = this.isDormant;
    const dead    = this._deadImg;
    if (dormant && dead && dead.complete && dead.naturalWidth > 0) {
      // TRUE DEAD state. Verified against the sheet by decoding both: the dead
      // art's opaque bbox is x17..110 starting at y10 — the SAME registration as
      // row 0 frame 0 — so the identical centred 64-wide crop (sx=32) keeps the
      // dead gate pixel-aligned with its awake states. Mean luminance 23.7 vs
      // the old dormant frame's 59.8: 2.5× darker, which is the whole point.
      // Dead must READ as dead, not merely as "not currently animating".
      ctx.shadowBlur = 0;      // an un-energized gate never glows
      ctx.drawImage(dead, 32, 0, 64, 128, dX, dY, spriteW, spriteH);
    } else if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const CELL = 128;
      const row  = dormant ? 0 : (this._reactT > 0 ? 2 : 1);
      const fi   = dormant ? 0 : Math.floor(this._frame) % 9;   // pinned — see hazard note
      const sx   = fi * CELL + 32;   // centered 64-wide crop within 128-wide cell
      const sy   = row * CELL;
      // No glow while dormant: an un-energized gate should not look powered.
      ctx.shadowBlur  = dormant ? 0 : (this._reactT > 0 ? 18 : 8);
      ctx.shadowColor = '#cc44ff';
      ctx.drawImage(sheet, sx, sy, 64, CELL, dX, dY, spriteW, spriteH);
    } else if (this._imgClosed.complete && this._imgClosed.naturalWidth > 0) {
      // Sheet not loaded yet — legacy static gate (64×128, same dest size).
      ctx.drawImage(this._imgClosed, dX, dY, spriteW, spriteH);
    }
    ctx.restore();

    // Charge progress is communicated by the SPRITE ROWS (dormant -> idle ->
    // charging) plus the numeric ⚡ readout below. The old vertical purple strip
    // that rose from the gate's base was pre-sprite-sheet logic and
    // double-reported the same state on top of the art — removed 2026-09-12
    // on Chief's call ("old logic of the gate vertically being charged").

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
    // Charge progress bar — only draw when the gate is actively being charged.
    // Drawing the dark background unconditionally produced a permanent purple
    // strip below the gate that read as a stray tile/artefact (P4 fix).
    const barW = 48, barH = 6;
    const barX = this.cx - barW / 2;
    const barY = this.y + this.h + 4;
    if (fill > 0 || this._reactT > 0) {
      ctx.fillStyle = '#0e0018';
      ctx.fillRect(barX, barY, barW, barH);
      if (fill > 0) {
        ctx.shadowBlur  = 8;
        ctx.shadowColor = '#cc44ff';
        ctx.fillStyle   = '#cc44ff';
        ctx.fillRect(barX, barY, Math.round(barW * fill), barH);
        ctx.shadowBlur  = 0;
      }
    }

    // EXIT label — sits below the progress bar, also gate-relative.
    if (this.isExit) {
      const labelY = barY + barH + 11;
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

  // ── D9: timed countdown readout ────────────────────────────────────
  // Reuses the SAME strip geometry as the charge bar below the gate, drawn as
  // remaining TIME instead of fill. No new art, no new asset dependency (the
  // order forbade both). Flickers under 1s so the player gets a warning before
  // the gate slams shut rather than being surprised by it.
  _drawCountdown(ctx) {
    const frac = this.duration > 0 ? Math.max(0, this._timeLeft / this.duration) : 0;
    const barW = 48, barH = 6;
    const barX = this.cx - barW / 2;
    const barY = this.y + this.h + 4;
    const urgent = this._timeLeft <= 1.0;
    // Flicker only in the final second, driven by _t so it is frame-rate stable.
    const flicker = urgent ? (0.45 + 0.55 * Math.abs(Math.sin(this._t * 14))) : 1;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#0e0018';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.shadowBlur  = 8;
    ctx.shadowColor = urgent ? '#ff4444' : '#44ffcc';
    ctx.fillStyle   = urgent ? '#ff4444' : '#44ffcc';
    ctx.fillRect(barX, barY, Math.round(barW * frac), barH);
    ctx.restore();
  }
}

// ──────────────────────────────────────────────
// Switch: spend charge to trigger linked gate/barrier
// ──────────────────────────────────────────────
// ── Wall-switch art (ORDER FENCE_SHORT_CIRCUIT, ratified F1/F4/F6) ──────────
// Module-level so every wall switch shares one set of Image objects.
//
// FRAME INDEXING — animate from 001, NEVER 000.
// `wall_switch/frame_000.png` is BYTE-IDENTICAL to `switch_destroyed.png`
// (sha256 918e59165c0f902f). PixelLab exports frame_000 as the object's REST
// POSE, not the first frame of motion — metadata.json shows the animation belongs
// to the object "destroyed from overc" whose base rotation IS that image. Playing
// 000 first would show the destroyed END STATE as the opening frame of the
// destruction. Kiro corrected his own order on this; parity now guards it
// mechanically.
const WALL_SW_DESTROY_FPS = 12;   // 8 frames -> ~0.67s burn
const _wallSwImg = (name) => { const i = new Image(); i.src = `assets/objects/wall_switch/${name}`; return i; };
const WALL_SW = {
  on:        _wallSwImg('switch_on.png'),         // powered, feeding the fence
  destroyed: _wallSwImg('switch_destroyed.png'),  // settled end state
  // frames 001..008 = the vibrate/arc/burn motion (frame_000 deliberately absent)
  burn: Array.from({ length: 8 }, (_, k) => _wallSwImg(`frame_00${k + 1}.png`)),
  // F8: switch_off.png is installed but UNUSED in v1 and deliberately not loaded.
  // It is genuinely unpowered art (greenBias 0.5) and this puzzle has no
  // "intact but unpowered" state. Reserved, not dropped — ratified.
};
const WALL_SW_CANVAS = 56;        // uniform export canvas; anchor from THIS (F4)

export class Switch {
  constructor({ id, x, y, required, linkedId, label = '', style = null }) {
    this.id       = id;
    this.x        = x; this.y = y;
    this.w        = 22; this.h = 22;
    this.required = required;
    this.charged  = 0;
    this.on       = false;
    this.linkedId = linkedId;
    this.label    = label;

    // ── style (F6/F9): additive and default-off ──────────────────────
    // Absent style == byte-identical behaviour to every switch authored before
    // this order. Only "wall" is recognised; anything else warns and falls back
    // to default rather than silently rendering nothing.
    if (style !== null && style !== undefined && style !== 'default' && style !== 'wall') {
      console.warn(`[switch] "${id}" has unknown style "${style}" — falling back to default.`);
      style = null;
    }
    this.style = (style === 'wall') ? 'wall' : null;

    this._t       = 0;
    this._pipFlash = 0;
    // F11: elapsed destroy-animation time, snapshotted so a checkpoint taken
    // mid-burn neither replays nor skips the animation.
    this._destroyT = 0;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  // ── F5: `on` means FIRED, not "lit" ─────────────────────────────────
  // For a wall switch the presentation INVERTS: the switch starts visually
  // powered (green, feeding the fence) and charging it DESTROYS it.
  //   on === false -> switch_on.png      (powering the fence)
  //   on === true  -> burn 001..008 once -> switch_destroyed.png forever
  // No state-machine change and no new energy path: `on` already means "charged
  // to required". Only the render mapping inverts.
  get isWall()      { return this.style === 'wall'; }
  get burnFrames()  { return WALL_SW.burn.length; }               // 8
  get burnDone()    { return this._destroyT >= this.burnFrames / WALL_SW_DESTROY_FPS; }

  update(dt) {
    this._t += dt;
    this._pipFlash = Math.max(0, this._pipFlash - dt);
    // Advance the burn only while it is still running, so _destroyT does not
    // grow without bound and `burnDone` latches permanently once reached.
    if (this.isWall && this.on && !this.burnDone) this._destroyT += dt;
  }

  inRange(px, py) { return dist(px, py, this.cx, this.cy) < INTERACT_RADIUS; }

  receive(amount) {
    if (this.on) return false;
    this.charged += amount;
    if (this.charged >= this.required - 1e-9) { this.charged = this.required; this.on = true; return true; }
    return false;
  }

  // ── Wall-switch render (F1/F4/F5/F6) ───────────────────────────────
  // Anchored from the UNIFORM 56x56 CANVAS, never per-frame bbox. Measured, the
  // frames do NOT share a bbox: frame_000 is 10,1..46,52 while 001-003 widen to
  // 8,1..48,52 — and that 2px spread IS the vibration. Anchoring per-frame would
  // cancel the shake into a jitter-free slide and make the panel appear to jump.
  // Drawn LARGER than the 22x22 hitbox, centred on the hitbox and bottom-aligned,
  // the same convention PowerGate already uses. The hitbox is never changed.
  _drawWall(ctx) {
    const dX = Math.round(this.cx - WALL_SW_CANVAS / 2);
    const dY = (this.y + this.h) - WALL_SW_CANVAS;
    let img;
    if (!this.on) {
      img = WALL_SW.on;                       // F5: NOT lit — powered, feeding the fence
    } else if (!this.burnDone) {
      const k = Math.min(this.burnFrames - 1,
        Math.floor(this._destroyT * WALL_SW_DESTROY_FPS));
      img = WALL_SW.burn[k];                  // frames 001..008, once, in order
    } else {
      img = WALL_SW.destroyed;                // settles here permanently
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this.on && !this.burnDone) { ctx.shadowBlur = 20; ctx.shadowColor = '#ffee66'; }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, dX, dY, WALL_SW_CANVAS, WALL_SW_CANVAS);
    } else {
      // Art not loaded yet — vector fallback so the switch is never invisible.
      drawGlowRect(ctx, this.x, this.y, this.w, this.h,
        this.on ? '#201808' : '#082010', this.on ? '#ffaa22' : '#44ff88', 12);
    }
    ctx.restore();

    // Charge bar only while it is still intact and chargeable.
    if (!this.on) {
      const sbW = this.w + 8, sbH = 5;
      const sbX = this.x - 4, sbY = dY - 8;
      const sfill = this.required > 0 ? this.charged / this.required : 0;
      ctx.fillStyle = '#0a2014';
      ctx.fillRect(sbX, sbY, sbW, sbH);
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#44ff88';
      ctx.fillStyle   = '#44ff88';
      ctx.fillRect(sbX, sbY, Math.round(sbW * sfill), sbH);
      ctx.shadowBlur  = 0;
    }
    ctx.fillStyle = this.on ? '#ff7744' : '#44ff88';
    ctx.font      = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.on ? 'SHORTED' : 'LIVE', this.cx, this.y + this.h + 11);
    if (this.label) {
      ctx.fillStyle = '#888';
      ctx.fillText(this.label, this.cx, this.y + this.h + 22);
    }
  }

  draw(ctx) {
    // Style branch FIRST: a default switch never reaches the wall renderer and
    // is byte-identical to its pre-order behaviour.
    if (this.isWall) { this._drawWall(ctx); return; }
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

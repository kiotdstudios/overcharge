// Electrical objects: sources, gates, switches, pickups
import { ABSORB_RADIUS, INTERACT_RADIUS, PICKUP_GRAVITY, PICKUP_LIFETIME, TILE } from './constants.js';
import { drawSparks, drawGlowRect, drawText } from './render.js';
import { drawHvac } from './source-visuals.js';

function dist(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// ──────────────────────────────────────────────
// ElectricalSource: fuse box / battery / generator
// ──────────────────────────────────────────────
export class ElectricalSource {
  constructor({ id, x, y, charge = 4, label = '', kind = 'generator', onDepletedGate = '' }) {
    this.id     = id;
    this.x      = x; this.y = y;
    this.w      = 28; this.h = 28;  // logical hitbox; sprite is drawn 64x64 above
    this.charge = charge;
    this.max    = charge;
    this.label  = label;
    this.kind = ['hvac', 'light'].includes(kind) ? kind : 'generator';
    this.onDepletedGate = onDepletedGate;
    this.charge = Number.isFinite(charge) ? Math.max(0, charge) : 0;
    this.max    = this.charge;
    this.drained = this.charge === 0;
    this._fanSpeed = this.drained ? 0 : 1;
    this._fanPhase = 0;
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
    // Fan: ramp speed toward target (1 = active, 0 = drained), spin phase
    this._fanSpeed = Math.max(0, this._fanSpeed + ((this.drained ? 0 : 1) - this._fanSpeed) * Math.min(1, dt * 2));
    this._fanPhase = (this._fanPhase + this._fanSpeed * dt * 4) % (Math.PI * 2);
    // Advance animation frames 1-8 when active (frame 0 = drained state)
    if (!this.drained) {
      this._frame += dt * this._frameFps;
      // cycle frames 1–8
      if (this._frame >= 9) this._frame = 1;
      if (this._frame < 1)  this._frame = 1;
    }
  }

  inRange(px, py) { return dist(px, py, this.cx, this.cy) < ABSORB_RADIUS; }

  // ── DRAWN BOUNDS + STABLE PROMPT ANCHOR (O5.2, ORCHA 08) ─────────────
  // The source draws a 64x64 sprite over a 28x28 hitbox, so "just above the
  // hitbox" lands inside the art — the same mismatch the gate had, and why
  // Chief saw the prompt printed across the generator.
  //
  // ORCHA 08 Finding A: botPad is 1px on all 9 frames, and dY = (y+h)-62 makes
  // the last content row land exactly on (y+h). That -62 is deliberate and
  // CORRECT. Do not "fix" it.
  //
  // ORCHA 08 Finding B: content TOP varies 6px across the pack
  // (topPad 7,7,6,3,2,1,4,5,7) because the arcs reach upward. That is real
  // animation, consistent and directional. Anchoring a label to the live
  // per-frame top would make the prompt BOUNCE 6px at 8fps — new jitter caused
  // by fixing the overlap. So anchor to the CANVAS top, a stable reference.
  // This is standing ruling §6.2 in its original form.
  spriteBox() {
    return { dX: this.cx - 32, dY: this.y + this.h - 62, dW: 64, dH: 64 };
  }

  // Where a world-space label may sit without touching the art. Stable across
  // every frame by construction.
  promptAnchor() {
    const sb = this.spriteBox();
    const barTop = sb.dY - 8;            // the drain bar already sits here
    return { aboveY: barTop - 6, belowY: sb.dY + sb.dH + 12, box: sb };
  }

  drain(amount) {
    if (this.drained) return 0;
    const actual = Math.min(this.charge, amount);
    this.charge -= actual;
    if (this.charge <= 0) { this.charge = 0; this.drained = true; }
    return actual;
  }

  draw(ctx) {
    // HVAC uses its own art module; generator uses sprite animation below.
    if (this.kind === 'hvac') { drawHvac(ctx, this); return; }
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
//   OPEN state → `gate/rest.png` from Chief's re-cut pack, faded out over 1s.
//   (Was `gate_electric_open.png`; Chief cut that asset, it is a different gate.)
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
// ── gate/ pack geometry — from assets/objects/gate/GEOMETRY.md (MEASURED) ──
// Do not re-derive these. Uniform across all 18 frames + rest + dead.
const GATE_CANVAS = 128;   // source PNG is 128x128
const GATE_SRC_X  = 17;    // content columns 17..110
const GATE_SRC_Y  = 10;    // content rows    10..114
const GATE_SRC_W  = 94;    // 110 - 17 + 1
const GATE_SRC_H  = 105;   // 114 - 10 + 1
// 8 frames, NOT 9: frame_000 was byte-identical to the rest pose and is
// deliberately absent from the installed pack.
const GATE_FRAMES = 8;

// ── ON-SCREEN DRAW SIZE — Chief's dial (ORCHA 05 §1) ────────────────────
// The gate reads ~47% wider than Chief is used to because the old crop hid
// 15px off each side. This is FAITHFUL RESTORATION, not enlargement: content
// was always 94x105 at cols 17..110 (see GEOMETRY.md); nobody has seen the
// full gate since the spritesheet was introduced.
//
// On-screen proportion is Chief's call. Change these TWO numbers and nothing
// else — the draw path, spriteBox(), every label and the tests all derive from
// them. Set equal to GATE_SRC_* for 1:1 (no scaling, current setting).
const GATE_DRAW_W = 94;    // = GATE_SRC_W -> 1:1, full width restored
const GATE_DRAW_H = 105;   // = GATE_SRC_H -> 1:1, unchanged from before

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

    // `gate_electric_open.png` is GONE — Chief cut it deliberately, it is a
    // different gate asset entirely. The open-state draw moved to `_rest`
    // (see the open-flash fix below), which left this load dead: fetched every
    // boot, read by nothing. Removed with the file, so no 404 on load.

    // ── Chief's re-cut gate pack (ORCHA 03 addendum + ORCHA 04) ─────────
    // assets/objects/gate/ replaces the old 1152x384 spritesheet. Individual
    // 128x128 PNGs with UNIFORM padding on all 18 frames, measured in
    // assets/objects/gate/GEOMETRY.md, which is the CONTRACT — not re-derived
    // here. Kiro: re-deriving is how three frame_000 errors got in.
    //
    // frame_000 is ABSENT ON PURPOSE in both animations: it was byte-identical
    // to the rest pose. Only 001..008 exist, so the loop is 8 frames, NOT 9.
    // Its absence is the guard against animating from a still frame.
    this._rest = new Image();  this._rest.src = 'assets/objects/gate/rest.png';
    this._dead = new Image();  this._dead.src = 'assets/objects/gate/dead.png';
    this._idle = [];
    this._chg  = [];
    for (let i = 1; i <= GATE_FRAMES; i++) {
      const n = String(i).padStart(3, '0');
      const a = new Image(); a.src = `assets/objects/gate/idle/frame_${n}.png`;      this._idle.push(a);
      const b = new Image(); b.src = `assets/objects/gate/charging/frame_${n}.png`;  this._chg.push(b);
    }
    // Legacy sheet kept ONLY as a fallback if the new pack fails to load, so a
    // missing asset degrades to the previous art instead of an invisible gate.
    this._sheet = new Image();
    this._sheet.addEventListener('error', () => console.warn('[gate] legacy sheet failed (fallback only)'));
    this._sheet.src = 'assets/objects/gate_electric_spritesheet.png';
    this._deadImg   = new Image();
    this._deadImg.src = 'assets/objects/gate_electric_dead.png';
    this._frame     = 0;
    this._fps       = 8;
    this._reactT    = 0;
  }

  get cx() { return this.x + this.w / 2; }

  // ── DRAWN BOUNDS (ORCHA 03 O5.1/O5.2, ORCHA 04) ─────────────────────
  // Constants come from assets/objects/gate/GEOMETRY.md and are applied
  // UNIFORMLY to every frame. This is NOT per-frame bbox anchoring, so
  // standing ruling §6.2 is intact and the withdrawn exception stays withdrawn.
  //
  // The old path cropped a centred 64-wide slice (sx = col*128 + 32 → cols
  // 32..95) while content spans cols 17..110, so it CLIPPED 15px off each side.
  // Cropping the documented content box shows the whole gate AND excludes the
  // 13px bottom padding, grounding the art exactly on (y + h) — no float, no
  // per-frame compensation.
  //
  // Scale is 1:1, so content height stays 105px, the same on-screen height as
  // before. Only the previously-clipped 30px of width is recovered.
  //
  // Every world-space label MUST anchor to this box, never to the hitbox: the
  // hitbox is 32×64 while the art is 94×105, which is why [SPACE] CHARGE
  // printed across the middle of the gate (O5.2).
  spriteBox() {
    const dW = GATE_DRAW_W;  // Chief's dial (ORCHA 05 §1), not the source width
    const dH = GATE_DRAW_H;
    return {
      dX: Math.round(this.cx - dW / 2),
      dY: (this.y + this.h) - dH,
      dW, dH,
    };
  }
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

  // ── RENDERING STATE — the single definition (ORCHA 06) ───────────────
  // Exposed so tests assert STATE, never sprite offsets. Previously the energy
  // suite asserted `sy === 256` as a proxy for "charging" and `sy === 128` for
  // "idle", which is why re-cutting ART broke the ENERGY suite: the coupling was
  // incidental, not meaningful. The energy ledger has no legitimate opinion about
  // spritesheet offsets.
  //
  // The draw path MUST branch on this getter so state and art cannot disagree.
  // Same reasoning as spriteBox(): one definition, used everywhere.
  get visualState() {
    if (this.open)        return 'open';
    if (this.isDormant)   return 'dormant';
    if (this._reactT > 0) return 'charging';
    return 'idle';
  }

  // The pack/path each visualState resolves to. Declared here, next to the state
  // definition, so the state->art mapping is assertable in ONE place and any
  // future art change touches exactly this method.
  frameFor(state) {
    if (state === 'dormant') return this._dead;
    if (state === 'charging') return this._chg[Math.floor(this._frame) % GATE_FRAMES];
    if (state === 'idle')     return this._idle[Math.floor(this._frame) % GATE_FRAMES];
    return this._rest;
  }

  // ── LABEL STACK GEOMETRY (O5.2 / O5.3, corrected by ORCHA 07) ────────
  // Returns where the charge bar and each label go, so the renderer AND the
  // tests share one definition. Rects are returned so a test can assert
  // non-intersection with spriteBox() directly.
  //
  // ORCHA 07 defect: clamping only for "on-canvas" (Math.max(0, barY)) pushes the
  // bar to y=0, which is INSIDE the sprite whenever spriteTop is negative. At
  // h=64 the sprite is 105 tall, so y=0 and y=32 both put labels over the art —
  // and both are single-click grid positions Chief can reach while authoring.
  //
  // RULING: when there is no room above, flip the whole stack BELOW the sprite,
  // preserving order and gaps. Overlapping the art is the defect Chief reported;
  // being lower on screen is not. NEVER clamp a label into the sprite's box.
  labelStack() {
    const GAP = 4, ROW = 3, BAR_W = 48, BAR_H = 6, TEXT_H = 10;
    const sb = this.spriteBox();
    const barX = Math.round(this.cx - BAR_W / 2);

    // Preferred: stack upward from the sprite top. Topmost ink is the EXIT
    // label's ascent, so that is what decides whether the stack fits.
    let barY  = sb.dY - GAP - BAR_H;
    let exitY = barY - ROW;                 // text BASELINE
    const topMostInk = exitY - TEXT_H;

    const below = topMostInk < 0;
    if (below) {
      // Flip under the sprite, same order and gaps.
      barY  = sb.dY + sb.dH + GAP;
      exitY = barY + BAR_H + ROW + TEXT_H;
    }
    return {
      below, barX, barY, barW: BAR_W, barH: BAR_H, exitY,
      // Rects for assertions: the bar, and the EXIT text box.
      barRect:  { x: barX, y: barY, w: BAR_W, h: BAR_H },
      exitRect: { x: this.cx - 20, y: exitY - TEXT_H, w: 40, h: TEXT_H },
      // LOCKED sits where the bar would (blockOnly draws no bar).
      lockY:    below ? barY + TEXT_H : sb.dY - GAP,
      lockRect: { x: this.cx - 24, y: (below ? barY + TEXT_H : sb.dY - GAP) - TEXT_H, w: 48, h: TEXT_H },
    };
  }

  // Where the [SPACE] CHARGE / CHARGING... prompt may sit. ui.js previously used
  // `dev.y - 20`, i.e. the HITBOX top — inside a 105-tall sprite whose top is at
  // (y+h)-105. That is why Chief saw [SPACE] CHARGE printed across the gate.
  //
  // Must clear the UNION of the sprite AND the bar/EXIT/LOCKED group. A first
  // version placed it "above the group", which my own sweep caught as still
  // overlapping in 3 cases: when the group has flipped BELOW the sprite, "above
  // the group" is inside the artwork. Union, not group.
  promptAnchor() {
    const ls = this.labelStack(), sb = this.spriteBox(), TEXT_H = 10, GAP = 3;
    const unionTop = Math.min(sb.dY, ls.barRect.y, ls.exitRect.y, ls.lockRect.y);
    const unionBot = Math.max(sb.dY + sb.dH,
                              ls.barRect.y + ls.barRect.h,
                              ls.exitRect.y + ls.exitRect.h,
                              ls.lockRect.y + ls.lockRect.h);
    const above = unionTop - GAP;                    // text baseline
    const below = unionBot + GAP + TEXT_H;
    // Prefer above; flip below if the ascent would leave the canvas.
    const y = (above - TEXT_H) < 0 ? below : above;
    return { y, aboveY: above, belowY: below, box: sb, flipped: y === below };
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

  // Horizontal movement collision.
  //
  // Chief ruling 2026-09-20: ALL gates are now Y-aware, not just blockOnly fences.
  // The previous rule (exit/chargeable gates block the full column height) assumed
  // the gate always filled the only passable corridor. Level design now places exit
  // gates on elevated platforms with navigable terrain below — a player on the lower
  // floor must be able to walk under the gate's column freely.
  //
  // The exit economy is still protected: the gate physically blocks the player the
  // moment their Y box overlaps the gate's hitbox. A player who reaches that
  // elevation and approaches the gate is stopped exactly as before. Only players
  // on a different floor level — whose Y box does NOT overlap the gate — pass by.
  //
  // `ry`/`rh` are OPTIONAL; callers that omit them get the legacy full-column block.
  blocksHorizontal(rx, rw, ry, rh) {
    if (this.open) return false;
    if (rx + rw <= this.x || rx >= this.x + this.w) return false;
    // Exit gates block the full column — player cannot physically bypass
    // without charging. Y-awareness only applies to non-exit (interior) gates.
    if (this.isExit) return true;
    if (ry !== undefined && rh !== undefined) {
      // Y-aware for interior gates: block only when player Y overlaps gate Y.
      return !(ry + rh <= this.y || ry >= this.y + this.h);
    }
    return true;   // legacy fallback — no Y info, block the column
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
    // Drawn bounds come from spriteBox() so the sprite, the labels, the charge
    // bar and the tests all agree on ONE definition of "where the gate is".
    const _sb     = this.spriteBox();
    const spriteW = _sb.dW;      // 94 (was a clipping 64)
    const spriteH = _sb.dH;      // 105
    const dX      = _sb.dX;
    const dY      = _sb.dY;      // content bottom lands on (y + h)

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
      // Use rest.png from the new pack, same content crop as every other state.
      // gate_electric_open.png was pre-recut art at 64x128 — no crop rect, drawn
      // stretched to 94x105, producing a visible sprite swap on gate open.
      // rest.png is the 128x128 neutral/base pose; applying GATE_SRC_* crop
      // gives identical canvas registration to the idle/charging frames.
      const openImg = this._rest;
      if (openImg && openImg.complete && openImg.naturalWidth > 0) {
        ctx.drawImage(openImg, GATE_SRC_X, GATE_SRC_Y, GATE_SRC_W, GATE_SRC_H, dX, dY, spriteW, spriteH);
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
    // Branch on the SINGLE state definition (ORCHA 06), not on _reactT/isDormant
    // re-tested independently. State and art therefore cannot disagree, and the
    // energy suite can assert state without ever looking at a sprite offset.
    const vs      = this.visualState;
    const dormant = vs === 'dormant';
    // Crop the documented content box out of the 128x128 canvas. Same rect for
    // every frame, so the gate cannot jitter and §6.2 is not reopened.
    const SX = GATE_SRC_X, SY = GATE_SRC_Y, SW = GATE_SRC_W, SH = GATE_SRC_H;
    const ok = img => img && img.complete && img.naturalWidth > 0;

    // frameFor() owns the state->art mapping; the mapping is asserted centrally.
    // GATE_FRAMES is 8 — a 9 here would index past the array and draw nothing.
    const packImg = this.frameFor(vs);

    if (ok(packImg)) {
      // No glow while dormant: an un-energized gate must not look powered.
      ctx.shadowBlur  = dormant ? 0 : (this._reactT > 0 ? 18 : 8);
      ctx.shadowColor = '#cc44ff';
      ctx.drawImage(packImg, SX, SY, SW, SH, dX, dY, spriteW, spriteH);
    } else if (ok(this._rest)) {
      // Pack present but this frame not decoded yet — hold the rest pose rather
      // than flashing an empty gate.
      ctx.shadowBlur = dormant ? 0 : 8;
      ctx.shadowColor = '#cc44ff';
      ctx.drawImage(this._rest, SX, SY, SW, SH, dX, dY, spriteW, spriteH);
    } else if (ok(this._deadImg) && dormant) {
      // ── LEGACY FALLBACK ONLY (old 128x128 registration, centred 64 crop) ──
      ctx.shadowBlur = 0;
      ctx.drawImage(this._deadImg, 32, 0, 64, 128, dX, dY, spriteW, spriteH);
    } else if (ok(this._sheet)) {
      const CELL = 128;
      const row  = dormant ? 0 : (this._reactT > 0 ? 2 : 1);
      // Legacy sheet really does have 9 columns — keep %9 on this path only.
      const fi   = dormant ? 0 : Math.floor(this._frame) % 9;
      ctx.shadowBlur  = dormant ? 0 : (this._reactT > 0 ? 18 : 8);
      ctx.shadowColor = '#cc44ff';
      ctx.drawImage(this._sheet, fi * CELL + 32, row * CELL, 64, CELL, dX, dY, spriteW, spriteH);
    } else if (ok(this._imgClosed)) {
      ctx.drawImage(this._imgClosed, dX, dY, spriteW, spriteH);
    }
    ctx.restore();

    // Charge progress is communicated by the SPRITE ROWS (dormant -> idle ->
    // charging) plus the numeric ⚡ readout below. The old vertical purple strip
    // that rose from the gate's base was pre-sprite-sheet logic and
    // double-reported the same state on top of the art — removed 2026-09-12
    // on Chief's call ("old logic of the gate vertically being charged").

    // ── O5.2 / O5.3 LABEL + BAR STACK, anchored ABOVE the DRAWN SPRITE ──
    // Chief's playtest: the bar drew at y+h+4 — 4px BELOW the ground surface,
    // i.e. painted onto the floor (L1 surface y=320, bar y=324..330, EXIT y=341).
    // Everything now stacks upward from the sprite top with fixed spacing, so a
    // label can never overlap the art and labels cannot collide with each other.
    //
    // Anchoring to spriteBox() and NOT the hitbox is the whole fix: the hitbox is
    // 32×64 while the art is 94×105, so "just above the hitbox" landed mid-art.
    // labelStack() owns ALL of this geometry, including the flip-below rule for a
    // gate too high to stack above (ORCHA 07). Renderer and tests share it, so a
    // label can never be clamped onto the art.
    const _ls  = this.labelStack();
    const barW = _ls.barW, barH = _ls.barH;
    const barX = _ls.barX, barY = _ls.barY;

    // blockOnly barriers just show a lock — no charge bar, no player interaction
    if (this.blockOnly) {
      ctx.fillStyle = '#9922cc';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#cc44ff';
      // NOT clamped into the sprite — labelStack() flips below when there is no
      // room above. Off-canvas and on-art are both failures; on-art is the one
      // Chief reported.
      ctx.fillText('LOCKED', this.cx, _ls.lockY);
      ctx.shadowBlur = 0;
      return;
    }
    // Charge progress bar — only draw when actively charging. An unconditional
    // dark background read as a stray purple tile (P4 fix); Aki reached the same
    // conclusion in the Builder at 0% fill, and the runtime keeps matching her.
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

    // EXIT label — stacked with the bar by labelStack(). Was barY + barH + 11,
    // which put it at y=341 on Level 1: 21px into the floor.
    if (this.isExit) {
      ctx.fillStyle = '#aa44ff';
      ctx.font      = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#cc44ff';
      ctx.fillText('EXIT', this.cx, _ls.exitY);
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
  destroyed: _wallSwImg('switch_destroyed.png'),  // burn's final frame (see below)
  // frames 001..008 = the vibrate/arc/burn motion (frame_000 deliberately absent)
  burn: Array.from({ length: 8 }, (_, k) => _wallSwImg(`frame_00${k + 1}.png`)),
  // O5.4 (Chief's playtest): "once switch is completely shorted it should look like
  // the powered off sprite." This SUPERSEDES ratified F8, which reserved
  // switch_off.png as unused in v1. Measured cause: switch_destroyed is the
  // GREENEST sprite in the set (mean RGB [90,108,87] vs switch_off [101,108,113]),
  // so the settled dead state read as energised. Same trap as fence_dead measuring
  // brighter than the live frames: colour is not a reliable state signal.
  off:       _wallSwImg('switch_off.png'),        // settled end state (O5.4)
};
const WALL_SW_CANVAS = 56;        // uniform export canvas; anchor from THIS (F4)

// ── CONTENT-BOTTOM ANCHORING (O5.4, measured in ORCHA 09) ──────────────────
// Bottom padding is a constant 3px across every burn frame AND switch_destroyed,
// so canvas anchoring keeps the switch planted for the whole animation. But
// switch_off is the ONLY file with botPad = 4, so canvas-anchoring it would move
// the switch 1px on the exact frame the player is watching it settle.
//
// The switch is wall-mounted: its base staying put is what reads as "the same
// object changed state" rather than "a different object appeared".
//
// This is NOT per-frame bbox anchoring and does not reopen §6.2 — it is a fixed
// per-FILE correction from a measured table, and the burn frames all share one
// value so the vibration (a 2px HORIZONTAL spread) is preserved untouched.
const WALL_SW_BOT_PAD = 3;                 // burn frames + switch_on + destroyed
const WALL_SW_BOT_PAD_OFF = 4;             // switch_off, the only outlier
const _wallSwDY = (baseY, img) =>
  baseY - WALL_SW_CANVAS + ((img === WALL_SW.off) ? (WALL_SW_BOT_PAD_OFF - WALL_SW_BOT_PAD) : 0);

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
    let img;
    if (!this.on) {
      img = WALL_SW.on;                       // F5: NOT lit — powered, feeding the fence
    } else if (!this.burnDone) {
      const k = Math.min(this.burnFrames - 1,
        Math.floor(this._destroyT * WALL_SW_DESTROY_FPS));
      img = WALL_SW.burn[k];                  // frames 001..008, once, in order
    } else {
      // O5.4: settles to the genuinely-unpowered sprite. RENDER-ONLY swap — the
      // state machine (_destroyT, the burnDone latch, the single switch authority)
      // is untouched, same discipline as the original style:"wall" work.
      // switch_destroyed.png is KEPT in the repo per ORCHA 05: it is still the
      // asset to reach for if Chief later wants a scorched end state.
      img = (WALL_SW.off && WALL_SW.off.complete && WALL_SW.off.naturalWidth > 0)
        ? WALL_SW.off
        : WALL_SW.destroyed;                  // fallback: never draw nothing
    }
    // Anchored by CONTENT BOTTOM, so the base does not move as it settles.
    const dY = _wallSwDY(this.y + this.h, img);
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

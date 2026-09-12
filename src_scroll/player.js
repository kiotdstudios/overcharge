// Player: movement, jumping, absorb (E) / charge (SPACE) / attack (K), charge meter
import {
  TILE, COLS, ROWS, GRAVITY, PLAYER_SPEED, JUMP_FORCE,
  PLAYER_W, PLAYER_H, MAX_CHARGE, MAX_BANKED_PIPS, ABSORB_RATE, DISCHARGE_RATE, C,
  RUN_MULTIPLIER, STUN_DURATION, ATTACK_RADIUS, ATTACK_COOLDOWN, INTERACT_RADIUS
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
    this._updateAbsorb(dt, level);    // hold E near source  → absorb
    this._updateAttack(dt, level);    // press K             → attack (melee now, projectile later)
    this._updateDischarge(dt, level); // hold SPACE near gate/switch → gradual charge
    // ORDER SPACE_CHARGE: _updatePipSpend() is GONE. No button may complete a
    // gate in one press. The spendPip() authority function is retained (the
    // reserve path and Order 004 ruling-3 tests use it) — only its KeyF input
    // binding was removed.
    this._collectPickups(level);

    // NOTE: there is deliberately NO unconditional reserve-pull here.
    // A previous build called _applyBankReserve() every frame, which
    // fought the bank-on-full rule: absorb would set (bar=0, pips+1) and
    // the reserve would immediately undo it (bar=MAX, pips-1) in the same
    // frame — so pips could never accumulate. The reserve is now pulled
    // only at points of DEMAND (see _pullReserve callers).

    // Tick sprite animator — threshold at 20 avoids idle/walk flicker during decel
    const isMoving = Math.abs(this.vx) > 20;
    this._sprites.update(dt, isMoving, this._facingRight, this.absorbing, this.running, !this.grounded, this.discharging, Math.abs(this.vx), this.vy);
  }

  // ══ CANONICAL ENERGY MODEL (Order 004 authority) ══════════════════
  // A banked pip IS one stored full battery. Four entry points, and only four:
  //
  //   INGEST   giveEnergy(n)      bar fills → hits MAX → +1 pip, bar resets
  //                               to 0 → keeps filling. Returns accepted.
  //   SPEND    spendEnergy(n)     bar drains → hits 0 → pulls 1 pip → keeps
  //                               draining. Returns actually-spent.
  //   RESERVE  _pullReserve()     internal, DEMAND-DRIVEN only (see ruling 2).
  //   RESTORE  setEnergyState()   validated save/load write. Clamps + warns.
  //
  // NOTHING outside this block may assign to `charge` or `bankedPips`.
  // Every energy-gain path routes through giveEnergy().
  // Every energy-loss path routes through spendEnergy().
  // Every affordability question routes through `usableEnergy` / canAfford().

  // Total energy the player can actually deliver right now. This is THE
  // authority — HUD prompts and gameplay both read it, so UI can never
  // disagree with what the interaction will actually do.
  get usableEnergy() { return this.charge + this.bankedPips * MAX_CHARGE; }

  canAfford(amount) { return this.usableEnergy >= amount - 1e-9; }

  // How much more energy the player can physically accept.
  get energyHeadroom() {
    return (MAX_CHARGE - this.charge) + (MAX_BANKED_PIPS - this.bankedPips) * MAX_CHARGE;
  }

  // ── INGEST ────────────────────────────────────────────────────────
  // Deposit energy: fill the active bar, and each time the bar tops out
  // convert that full bar into +1 banked pip and reset the bar to 0.
  // Returns the amount ACTUALLY accepted so callers (e.g. a source being
  // drained) can refund what wouldn't fit instead of destroying it.
  //
  // At the pip cap we stop accepting and leave the bar sitting at full —
  // energy is refused, never silently deleted (Chief directive §1).
  giveEnergy(amount) {
    let remain   = Math.max(0, amount);
    let accepted = 0;

    while (remain > 1e-9) {
      const space = MAX_CHARGE - this.charge;

      if (space > 1e-9) {
        // Room in the bar — pour in.
        const take = Math.min(remain, space);
        this.charge += take;
        remain      -= take;
        accepted    += take;
      }

      // Bar topped out? Convert it to a stored battery and start a new bar.
      if (this.charge >= MAX_CHARGE - 1e-9) {
        if (this.bankedPips < MAX_BANKED_PIPS) {
          this.bankedPips++;
          this.charge     = 0;
          this._pipBankFx = 0.5;      // pip rack flashes on bank
        } else {
          // Pip cap reached: hold the bar at full and refuse the rest.
          this.charge = MAX_CHARGE;
          break;
        }
      }
    }
    return accepted;
  }

  // ── SPEND-SIDE RESERVE ────────────────────────────────────────────
  // Pull one stored battery into the active bar. Called ONLY when
  // something actually demands energy and the bar is dry, so idle
  // walking never reshuffles the player's reserve.
  //
  // ORDER 004 RULING 2 (Kiro, 2026-09-11): §8's "eager" auto-refill on any
  // tick is REJECTED and the order is amended — pips are pulled on demand at
  // the moment of spend/damage, never on an idle tick. The unconditional
  // every-frame version was the regression fixed in b558d1b: it fought the
  // banking logic so pips could never accumulate. Do not reintroduce it.
  _pullReserve() {
    if (this.charge > 1e-9 || this.bankedPips <= 0) return false;
    this.bankedPips--;
    this.charge      = MAX_CHARGE;
    this._pipSpendFx = 0.45;
    return true;
  }

  // ── SPEND ─────────────────────────────────────────────────────────
  // The exact mirror of giveEnergy(), and the ONE way energy leaves the
  // player (Order 004 §9: drains, damage and future devices must not invent
  // their own arithmetic).
  //
  // Drains the active bar first; when the bar runs dry and a stored battery
  // exists, promotes that pip via _pullReserve() and keeps draining. Returns
  // the amount ACTUALLY spent, which is <= amount when the player simply does
  // not have it. Never produces a negative bar and never fabricates energy.
  //
  // Callers that must know whether the whole cost was met should compare the
  // return value, or ask canAfford() first.
  spendEnergy(amount) {
    let remain = Math.max(0, amount);
    let spent  = 0;

    while (remain > 1e-9) {
      if (this.charge <= 1e-9 && !this._pullReserve()) break;   // truly empty
      const take = Math.min(remain, this.charge);
      this.charge -= take;
      remain      -= take;
      spent       += take;
      if (this.charge < 1e-9) this.charge = 0;                  // kill FP dust
    }
    return spent;
  }

  // ── SPEND ONE WHOLE PIP ───────────────────────────────────────────
  // Withdraw exactly one stored battery (MAX_CHARGE) WITHOUT disturbing the
  // active bar. Used by the F-key shortcut, where a pip is indivisible at the
  // point of insertion (ratified partial-pip policy, ruling 3).
  //
  // Returns MAX_CHARGE when a pip was withdrawn, 0 when none was stored. The
  // caller owns that energy and must deliver it or return it via giveEnergy();
  // it is deliberately NOT left in the bar, so a pip spend can never be
  // mistaken for the bar draining.
  spendPip() {
    if (this.bankedPips <= 0) return 0;
    this.bankedPips--;
    return MAX_CHARGE;
  }

  // ── STATE RESTORE (save/load, checkpoint, level carry) ────────────
  // The only sanctioned way to write charge/bankedPips from outside.
  //
  // Order 004 §13 requires charge state to survive save/load. Round-tripping
  // the numbers was already correct, but nothing validated them: forcing
  // charge=999 / pips=99 produced energyHeadroom = -1929, which poisons every
  // downstream calculation (absorption requests, affordability, HUD widths).
  // Clamp into the legal envelope and warn loudly rather than accept an
  // impossible state.
  //
  // Returns true when the requested state was already legal, false when it had
  // to be corrected — so a caller/test can assert on silent corruption.
  setEnergyState(charge, bankedPips) {
    const rawC = Number(charge);
    const rawP = Number(bankedPips);

    const c = Number.isFinite(rawC) ? Math.min(MAX_CHARGE, Math.max(0, rawC)) : 0;
    // Pips are whole batteries by definition — a fractional pip is nonsense.
    const p = Number.isFinite(rawP)
      ? Math.min(MAX_BANKED_PIPS, Math.max(0, Math.floor(rawP)))
      : 0;

    const clean = (c === rawC) && (p === rawP);
    if (!clean) {
      console.warn(
        `[energy] restored state out of range — clamped charge ${rawC}->${c}, ` +
        `pips ${rawP}->${p} (MAX_CHARGE=${MAX_CHARGE}, MAX_BANKED_PIPS=${MAX_BANKED_PIPS})`
      );
    }

    this.charge     = c;
    this.bankedPips = p;
    return clean;
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
    // Jump: Up / W only. SPACE is the charge button, K is attack.
    const jump = Input.pressedAny('ArrowUp', 'KeyW');

    const shift = Input.heldAny('ShiftLeft', 'ShiftRight');
    this.running = shift && (left || right);
    const speed  = this.running ? PLAYER_SPEED * RUN_MULTIPLIER : PLAYER_SPEED;

    if (left)  { this.vx = -speed; this._facingRight = false; }
    else if (right) { this.vx =  speed; this._facingRight = true; }
    // Ground friction only — preserve horizontal momentum through jump arcs
    else if (this.grounded) { this.vx *= 0.75; if (Math.abs(this.vx) < 5) this.vx = 0; }

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
    this._resolveCrates(level, prevBottom);   // crates are solid — land on top (D7)

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
    // Gate horizontal collision: use blocksHorizontal (X-only) so the player
    // cannot jump over a closed gate — it acts as a full-height wall for
    // horizontal movement. The AABB-based blocks() is still used for
    // vertical landing (see _resolveY) so Chief can still stand on top.
    for (const gate of level.gates) {
      if (gate.blocksHorizontal(this.x, this.w)) {
        if (this.vx > 0) this.x = gate.x - this.w;
        else if (this.vx < 0) this.x = gate.x + gate.w;
        this.vx = 0;
      }
    }

    // ── Crate push (ORDER CRATE_TIMED, D6) ────────────────────────────
    // Walking into a crate pushes it. Resolved HERE, in the same pass gates use,
    // because the resolution order is what makes the guarantee hold:
    //   crate destination clear  → crate moves, player follows flush behind it
    //   crate blocked            → THE PLAYER is blocked instead
    // So a crate can never be shoved into a tile, a closed gate, another crate,
    // or off the level edge: it is impossible by construction, not by clamping
    // afterwards. No vertical push, no grab, no carry (D6).
    for (const crate of level.crates) {
      // Must overlap on BOTH axes — you can only push a crate you are beside.
      // (Y overlap alone would let a player standing ON a crate drag it.)
      const yOverlap = this.y < crate.y + crate.h && this.y + this.h > crate.y;
      const xOverlap = this.x < crate.x + crate.w && this.x + this.w > crate.x;
      if (!yOverlap || !xOverlap) continue;

      if (this.vx > 0) {
        const intrusion = (this.x + this.w) - crate.x;       // how far we pushed in
        const moved     = crate.tryMoveX(intrusion, level);
        this.x = crate.x - this.w;                            // stand flush
        if (moved === 0) this.vx = 0;                         // crate stuck → we stop
      } else if (this.vx < 0) {
        const intrusion = (crate.x + crate.w) - this.x;
        const moved     = crate.tryMoveX(-intrusion, level);
        this.x = crate.x + crate.w;
        if (moved === 0) this.vx = 0;
      }
    }
  }

  // ── Standing on a crate (D7: crates are solid) ────────────────────
  // Mirrors _resolvePlatforms: land only when falling onto the top face, using
  // prevBottom from before this frame's y-move so a fast fall cannot tunnel.
  _resolveCrates(level, prevBottom) {
    for (const cr of level.crates) {
      const overlapX = this.x < cr.x + cr.w && this.x + this.w > cr.x;
      if (!overlapX) continue;
      const bottom = this.y + this.h;
      if (this.vy >= 0 && prevBottom <= cr.y + 8 && bottom >= cr.y && bottom <= cr.y + cr.h) {
        this.y        = cr.y - this.h;
        this.vy       = 0;
        this.grounded = true;
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
        if (tile === 1 || tile >= 10) {   // legacy 1 OR any variant tile is solid ground
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
  // Routes 100% through giveEnergy(), so the fill → bank → reset loop is
  // identical to every other energy-gain path. Anything giveEnergy refuses
  // (pip cap reached) is refunded to the source rather than destroyed.
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

    // Note: headroom is total capacity (bar + remaining pip slots), NOT
    // just bar headroom. The old `MAX_CHARGE - this.charge` clamp stalled
    // absorption dead the instant the bar filled, which is why banking
    // never happened in live play.
    if (holdE && this.nearSource && this.energyHeadroom > 1e-9) {
      this.absorbing    = true;
      this.absorbTarget = this.nearSource;
      const request  = Math.min(ABSORB_RATE * dt, this.nearSource.charge, this.energyHeadroom);
      const drained  = this.nearSource.drain(request);
      const accepted = this.giveEnergy(drained);
      // Refund whatever wouldn't fit — energy is conserved, never deleted.
      const refund = drained - accepted;
      if (refund > 1e-9) {
        this.nearSource.charge += refund;
        this.nearSource.drained = this.nearSource.charge <= 0;
      }
      this._absorbFx = 0.15;
    } else {
      this.absorbing    = false;
      this.absorbTarget = null;
    }
  }

  // ── Attack (press K) ─────────────────────────────────────────────
  // ORDER SPACE_CHARGE + Chief amendment 2026-09-11: K is the attack/projectile
  // button; SPACE is the charge button. Separate keys, so there is NO context
  // priority to resolve — the gate-vs-enemy ambiguity that a shared SPACE would
  // have created does not exist.
  //
  // Structured as an explicit branch table so the projectile slots in later
  // WITHOUT rewiring charge or melee:
  //   branch 1  near enemy   → melee hit            (implemented)
  //   branch 2  no target    → electric projectile  (NOT built under this order)
  _updateAttack(dt, level) {
    if (this._stunTime > 0) return;
    if (this._attackCooldown > 0) return;
    if (!Input.pressed('KeyK')) return;

    if (this.nearEnemy) {
      // branch 1 — melee
      this.nearEnemy.hit(level);
      this._attackCooldown = ATTACK_COOLDOWN;
      this._attackFx       = 0.15;
      return;
    }

    // branch 2 — future: fire an electric projectile here. Deliberately inert
    // under this order (no projectiles, no new weapons). Left as a no-op rather
    // than a stub that costs energy, so nothing silently drains the bar.
  }


  // ── Charge a device (hold SPACE near gate/switch) ────────────────
  //
  // Interaction model after ORDER SPACE_CHARGE (Chief, 2026-09-11):
  //  • SPACE is the charge button. Hold near a gate/switch to transfer energy
  //    gradually at DISCHARGE_RATE. Nothing completes a gate in one press.
  //  • E is absorb/interact at sources ONLY. Charging is SPACE-only — one
  //    mechanic, one binding (order §3; two bindings for one mechanic is what
  //    made the old E/F split confusing).
  //  • K is attack. It never touches energy.
  //  • The mechanic itself is UNCHANGED from Order 004 — same spendEnergy()
  //    authority, same dev.receive() path, same `needed` cap. Only the binding
  //    moved, which is exactly what the order asked for.
  //  • The bar drains first; the instant it runs dry with a pip stored,
  //    spendEnergy() promotes that pip via _pullReserve() in the SAME frame, so
  //    the transfer never visibly stalls at a pip boundary.
  //  • Affordability is asked via `usableEnergy` — same authority the HUD
  //    prompt uses, so UI and gameplay can never disagree.
  _updateDischarge(dt, level) {
    const holdCharge = Input.heldAny('Space');

    // NOTE: the old `this.nearSource` exclusion is deliberately GONE. It existed
    // only because E did double duty (absorb AND discharge), so one key could
    // not mean both at once. Now that charging is SPACE and absorbing is E, a
    // player standing between a source and a gate can legitimately do either.
    // Keeping the guard would have silently blocked SPACE-charging near a
    // source — the same class of bug as the old F-prompt suppression.
    // ── Resolve WHAT this SPACE hold is charging ──────────────────────
    // Either a device directly, or a device reached THROUGH a crate (D3).
    // `viaCrate` is the crate acting as the wire, purely so the render layer can
    // flash it; it plays no part in the arithmetic, because a crate has no
    // capacity (D1) and adds no rate penalty or loss — v1 is reach, not cost.
    let target   = this.nearDevice;
    let viaCrate = null;
    if (!target && this.nearCrate && this.crateBridge === 'ok' && this.crateTarget) {
      target   = this.crateTarget;
      viaCrate = this.nearCrate;
    }
    // D4 / D5: a crate bridging NOTHING, or bridging AMBIGUOUSLY, leaves `target`
    // null — so the guard below refuses and the player keeps every unit of
    // energy. Refusal is silent in the arithmetic and LOUD in the HUD
    // (NOT CONNECTED / AMBIGUOUS CONTACT), never a silent no-op.

    if (!holdCharge || !this.grounded || !target || this.usableEnergy <= 1e-9) {
      this.discharging     = false;
      this.dischargeTarget = null;
      this.chargeViaCrate  = null;
      return;
    }

    const needed = target.required - target.charged;
    if (needed <= 1e-9) {
      this.discharging     = false;
      this.dischargeTarget = null;
      this.chargeViaCrate  = null;
      return;
    }

    // Order 004 §9: the deduction goes through spendEnergy(), which drains the
    // bar and promotes a stored battery the instant the bar runs dry — so the
    // transfer never visibly stalls at a pip boundary and there is no second
    // copy of the drain arithmetic here. Capped by `needed` so a device is never
    // overcharged, and by what the player actually has.
    //
    // Crate-routed transfers use this SAME call and the SAME device.receive(),
    // so dormancy wake, _reactT, charged/open and conservation are identical to
    // charging the device directly. There is deliberately no second transfer
    // path for crates.
    const want       = Math.min(DISCHARGE_RATE * dt, needed);
    const frameSpend = this.spendEnergy(want);

    if (frameSpend > 1e-9) {
      this.discharging      = true;
      this.dischargeTarget  = target;
      this.chargeViaCrate   = viaCrate;
      this._dischargeFx     = 0.15;
      target.receive(frameSpend);
      if (viaCrate) viaCrate._bridgeFx = 0.15;   // visual only
    } else {
      this.discharging     = false;
      this.dischargeTarget = null;
      this.chargeViaCrate  = null;
    }
  }

  // ── REMOVED: _updatePipSpend() — the F instant-fill ─────────────
  // ORDER SPACE_CHARGE (Chief, 2026-09-11): pressing F near a device inserted a
  // whole battery (MAX_CHARGE = 10) in a single press. With Level 1's exit gate
  // at required=3 (later 8), one tap opened it outright. Chief rejected that:
  // "hitting f auto completes the charge gate, i dont want that".
  //
  // The handler is gone and KeyF is now unbound. Charging is SPACE-only and
  // strictly rate-based, so no button can complete a gate in one press.
  //
  // spendPip() itself SURVIVES in the energy authority above and is deliberately
  // NOT deleted:
  //   - it is the documented withdraw-one-whole-battery primitive,
  //   - Order 004 ruling 3 (partial-pip: whole pip consumed, surplus returned)
  //     is asserted against it directly in _dev/energy_authority.mjs,
  //   - a future device/ability can reuse it without re-deriving the arithmetic.
  // Only the input binding was removed, exactly as the order specified.

  // ── Collect dropped charge pickups ───────────
  // Also routes through giveEnergy() so a pickup that tops the bar out
  // banks a pip exactly like source absorption does.
  _collectPickups(level) {
    for (const p of level.pickups) {
      if (p.done || !p.collectable) continue;
      if (!p.inRange(this.cx, this.cy)) continue;
      if (this.energyHeadroom <= 1e-9) continue;   // completely full — leave it on the ground
      const accepted = this.giveEnergy(p.value);
      if (accepted > 1e-9) p.done = true;
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

    // ── Crate proximity + bridge resolution (ORDER CRATE_TIMED, D3/D4/D5) ──
    // Resolved here, in the same pass as nearDevice, so the HUD and the SPACE
    // handler read ONE precomputed answer and cannot disagree about what a crate
    // is bridging this frame.
    //
    //   nearCrate    the crate the player is standing next to (or null)
    //   crateBridge  'ok' | 'none' | 'ambiguous'  (null when no crate nearby)
    //   crateTarget  the device energy would flow into, only when 'ok'
    //
    // A crate is only offered when the player is NOT already next to a device
    // directly: charging the device you are touching always wins over routing
    // through a crate, so a crate can never hijack a normal gate interaction.
    this.nearCrate   = null;
    this.crateBridge = null;
    this.crateTarget = null;
    if (!this.nearDevice) {
      for (const cr of level.crates) {
        const cx = Math.max(cr.x, Math.min(this.cx, cr.x + cr.w));
        const cy = Math.max(cr.y, Math.min(this.cy, cr.y + cr.h));
        const dx = this.cx - cx, dy = this.cy - cy;
        if (Math.sqrt(dx * dx + dy * dy) < INTERACT_RADIUS) {
          const b = cr.bridgeTarget(level);
          this.nearCrate   = cr;
          this.crateBridge = b.state;
          this.crateTarget = b.target;
          // D5 (Kiro veto): ambiguity is REFUSED and REPORTED, never guessed.
          // Warn once per entry into the ambiguous state, not every frame.
          if (b.state === 'ambiguous' && !cr._warnedAmbiguous) {
            cr._warnedAmbiguous = true;
            console.warn(`[crate] "${cr.id}" touches ${b.all.length} chargeable devices ` +
              `(${b.all.map(d => d.id).join(', ')}) — refusing to conduct. ` +
              `A crate must bridge exactly ONE device.`);
          }
          if (b.state !== 'ambiguous') cr._warnedAmbiguous = false;
          break;
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

  // ── Drop spent charge as recoverable pickups ─────────────────────
  // Conservation helper (Order 004 §7): the pickups dropped must sum to
  // EXACTLY the energy deducted. Whole units drop as normal 1-unit pickups;
  // any fractional remainder drops as one smaller pickup rather than being
  // rounded away (which would destroy energy) or rounded up (which would
  // create it).
  _dropCharge(level, amount, vx = null, vy = null) {
    let remain = amount;
    let dropped = 0;
    while (remain > 1e-9) {
      const v = Math.min(1, remain);
      level.pickups.push(vx === null
        ? new ChargePickup(this.cx, this.cy, v)
        : new ChargePickup(this.cx, this.cy, v, vx, vy));
      remain -= v;
      dropped += v;
    }
    return dropped;
  }

  // ── Charge scatter on hit ────────────────────────────────────────
  // Bar has charge   → drop 1 unit as a recoverable pickup.
  // Bar dry + pip    → spendEnergy pulls one stored battery (demand-driven
  //                    reserve) and takes the unit from it. Survives on reserve.
  // Nothing at all   → die.
  //
  // Order 004 §9: goes through spendEnergy(), so the reserve is reachable and
  // the amount dropped is exactly the amount actually deducted. The previous
  // `charge = Math.max(0, charge - 1)` bypassed the authority AND leaked
  // energy: with a bar of 0.5 it deducted 0.5 but still dropped a full 1-unit
  // pickup, creating 0.5 out of nothing. Normal full-unit hits behave
  // identically to before.
  scatter(level) {
    const lost = this.spendEnergy(1);
    if (lost > 1e-9) {
      const xDir = this._facingRight ? -1 : 1;
      const vx   = xDir * (110 + Math.random() * 70);
      const vy   = -170 - Math.random() * 60;
      this._dropCharge(level, lost, vx, vy);
    } else {
      // No bar, no pips → dead.
      this.dead = true;
    }
  }

  // ── Take damage (charge scatter) — kept for future use ──────────
  // Enemy contact does not call this today; stun() is used instead. Fixed here
  // because it is live code and a landmine.
  //
  // BUG (Order 004 gap 2): it read `this.charge` only, so a player holding
  // bar 0 + 3 pips took ZERO damage — usable energy 30 stayed 30. Same defect
  // class as the gate reporting POWER REQUIRED off the bar instead of
  // usableEnergy. Now routed through spendEnergy(), so the reserve is drained
  // and the pickups dropped sum to exactly what was lost.
  takeDamage(level, amount = 1) {
    const lost = this.spendEnergy(amount);
    this._hurtFlash = 0.4;
    this._dropCharge(level, lost);
    return lost;
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

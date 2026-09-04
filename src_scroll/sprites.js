// Sprite animation system
// Animations live at assets/sprites/{anim}/{dir}/frame_NNN.png
// Priority: discharge/absorb > jump > run > walk > idle

import { WALK_FPS, RUN_FPS } from './constants.js';

// Preload an array of image paths → returns array of HTMLImageElement
function loadFrames(paths) {
  return paths.map(p => {
    const img = new Image();
    img.src = p;
    return img;
  });
}

// Build frame path list: assets/sprites/{anim}/{dir}/frame_000.png ... frame_NNN.png
function framePaths(anim, dir, count) {
  return Array.from({ length: count }, (_, i) =>
    `assets/sprites/${anim}/${dir}/frame_${String(i).padStart(3, '0')}.png`
  );
}

// ── Animator: owns one animation's frame state ────────────────────
export class Animator {
  constructor(frames, fps = 8) {
    this.frames  = frames;
    this.fps     = fps;
    this._frame  = 0;
    this._t      = 0;
    this.done    = false; // set true on one-shot animations
  }

  reset() { this._frame = 0; this._t = 0; this.done = false; }

  update(dt) {
    this._t += dt;
    const interval = 1 / this.fps;
    if (this._t >= interval) {
      this._t -= interval;
      const next = (this._frame + 1) % this.frames.length;
      // Only advance if the next frame image is fully loaded — avoids blank-frame jitter
      // during the first few seconds when images are still fetching
      if (this.frames[next].complete && this.frames[next].naturalWidth > 0) {
        if (next === 0) this.done = true; // wrapped = one cycle done
        this._frame = next;
      }
    }
  }

  get image() { return this.frames[this._frame]; }
}

// ── PlayerSprites: all animation states for the player ─────────────
// Anims: idle (11f), walking (9f), jumping (9f), running (8f), charge (11f), discharge (11f)
export class PlayerSprites {
  constructor() {
    // East variants
    this.idle_e      = new Animator(loadFrames(framePaths('idle_2.0',    'east', 11)), WALK_FPS);
    this.walk_e      = new Animator(loadFrames(framePaths('walking',     'east',  9)), WALK_FPS);
    this.jump_e      = new Animator(loadFrames(framePaths('jumping',     'east',  9)), WALK_FPS);
    this.run_e       = new Animator(loadFrames(framePaths('running',     'east',  8)), RUN_FPS);
    this.charge_e    = new Animator(loadFrames(framePaths('charge_anim', 'east', 11)), 18);
    this.discharge_e = new Animator(loadFrames(framePaths('discharge',   'east', 11)), WALK_FPS);

    // West variants
    this.idle_w      = new Animator(loadFrames(framePaths('idle_2.0',    'west', 11)), WALK_FPS);
    this.walk_w      = new Animator(loadFrames(framePaths('walking',     'west',  9)), WALK_FPS);
    this.jump_w      = new Animator(loadFrames(framePaths('jumping',     'west',  9)), WALK_FPS);
    this.run_w       = new Animator(loadFrames(framePaths('running',     'west',  8)), RUN_FPS);
    this.charge_w    = new Animator(loadFrames(framePaths('charge_anim', 'west', 11)), 18);
    this.discharge_w = new Animator(loadFrames(framePaths('discharge',   'west', 11)), WALK_FPS);

    // Active animator reference
    this._current = this.idle_e;
  }

  // speed = |vx| in px/s, vy = vertical velocity (negative=rising, positive=falling)
  // Jump frame selection is driven by vy so the pose mirrors physics — no time-based advance.
  update(dt, isMoving, facingRight, isAbsorbing, isRunning, isJumping, isDischarging, speed = 0, vy = 0) {
    const dir  = facingRight ? 'e' : 'w';
    const jump = this[`jump_${dir}`];

    let next;
    let jumpDriven = false;  // true = skip Animator.update(), frame already set

    if (isAbsorbing || isDischarging) {
      // Energy states take top priority — charge/discharge anim always wins
      next = this[`charge_${dir}`];

    } else if (isJumping) {
      // Velocity-driven frame selection — pose reflects actual arc position:
      //   vy = -430 (just launched)  → frame 0  (knees bent, arms up)
      //   vy =    0 (apex)           → frame 4  (full body extension)
      //   vy = +430 (falling fast)   → frame 8  (tuck, landing prep)
      // JUMP_FORCE = -430, so mapping vy ∈ [-430, +430] → t ∈ [0, 1] is natural.
      // Values beyond ±430 (coyote, terminal) are clamped.
      next = jump;
      const t   = Math.max(0, Math.min(1, (vy + 430) / 860));
      jump._frame = Math.round(t * (jump.frames.length - 1));
      jumpDriven  = true;

    } else if (isRunning && isMoving) {
      next = this[`run_${dir}`];

    } else if (isMoving) {
      next = this[`walk_${dir}`];
      // Distance-based fps: advance one frame per 20px traveled so footsteps match ground speed
      next.fps = Math.max(4, speed / 20);

    } else {
      next = this[`idle_${dir}`];
    }

    // Switch animator — carry frame index when only direction flips (same anim type)
    // so turning left/right mid-stride doesn't snap back to frame 0
    if (next !== this._current) {
      const sameType = next.frames.length === this._current.frames.length;
      if (sameType) {
        next._frame = Math.min(this._current._frame, next.frames.length - 1);
        next._t     = this._current._t;
        next.done   = this._current.done;
      } else {
        next.reset();
      }
      this._current = next;
    }

    // fps for time-driven states (jump bypasses this via jumpDriven)
    if (isDischarging || isAbsorbing) {
      this._current.fps = WALK_FPS;   // slow + deliberate during energy transfer
    } else if (isRunning && isMoving) {
      this._current.fps = RUN_FPS;    // sprint cadence
    } else {
      this._current.fps = WALK_FPS;
    }

    // Jump is physics-driven — don't advance the timer
    if (!jumpDriven) this._current.update(dt);
  }

  get currentFrame() { return this._current.image; }
}

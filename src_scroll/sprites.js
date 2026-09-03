// Sprite animation system
// Animations live at assets/sprites/{anim}/{dir}/frame_NNN.png
// Priority: discharge > charge/absorb > jump > walk > idle

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
// Anims: idle (11f), walking (9f), jumping (9f), charge (9f), discharge (11f)
export class PlayerSprites {
  constructor() {
    // East variants
    this.idle_e      = new Animator(loadFrames(framePaths('idle_2.0',  'east', 11)), WALK_FPS);
    this.walk_e      = new Animator(loadFrames(framePaths('walking',   'east',  9)), WALK_FPS);
    this.jump_e      = new Animator(loadFrames(framePaths('jumping',   'east',  9)), WALK_FPS);
    this.charge_e    = new Animator(loadFrames(framePaths('charge',    'east',  9)), WALK_FPS);
    this.discharge_e = new Animator(loadFrames(framePaths('discharge', 'east', 11)), WALK_FPS);

    // West variants
    this.idle_w      = new Animator(loadFrames(framePaths('idle_2.0',  'west', 11)), WALK_FPS);
    this.walk_w      = new Animator(loadFrames(framePaths('walking',   'west',  9)), WALK_FPS);
    this.jump_w      = new Animator(loadFrames(framePaths('jumping',   'west',  9)), WALK_FPS);
    this.charge_w    = new Animator(loadFrames(framePaths('charge',    'west',  9)), WALK_FPS);
    this.discharge_w = new Animator(loadFrames(framePaths('discharge', 'west', 11)), WALK_FPS);

    // Active animator reference
    this._current = this.idle_e;
  }

  // Testing animations one by one — currently: idle + walk only
  // speed = |vx| in px/s — used to sync walk frames to actual movement (no sliding)
  update(dt, isMoving, facingRight, isAbsorbing, isRunning, isJumping, isDischarging, speed = 0) {
    const dir = facingRight ? 'e' : 'w';

    let next;
    if (isMoving) {
      next = this[`walk_${dir}`];
      // Distance-based fps: advance one frame per 12px traveled so steps match movement
      next.fps = Math.max(3, speed / 55);
    } else {
      next = this[`idle_${dir}`];
    }

    // Switch animator — carry frame index when only direction flips (same anim type),
    // so turning left/right doesn't snap back to frame 0
    if (next !== this._current) {
      const sameType = next.frames.length === this._current.frames.length;
      if (sameType) {
        // Direction flip within same animation — carry timing so it's seamless
        next._frame = Math.min(this._current._frame, next.frames.length - 1);
        next._t     = this._current._t;
        next.done   = this._current.done;
      } else {
        next.reset();
      }
      this._current = next;
    }

    // fps scaling
    if (isDischarging || isAbsorbing) {
      this._current.fps = WALK_FPS;        // deliberate/slow during energy states
    } else if (isRunning && isMoving) {
      this._current.fps = RUN_FPS;         // sprinting
    } else {
      this._current.fps = WALK_FPS;        // walking or standing still
    }

    this._current.update(dt);
  }

  get currentFrame() { return this._current.image; }
}

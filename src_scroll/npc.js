// npc.js — ORDER 22: dialogue-capable NPCs. Ambient animation + proximity speech
// bubbles, authored entirely through the Builder's NPC Inspector and
// `level.npcs` (see docs/reference/LEVEL_SCHEMA.md "NPC" section). An absent/empty
// `npcs` array is zero behavioural change for every level authored before
// this order — see Level constructor.
//
// Order 23 migrated Order 20's smoke-break workers from `decorations[]` into
// this same `npcs[]` pipeline: a first-class, Builder-selectable object with
// its own array, dialogue OPTIONAL (defaults disabled/empty, same as any NPC),
// plus an `ambient` idle<->smoke state machine (see below) driving a one-shot
// action animation between idle dwells. Any NPC may carry an `ambient` config;
// it is independent of dialogue and of `assetId` (which remains the IDLE sprite).
import { assetById, animFromAsset, framesFor, frameAt } from './deco-anim.js';
import { npcGeometry } from './npc-geometry.js';

const DEFAULT_DIALOGUE = {
  enabled:       false,
  trigger:       'player_proximity',
  radiusPx:      112,
  triggerMode:   'enter',
  cooldownMs:    6000,
  oncePerLevel:  false,
  durationMs:    3500,
  lines:         [],
  selectionMode: 'sequential',
};

// Builder/game both need a floor so a 1-frame typo in authored JSON cannot
// make a bubble flash for 1ms or hang forever.
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 30000;

function clampDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n)) return DEFAULT_DIALOGUE.durationMs;
  return Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, n));
}

// Stable fallback seed when a level author omits `ambient.seed`: a cheap
// string hash of the NPC's own id, so two differently-named NPCs placed at
// the same instant never roll identical dwell timers.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

export class Npc {
  constructor(def) {
    this.id              = def.id || ('npc_' + Math.random().toString(36).slice(2));
    this.assetId         = def.assetId || null;
    this.greetingAssetId = def.greetingAssetId || null;
    this.walkAssetId     = def.walkAssetId || null;
    this.poweredAssetId  = def.poweredAssetId || null;
    this.linkedObjectId  = def.linkedObjectId || null;
    this.x               = Number(def.x) || 0;   // feet anchor, world px (bottom-centre)
    this.y               = Number(def.y) || 0;   // ground line the feet rest on
    this.facing          = def.facing === 'left' ? 'left' : 'right';
    const patrol = def.patrol || {};
    this.patrol = {
      rangePx: Number.isFinite(Number(patrol.rangePx)) ? Math.max(0, Number(patrol.rangePx)) : 0,
      speedPxPerSec: Number.isFinite(Number(patrol.speedPxPerSec)) ? Math.max(0, Number(patrol.speedPxPerSec)) : 22,
      turnPauseSec: Number.isFinite(Number(patrol.turnPauseSec)) ? Math.max(0, Number(patrol.turnPauseSec)) : 0.55,
    };
    this._homeX = this.x;
    this._direction = this.facing === 'left' ? -1 : 1;
    this._turnPauseT = 0;
    this._walkClock = 0;
    this._walkDistance = 0;
    this._walking = false;
    // Draw-size multiplier against the sprite's native pixel dimensions.
    // Lets an NPC reuse art authored at a different canvas size than its
    // in-level footprint (e.g. the smoke-break workers' 176px canvas drawn
    // at the same ~96px footprint their decoration-era placement used).
    this.scale           = Number.isFinite(Number(def.scale)) && Number(def.scale) > 0 ? Number(def.scale) : 1;

    const d = def.dialogue || {};
    this.dialogue = {
      enabled:       !!d.enabled,
      trigger:       d.trigger === 'player_proximity' ? d.trigger : DEFAULT_DIALOGUE.trigger,
      radiusPx:      Number.isFinite(Number(d.radiusPx)) ? Math.max(1, Number(d.radiusPx)) : DEFAULT_DIALOGUE.radiusPx,
      triggerMode:   d.triggerMode === 'enter' ? d.triggerMode : DEFAULT_DIALOGUE.triggerMode,
      cooldownMs:    Number.isFinite(Number(d.cooldownMs)) ? Math.max(0, Number(d.cooldownMs)) : DEFAULT_DIALOGUE.cooldownMs,
      oncePerLevel:  !!d.oncePerLevel,
      durationMs:    clampDuration(d.durationMs),
      lines:         Array.isArray(d.lines) ? d.lines.filter(l => l && typeof l.text === 'string' && l.text.length > 0) : [],
      poweredLines:  (Array.isArray(d.poweredLines) ? d.poweredLines :
        Array.isArray(def.poweredLines) ? def.poweredLines : [])
        .filter(l => l && typeof l.text === 'string' && l.text.length > 0),
      selectionMode: d.selectionMode === 'random' ? d.selectionMode : DEFAULT_DIALOGUE.selectionMode,
    };

    // Ambient idle<->smoke animation state machine (Order 23). `assetId` is
    // always the IDLE loop; `smokeAssetId` is a one-shot action asset played
    // once per cycle, then control returns to idle for a fresh randomized dwell.
    // Absent/null `def.ambient` is a complete no-op — _currentFrame() falls back
    // to the plain always-on ambient sprite exactly as before this order, so
    // every non-ambient NPC (e.g. the streetlamp woman) is unaffected.
    const amb = def.ambient || null;
    this.ambient = amb ? {
      smokeAssetId: amb.smokeAssetId || null,
      dwellMinMs:   Number.isFinite(Number(amb.dwellMinMs)) ? Math.max(0, Number(amb.dwellMinMs)) : 4000,
      dwellMaxMs:   Number.isFinite(Number(amb.dwellMaxMs)) ? Math.max(0, Number(amb.dwellMaxMs)) : 9000,
      seed:         Number.isFinite(Number(amb.seed)) ? Number(amb.seed) >>> 0 : hashSeed(this.id),
    } : null;
    this._ambState     = 'idle';   // 'idle' | 'smoke'
    this._ambTimerMs    = 0;        // ms remaining in the current idle dwell
    this._smokeElapsed = 0;        // ms elapsed in the current one-shot smoke play
    this._rngState      = this.ambient ? this.ambient.seed : 0;
    if (this.ambient) this._ambTimerMs = this._rollDwell();

    // Runtime-only state. Never persisted — a save/reload or a fresh level load
    // always starts an NPC in the "never triggered" state.
    this._wasInside     = false;
    this._cooldownT     = 0;     // seconds remaining before this NPC may trigger again
    this._bubbleT       = 0;     // seconds remaining the bubble stays visible
    this._bubbleText    = '';
    this._lineIdx       = 0;
    this._triggeredOnce = false; // for oncePerLevel
    this._greetT        = 0;     // seconds remaining the greeting animation plays
    this._greetStartedAt = 0;
    this._clock         = 0;     // per-instance elapsed seconds, drives ambient frame choice
    this._sprites       = null;  // resolved lazily — see _resolveSprites()
    this._powered = false;
    this._reliefClock = 0;
    this._justRelieved = false;
  }

  // Deterministic-but-varied per-instance RNG (mulberry32), seeded once from
  // `ambient.seed` (authored or hashed from `id`). Advances on every call so
  // repeated dwells vary, while two NPCs with different ids/seeds never sync.
  _nextRandom() {
    let t = (this._rngState += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  _rollDwell() {
    const { dwellMinMs, dwellMaxMs } = this.ambient;
    const lo = Math.min(dwellMinMs, dwellMaxMs), hi = Math.max(dwellMinMs, dwellMaxMs);
    return lo + this._nextRandom() * (hi - lo);
  }

  // Resolves assetId/greetingAssetId against the manifest ONCE assetById has data
  // (deco-anim's loadDecoAnimations() must have been awaited before Level draws
  // any frame — same requirement decorations already have). Safe to call every
  // frame; it is a no-op once resolved, and silently stays null if the manifest
  // or the id is missing — the NPC then draws nothing, never throws.
  _resolveSprites() {
    if (this._sprites) return this._sprites;
    const ambient  = assetById(this.assetId);
    const greeting = this.greetingAssetId ? assetById(this.greetingAssetId) : null;
    const walk     = this.walkAssetId ? assetById(this.walkAssetId) : null;
    const smoke    = this.ambient && this.ambient.smokeAssetId ? assetById(this.ambient.smokeAssetId) : null;
    const powered  = this.poweredAssetId ? assetById(this.poweredAssetId) : null;
    if (!ambient) return null; // manifest not loaded yet, or unknown id — retry next frame
    const anim = {
      ambient:  { asset: ambient,  frames: null, img: null },
      greeting: greeting ? { asset: greeting, frames: null, img: null } : null,
      walk: walk ? { asset: walk, frames: null, img: null } : null,
      smoke:    smoke    ? { asset: smoke,    frames: null, img: null } : null,
      powered:  powered  ? { asset: powered,  frames: null, img: null } : null,
    };
    for (const key of ['ambient', 'greeting', 'walk', 'smoke', 'powered']) {
      const slot = anim[key];
      if (!slot) continue;
      const a = slot.asset;
      const fa = animFromAsset(a);
      if (fa) {
        const sourceFrames = framesFor(fa);
        const order = Array.isArray(a.frameOrder) && a.frameOrder.length
          && a.frameOrder.every(i => Number.isInteger(i) && i >= 0 && i < sourceFrames.length)
          ? a.frameOrder : null;
        slot.frames = order ? order.map(i => sourceFrames[i]) : sourceFrames;
        slot.frameFootY = order ? order.map(i => a.footYByFrame?.[i]) : a.footYByFrame;
        slot.fps    = fa.fps;
        slot.loop   = fa.loop;
      } else {
        const img = new Image();
        img.src = a.path;
        slot.img = img;
      }
    }
    this._sprites = anim;
    return anim;
  }

  // Idle<->smoke state machine. Runs every frame regardless of dialogue/
  // player state — ambient life should never depend on proximity. A no-op
  // when this.ambient is null (the common case for most NPCs).
  _updateAmbient(dt) {
    if (!this.ambient) return;
    const dtMs = dt * 1000;
    if (this._ambState === 'idle') {
      this._ambTimerMs -= dtMs;
      if (this._ambTimerMs <= 0) {
        this._ambState = 'smoke';
        this._smokeElapsed = 0;
      }
      return;
    }
    // 'smoke': play the one-shot once, then return to a fresh randomized dwell.
    this._smokeElapsed += dtMs;
    if (this._smokeElapsed >= this._smokeDurationMs()) {
      this._ambState = 'idle';
      this._ambTimerMs = this._rollDwell();
    }
  }

  // Total one-shot duration in ms, from the smoke asset's own frame_count/fps
  // once resolved; a safe fallback keeps the state machine moving even on the
  // first frame or two before the manifest/sprite resolution has landed.
  _smokeDurationMs() {
    const sprites = this._resolveSprites();
    const slot = sprites && sprites.smoke;
    if (slot && slot.asset) {
      const count = Number(slot.asset.frame_count) || 1;
      const fps   = Number(slot.asset.fps) > 0 ? Number(slot.asset.fps) : 8;
      return (count / fps) * 1000;
    }
    return 2000;
  }

  update(dt, player, level) {
    this._clock += dt;
    this._justRelieved = false;
    const powered = !!(this.linkedObjectId && level?.isPowered(this.linkedObjectId));
    if (powered && !this._powered) {
      this._reliefClock = 0;
      this._justRelieved = true;
      this._cooldownT = 0;
      this._triggeredOnce = false;
      if (this.dialogue.enabled && this.dialogue.poweredLines.length) this._fire(this.dialogue.poweredLines);
    } else if (!powered && this._powered) {
      this._bubbleT = 0;
      this._triggeredOnce = false;
    }
    this._powered = powered;
    if (powered) this._reliefClock += dt;
    if (this._cooldownT > 0) this._cooldownT = Math.max(0, this._cooldownT - dt * 1000);
    if (this._bubbleT   > 0) this._bubbleT   = Math.max(0, this._bubbleT   - dt * 1000);
    if (this._greetT    > 0) this._greetT    = Math.max(0, this._greetT    - dt * 1000);
    this._updateAmbient(dt);

    this._walking = false;
    if (this.patrol.rangePx > 0 && this.patrol.speedPxPerSec > 0 && this._bubbleT <= 0) {
      if (this._turnPauseT > 0) this._turnPauseT = Math.max(0, this._turnPauseT - dt);
      else {
        const edge = this._homeX + this._direction * this.patrol.rangePx;
        const next = this.x + this._direction * this.patrol.speedPxPerSec * dt;
        if ((next - edge) * this._direction >= 0) {
          this.x = edge;
          this._direction *= -1;
          this.facing = this._direction < 0 ? 'left' : 'right';
          this._turnPauseT = this.patrol.turnPauseSec;
          this._walkDistance = 0;
        } else {
          this._walkDistance += Math.abs(next - this.x);
          this.x = next;
          this._walking = true;
          this._walkClock += dt;
        }
      }
    }

    if (!this.dialogue.enabled || !player) { this._wasInside = false; return; }

    const px = player.cx !== undefined ? player.cx : (player.x + (player.w || 0) / 2);
    const py = player.y !== undefined ? player.y + (player.h || 0) : player.y;
    const dx = px - this.x, dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inside = dist <= this.dialogue.radiusPx;

    const enteredNow = inside && !this._wasInside;
    this._wasInside = inside;
    if (!enteredNow) return;
    if (this.dialogue.oncePerLevel && this._triggeredOnce) return;
    if (this._cooldownT > 0) return;
    if (!(this._powered ? this.dialogue.poweredLines : this.dialogue.lines).length) return;

    this._fire();
  }

  _fire(lines = this._powered ? this.dialogue.poweredLines : this.dialogue.lines) {
    const idx = this.dialogue.selectionMode === 'random'
      ? Math.floor(Math.random() * lines.length)
      : (this._lineIdx % lines.length);
    this._bubbleText = lines[idx].text;
    if (this.dialogue.selectionMode !== 'random') this._lineIdx = (this._lineIdx + 1) % lines.length;
    this._bubbleT   = this.dialogue.durationMs;
    this._cooldownT = this.dialogue.cooldownMs + this.dialogue.durationMs;
    this._triggeredOnce = true;
    if (this.greetingAssetId) this._greetT = this.dialogue.durationMs;
    this._greetStartedAt = this._clock;
  }

  // Builder "Preview Bubble" action — fires the bubble on demand, bypassing
  // proximity/cooldown/once-per-level entirely. Does not touch trigger state,
  // so a preview can never consume the player's real first encounter.
  previewBubble(text) {
    this._bubbleText = (typeof text === 'string' && text.length) ? text
      : (this.dialogue.lines[0] && this.dialogue.lines[0].text) || '';
    this._bubbleT = this.dialogue.durationMs;
    if (this.greetingAssetId) this._greetT = this.dialogue.durationMs;
    this._greetStartedAt = this._clock;
  }

  _currentFrame() {
    const sprites = this._resolveSprites();
    if (!sprites) return null;
    const usePowered = this._powered && sprites.powered;
    const useGreeting = !usePowered && this._greetT > 0 && sprites.greeting;
    const useWalk = !useGreeting && this._walking && sprites.walk;
    const useSmoke = !useGreeting && !useWalk && this.ambient && this._ambState === 'smoke' && sprites.smoke;
    const slot = usePowered ? sprites.powered : useGreeting ? sprites.greeting : useWalk ? sprites.walk : (useSmoke ? sprites.smoke : sprites.ambient);
    this._frameSlot = slot;
    // The one-shot smoke clip is timed from its own elapsed counter (resets to
    // 0 the instant the state machine enters 'smoke'), never from this._clock,
    // so it always starts at frame 0 regardless of how long the NPC has existed.
    const stepPx = Number(slot.asset?.walkFrameStepPx);
    const walkTime = stepPx > 0 ? this._walkDistance / (stepPx * slot.fps) : this._walkClock;
    const t = usePowered ? this._reliefClock : useGreeting ? this._clock - this._greetStartedAt : useWalk ? walkTime : useSmoke ? this._smokeElapsed / 1000 : this._clock;
    if (slot.frames) {
      const fake = { frames: slot.frames, fps: slot.fps, loop: (usePowered || useGreeting || useSmoke) ? false : slot.loop, phase: 0 };
      return frameAt(fake, t);
    }
    return slot.img;
  }

  draw(ctx, viewport) {
    const img = this._currentFrame();
    if (!img || !img.complete || !img.naturalWidth) { this._lastGeom = null; return; }
    const asset = this._sprites?.ambient?.asset;
    const slot = this._frameSlot;
    const frameIndex = slot?.frames ? slot.frames.indexOf(img) : 0;
    const frameFootY = slot?.frameFootY?.[frameIndex];
    const g = npcGeometry(asset || { frame_width: img.naturalWidth, frame_height: img.naturalHeight },
      this.x, this.y, this.scale, this.facing, frameFootY);
    // Stashed for drawNpcBubbles(): the second pass that draws every NPC's
    // speech bubble AFTER every NPC's sprite, so overlap-avoidance can see
    // every active bubble's real on-screen anchor before any of them render.
    this._lastGeom = g;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this.facing === 'left') {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, g.drawX - this.x, g.drawY, g.drawW, g.drawH);
    } else {
      ctx.drawImage(img, g.drawX, g.drawY, g.drawW, g.drawH);
    }
    ctx.restore();
  }
}

// ── Speech bubble rendering ────────────────────────────────────────────────
// Sci-fi panel treatment (double border + corner brackets + header strip +
// cyan glow), off-white text, small tail pointer, floats above the NPC's
// head, clamps to the canvas (viewport) so it never gets cut off at screen
// edges. Drawn in the SAME transformed context Level.draw() already uses for
// every other world-space entity, so it tracks the NPC through camera scroll
// with no extra wiring.
//
// Two NPCs close enough together that their bubbles would land on the same
// patch of screen (the smoke-break pair are 46px apart) no longer draw on
// top of one another: drawNpcBubbles() below runs AFTER every NPC's sprite
// is drawn, in a second pass, and stacks any bubble that would overlap an
// already-placed one straight above it. A level with only one bubble ever
// active at a time (nearly every level) gets lift=0 and is pixel-identical
// to before.
const BUBBLE_FONT       = '12px monospace';
const BUBBLE_PAD        = 8;
const BUBBLE_LINE_H     = 15;
const BUBBLE_MAX_WIDTH  = 220;
const BUBBLE_MAX_LINES  = 6;
const BUBBLE_FILL       = '#0a0a16';
const BUBBLE_BORDER_DIM = '#2a4a56';
const BUBBLE_ACCENT     = '#8fe3ff';
const BUBBLE_TEXT       = '#f4f4f0';

function wrapText(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, BUBBLE_MAX_LINES);
}

// Pure sizing — no position, no drawing — so drawNpcBubbles() can measure
// every active bubble up front and resolve overlaps before anything renders.
function measureBubble(ctx, text) {
  ctx.font = BUBBLE_FONT;
  const lines = wrapText(ctx, text, BUBBLE_MAX_WIDTH - BUBBLE_PAD * 2);
  const textW = Math.max(1, ...lines.map(l => ctx.measureText(l).width));
  const w = Math.min(BUBBLE_MAX_WIDTH, textW + BUBBLE_PAD * 2);
  const h = lines.length * BUBBLE_LINE_H + BUBBLE_PAD * 2;
  return { lines, w, h };
}

// `liftExtra` raises the bubble further above its normal spot — used only by
// drawNpcBubbles() to stack a colliding bubble clear of an already-placed one.
function positionBubble(anchorX, topY, w, h, viewport, liftExtra = 0) {
  let bx = anchorX - w / 2;
  let by = topY - h - 14 - liftExtra; // 14px gap + tail above the sprite, plus any stacking lift
  // Clamp to the viewport in SCREEN space. Level.draw() is called with a
  // camera-translated ctx, so viewport (if given) is expressed in the same
  // world-space coords already translated onto screen; callers that do not
  // pass one (headless/test contexts) skip clamping rather than guess.
  if (viewport) {
    bx = Math.max(viewport.x + 4, Math.min(bx, viewport.x + viewport.w - w - 4));
    by = Math.max(viewport.y + 4, by);
  }
  return { bx, by };
}

function rectsOverlap(a, b) {
  return a.bx < b.bx + b.w && a.bx + a.w > b.bx && a.by < b.by + b.h && a.by + a.h > b.by;
}

export function drawSpeechBubble(ctx, anchorX, topY, text, viewport, liftExtra = 0) {
  ctx.save();
  const { lines, w, h } = measureBubble(ctx, text);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const { bx, by } = positionBubble(anchorX, topY, w, h, viewport, liftExtra);
  const bxr = Math.round(bx), byr = Math.round(by), wr = Math.round(w), hr = Math.round(h);

  // Base panel, lifted off the background with a soft cyan glow instead of
  // sitting flush as a flat fill.
  ctx.shadowColor = BUBBLE_ACCENT;
  ctx.shadowBlur = 7;
  ctx.fillStyle = BUBBLE_FILL;
  ctx.beginPath();
  ctx.rect(bxr, byr, wr, hr);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Double border reads as a built panel rather than a plain outlined box:
  // a dim outer frame, a bright inset frame.
  ctx.lineWidth = 1;
  ctx.strokeStyle = BUBBLE_BORDER_DIM;
  ctx.beginPath();
  ctx.rect(bxr + 0.5, byr + 0.5, wr - 1, hr - 1);
  ctx.stroke();
  ctx.strokeStyle = BUBBLE_ACCENT;
  ctx.beginPath();
  ctx.rect(bxr + 3, byr + 3, wr - 6, hr - 6);
  ctx.stroke();

  // Header strip + corner brackets — small HUD chrome details, same family
  // as the energy HUD's corner tabs, so the box reads as a designed UI
  // element instead of a flat rectangle.
  ctx.fillStyle = BUBBLE_ACCENT;
  ctx.beginPath();
  ctx.rect(bxr + 3, byr + 3, wr - 6, 2);
  ctx.fill();
  const tab = 6;
  for (const [cx, cy] of [[bxr, byr], [bxr + wr - tab, byr], [bxr, byr + hr - tab], [bxr + wr - tab, byr + hr - tab]]) {
    ctx.beginPath(); ctx.rect(cx, cy, tab, 2); ctx.fill();
    ctx.beginPath(); ctx.rect(cx, cy, 2, tab); ctx.fill();
  }

  // Tail pointer, centred under the bubble, pointing at the anchor.
  const tailX = Math.max(bxr + 10, Math.min(anchorX, bxr + wr - 10));
  ctx.beginPath();
  ctx.moveTo(tailX - 6, byr + hr);
  ctx.lineTo(tailX + 6, byr + hr);
  ctx.lineTo(tailX, byr + hr + 10);
  ctx.closePath();
  ctx.fillStyle = BUBBLE_FILL;
  ctx.fill();
  ctx.strokeStyle = BUBBLE_ACCENT;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = BUBBLE_TEXT;
  lines.forEach((line, i) => {
    ctx.fillText(line, bxr + BUBBLE_PAD, byr + BUBBLE_PAD + i * BUBBLE_LINE_H);
  });
  ctx.restore();
}

// Second render pass for all of a level's NPCs: called by Level.draw() AFTER
// every npc.draw() this frame, so every active bubble's real anchor
// (npc._lastGeom, set by draw()) is known before any bubble renders. Walks
// NPCs in array order; each bubble that would overlap an already-placed one
// stacks straight above it (bubble height + 10px gap) instead of drawing on
// top. Bounded to 8 stacking attempts so a pathological cluster of NPCs can
// never loop — it just stacks as high as it gets and draws anyway.
export function drawNpcBubbles(ctx, npcs, viewport) {
  const placed = [];
  for (const npc of npcs) {
    if (!(npc._bubbleT > 0 && npc._bubbleText) || !npc._lastGeom) continue;
    const anchorX = npc.x, topY = npc._lastGeom.visible.y;
    ctx.save();
    const measured = measureBubble(ctx, npc._bubbleText);
    ctx.restore();
    let lift = 0;
    for (let guard = 0; guard < 8; guard++) {
      const pos = positionBubble(anchorX, topY, measured.w, measured.h, viewport, lift);
      const rect = { bx: pos.bx, by: pos.by, w: measured.w, h: measured.h };
      if (!placed.some(r => rectsOverlap(rect, r))) { placed.push(rect); break; }
      lift += measured.h + 16; // extra room so the tail + glow of the stacked bubble clear the one below
    }
    drawSpeechBubble(ctx, anchorX, topY, npc._bubbleText, viewport, lift);
  }
}

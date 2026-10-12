// npc.js — ORDER 22: dialogue-capable NPCs. Ambient animation + proximity speech
// bubbles, authored entirely through the Builder's NPC Inspector and
// `level.npcs` (see docs/LEVEL_SCHEMA.md "NPC" section). An absent/empty
// `npcs` array is zero behavioural change for every level authored before
// this order — see Level constructor.
//
// Distinct from Order 20's smoke-break workers: those are plain `decorations[]`
// entries (cosmetic only, not individually selectable, no dialogue). An NPC
// here is a first-class, Builder-selectable object with its own array,
// because dialogue needs an identity to attach to.
import { assetById, animFromAsset, framesFor, frameAt } from './deco-anim.js';

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

export class Npc {
  constructor(def) {
    this.id              = def.id || ('npc_' + Math.random().toString(36).slice(2));
    this.assetId         = def.assetId || null;
    this.greetingAssetId = def.greetingAssetId || null;
    this.x               = Number(def.x) || 0;   // feet anchor, world px (bottom-centre)
    this.y               = Number(def.y) || 0;   // ground line the feet rest on
    this.facing          = def.facing === 'left' ? 'left' : 'right';

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
      selectionMode: d.selectionMode === 'random' ? d.selectionMode : DEFAULT_DIALOGUE.selectionMode,
    };

    // Runtime-only state. Never persisted — a save/reload or a fresh level load
    // always starts an NPC in the "never triggered" state.
    this._wasInside     = false;
    this._cooldownT     = 0;     // seconds remaining before this NPC may trigger again
    this._bubbleT       = 0;     // seconds remaining the bubble stays visible
    this._bubbleText    = '';
    this._lineIdx       = 0;
    this._triggeredOnce = false; // for oncePerLevel
    this._greetT        = 0;     // seconds remaining the greeting animation plays
    this._clock         = 0;     // per-instance elapsed seconds, drives ambient frame choice
    this._sprites       = null;  // resolved lazily — see _resolveSprites()
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
    if (!ambient) return null; // manifest not loaded yet, or unknown id — retry next frame
    const anim = {
      ambient:  { asset: ambient,  frames: null, img: null },
      greeting: greeting ? { asset: greeting, frames: null, img: null } : null,
    };
    for (const key of ['ambient', 'greeting']) {
      const slot = anim[key];
      if (!slot) continue;
      const a = slot.asset;
      const fa = animFromAsset(a);
      if (fa) {
        slot.frames = framesFor(fa);
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

  update(dt, player) {
    this._clock += dt;
    if (this._cooldownT > 0) this._cooldownT = Math.max(0, this._cooldownT - dt * 1000);
    if (this._bubbleT   > 0) this._bubbleT   = Math.max(0, this._bubbleT   - dt * 1000);
    if (this._greetT    > 0) this._greetT    = Math.max(0, this._greetT    - dt * 1000);

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
    if (!this.dialogue.lines.length) return;

    this._fire();
  }

  _fire() {
    const lines = this.dialogue.lines;
    const idx = this.dialogue.selectionMode === 'random'
      ? Math.floor(Math.random() * lines.length)
      : (this._lineIdx % lines.length);
    this._bubbleText = lines[idx].text;
    if (this.dialogue.selectionMode !== 'random') this._lineIdx = (this._lineIdx + 1) % lines.length;
    this._bubbleT   = this.dialogue.durationMs;
    this._cooldownT = this.dialogue.cooldownMs + this.dialogue.durationMs;
    this._triggeredOnce = true;
    if (this.greetingAssetId) this._greetT = this.dialogue.durationMs;
  }

  // Builder "Preview Bubble" action — fires the bubble on demand, bypassing
  // proximity/cooldown/once-per-level entirely. Does not touch trigger state,
  // so a preview can never consume the player's real first encounter.
  previewBubble(text) {
    this._bubbleText = (typeof text === 'string' && text.length) ? text
      : (this.dialogue.lines[0] && this.dialogue.lines[0].text) || '';
    this._bubbleT = this.dialogue.durationMs;
    if (this.greetingAssetId) this._greetT = this.dialogue.durationMs;
  }

  _currentFrame() {
    const sprites = this._resolveSprites();
    if (!sprites) return null;
    const useGreeting = this._greetT > 0 && sprites.greeting;
    const slot = useGreeting ? sprites.greeting : sprites.ambient;
    if (slot.frames) {
      const fake = { frames: slot.frames, fps: slot.fps, loop: useGreeting ? false : slot.loop, phase: 0 };
      return frameAt(fake, this._clock);
    }
    return slot.img;
  }

  draw(ctx) {
    const img = this._currentFrame();
    if (!img || !img.complete || !img.naturalWidth) return;
    const w = img.naturalWidth, h = img.naturalHeight;
    const drawX = this.x - w / 2;
    const drawY = this.y - h;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (this.facing === 'left') {
      ctx.translate(this.x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, drawY, w, h);
    } else {
      ctx.drawImage(img, drawX, drawY, w, h);
    }
    ctx.restore();

    if (this._bubbleT > 0 && this._bubbleText) {
      drawSpeechBubble(ctx, this.x, drawY, this._bubbleText);
    }
  }
}

// ── Speech bubble rendering ────────────────────────────────────────────────
// Pixel-art border, high-contrast dark fill, off-white text, small tail
// pointer, floats above the NPC's head, clamps to the canvas (viewport) so it
// never gets cut off at screen edges. Drawn in the SAME transformed context
// Level.draw() already uses for every other world-space entity, so it tracks
// the NPC through camera scroll with no extra wiring.
const BUBBLE_FONT       = '12px monospace';
const BUBBLE_PAD        = 8;
const BUBBLE_LINE_H     = 15;
const BUBBLE_MAX_WIDTH  = 220;
const BUBBLE_MAX_LINES  = 6;

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

export function drawSpeechBubble(ctx, anchorX, topY, text, viewport) {
  ctx.save();
  ctx.font = BUBBLE_FONT;
  ctx.textBaseline = 'top';
  const lines = wrapText(ctx, text, BUBBLE_MAX_WIDTH - BUBBLE_PAD * 2);
  const textW = Math.max(1, ...lines.map(l => ctx.measureText(l).width));
  const w = Math.min(BUBBLE_MAX_WIDTH, textW + BUBBLE_PAD * 2);
  const h = lines.length * BUBBLE_LINE_H + BUBBLE_PAD * 2;

  let bx = anchorX - w / 2;
  let by = topY - h - 14; // 14px gap + tail above the sprite
  // Clamp to the viewport in SCREEN space. Level.draw() is called with a
  // camera-translated ctx, so viewport (if given) is expressed in the same
  // world-space coords already translated onto screen; callers that do not
  // pass one (headless/test contexts) skip clamping rather than guess.
  if (viewport) {
    bx = Math.max(viewport.x + 4, Math.min(bx, viewport.x + viewport.w - w - 4));
    by = Math.max(viewport.y + 4, by);
  }

  ctx.fillStyle = '#0a0a14';
  ctx.strokeStyle = '#8fe3ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(Math.round(bx), Math.round(by), Math.round(w), Math.round(h));
  ctx.fill();
  ctx.stroke();

  // Tail pointer, centred under the bubble, pointing at the anchor.
  const tailX = Math.max(bx + 10, Math.min(anchorX, bx + w - 10));
  ctx.beginPath();
  ctx.moveTo(tailX - 6, by + h);
  ctx.lineTo(tailX + 6, by + h);
  ctx.lineTo(tailX, by + h + 10);
  ctx.closePath();
  ctx.fillStyle = '#0a0a14';
  ctx.fill();
  ctx.strokeStyle = '#8fe3ff';
  ctx.stroke();

  ctx.fillStyle = '#f4f4f0';
  lines.forEach((line, i) => {
    ctx.fillText(line, Math.round(bx + BUBBLE_PAD), Math.round(by + BUBBLE_PAD + i * BUBBLE_LINE_H));
  });
  ctx.restore();
}

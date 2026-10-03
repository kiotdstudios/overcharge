// deco-anim.js — makes multi-frame decorations actually play.
//
// THE DEFECT THIS CLOSES: `level.js` built decorations as a single static Image from
// `d.src` and never looked at anything else. Meanwhile `assets/ASSET_MANIFEST.json`
// already records `frame_count`, `fps`, `loop` and a `{n}` path template for every
// animated asset — six 8-frame props and both city drones among them. The information
// was there and the renderer threw it away, so every animated prop showed frame 0
// forever.
//
// WHY THE MANIFEST AND NOT A NEW REGISTRY: Chief's point, and he was right — adding a
// second list of "which things animate" would be a parallel source of truth that drifts
// from the manifest Aki already maintains. The manifest IS the registry. Aki ships a new
// animated prop with frame_count/fps set, and it animates with no code change.
//
// STATELESS BY DESIGN: frames are chosen from the elapsed-time value `t` that
// `Level.draw(ctx, t)` already receives, not from mutable per-instance animators. That
// means no update() wiring, nothing to keep in sync, nothing to restore in a checkpoint
// snapshot, and identical behaviour in the game and in Builder TEST mode.

let _manifest = null;          // resolved entries, keyed by directory
let _loading  = null;
const _frameCache = new Map(); // dir -> Image[]   loaded ONCE and shared by every instance

// A manifest path looks like 'assets/sprites/generator 1/frame_{n}.png'. Reduce it to
// its directory plus the filename pattern so a placed decoration can be matched to it.
function parseTemplate(p) {
  const slash = p.lastIndexOf('/');
  return { dir: p.slice(0, slash), file: p.slice(slash + 1) };
}

// Frame filenames are NOT consistent across packs, and the manifest is not consistent
// about how it points at them either:
//
//   assets/sprites/generator 1/frame_{n}.png        <- a {n} template
//   assets/objects/night-city-props/neon-sign/00.png <- the literal FIRST FRAME
//
// Only the generator uses a template; all six night-city props record frame 0 directly.
// An earlier version of this file required `{n}` and therefore silently skipped every
// prop — the exact assets this module exists to animate. So: accept either form, and for
// the literal form derive the pattern from the numeric run in the filename, preserving
// its width. '00.png' -> 00..07,  'frame_000.png' -> frame_000..frame_007.
function framePattern(file) {
  const tpl = file.match(/\{n(?::(\d+))?\}/);
  if (tpl) {
    const pad = tpl[1] ? Number(tpl[1]) : (/frame_/.test(file) ? 3 : 2);
    return { make: i => file.replace(/\{n(?::\d+)?\}/, String(i).padStart(pad, '0')) };
  }
  // Last numeric run before the extension is the frame counter.
  const lit = file.match(/^(.*?)(\d+)(\.[a-z]+)$/i);
  if (lit) {
    const [, prefix, digits, ext] = lit;
    return { make: i => `${prefix}${String(i).padStart(digits.length, '0')}${ext}` };
  }
  return null;   // no counter at all — cannot be a sequence
}

export async function loadDecoAnimations(manifestUrl = 'assets/ASSET_MANIFEST.json') {
  if (_manifest) return _manifest;
  if (_loading)  return _loading;
  _loading = (async () => {
    const byDir = new Map();
    try {
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.json();
      const list = Array.isArray(raw) ? raw : (raw.assets || Object.values(raw).find(Array.isArray) || []);
      for (const a of list) {
        const count = Number(a.frame_count) || 1;
        if (count <= 1 || !a.path) continue;           // static assets need nothing
        const { dir, file } = parseTemplate(a.path);
        const pattern = framePattern(file);
        if (!pattern) continue;                        // filename carries no frame counter
        byDir.set(dir, {
          dir, file, count, pattern,
          fps:  Number(a.fps) > 0 ? Number(a.fps) : 8, // fps null in some entries
          loop: a.loop !== false,
          id:   a.id,
        });
      }
    } catch (err) {
      // A missing or broken manifest must NEVER stop a level loading. Decorations then
      // behave exactly as they did before this module existed.
      console.warn('[deco-anim] manifest unavailable — decorations stay static:', err.message);
    }
    _manifest = byDir;
    return byDir;
  })();
  return _loading;
}

// Match a placed decoration's src to a manifest entry by directory.
export function animationFor(src) {
  if (!_manifest || !src) return null;
  const slash = src.lastIndexOf('/');
  if (slash < 0) return null;
  return _manifest.get(src.slice(0, slash)) || null;
}

export function framesFor(anim) {
  if (_frameCache.has(anim.dir)) return _frameCache.get(anim.dir);
  const imgs = Array.from({ length: anim.count }, (_, i) => {
    const img = new Image();
    img.src = `${anim.dir}/${anim.pattern.make(i)}`;
    return img;
  });
  _frameCache.set(anim.dir, imgs);
  return imgs;
}

// Per-instance phase offset so twenty signs do not pulse in lockstep. Derived from
// position, so it is deterministic: the same level looks the same on every load.
export function phaseFor(x, y, count) {
  const h = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663)) >>> 0;
  return h % Math.max(1, count);
}

// Which frame should be on screen at elapsed time `t`.
export function frameAt(dec, t) {
  const { frames, fps, loop, phase } = dec;
  if (!frames || frames.length < 2) return dec.img;
  const raw = Math.floor(t * fps) + phase;
  const i = loop ? (raw % frames.length)
                 : Math.min(frames.length - 1, Math.floor(t * fps));
  const img = frames[i];
  // Fall back to any decoded frame while the rest are still downloading, so a prop
  // never flickers to blank on first appearance.
  if (img && img.complete && img.naturalWidth > 0) return img;
  return frames.find(f => f.complete && f.naturalWidth > 0) || dec.img;
}

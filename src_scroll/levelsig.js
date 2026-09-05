// levelsig.js — deterministic level identity signature.
//
// SHARED BY BOTH the game runtime (src_scroll/main.js) and the editor
// (editor/main.js). One implementation only, so a Builder checksum and a
// runtime checksum are directly comparable. If the two ever disagree, the
// level data genuinely differs — it can never be an algorithm difference.
//
// Canonicalization: recursively sort object keys and drop editor-only /
// volatile fields, then FNV-1a over the canonical JSON text. Key order,
// whitespace and property insertion order therefore cannot affect the hash.

// Fields that are NOT part of level identity (editor bookkeeping / provenance).
const IGNORED_KEYS = new Set(['generated', '_recovery', '_savedAt', '_sourcePath']);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (IGNORED_KEYS.has(k)) continue;
      const v = value[k];
      if (v === undefined) continue;
      out[k] = canonical(v);
    }
    return out;
  }
  // Normalize -0 and integral floats so 96 and 96.0 hash identically.
  if (typeof value === 'number') {
    if (value === 0) return 0;
    return Number.isInteger(value) ? value : Number(value.toFixed(6));
  }
  return value;
}

export function canonicalJSON(level) {
  return JSON.stringify(canonical(level));
}

// FNV-1a 32-bit, rendered as 8 hex chars. Deterministic across engines.
export function levelChecksum(level) {
  const s = canonicalJSON(level);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').toUpperCase();
}

// One-line identity summary used by both boot paths.
export function levelSignature(level) {
  return {
    name:     level?.name ?? '(unnamed)',
    number:   level?.number ?? '?',
    cols:     level?.cols ?? '?',
    tiles:    Array.isArray(level?.tiles) ? level.tiles.length : '?',
    checksum: levelChecksum(level),
  };
}

// Emit the standard parity log block. `sourceLabel` must name the EXACT
// origin (a path, or the localStorage key) so Chief can compare at a glance.
export function logLevelSource(tag, sourceLabel, level) {
  const s = levelSignature(level);
  console.info(`${tag} LEVEL SOURCE: ${sourceLabel}`);
  console.info(
    `${tag}   name=${s.name}  number=${s.number}  cols=${s.cols}  ` +
    `tiles.length=${s.tiles}  checksum=${s.checksum}`
  );
  return s;
}

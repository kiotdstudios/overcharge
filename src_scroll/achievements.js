// Small, non-blocking achievement ledger. Gameplay remains authoritative even
// when persistence is unavailable or the display is disabled for tests.
export const ACHIEVEMENTS = Object.freeze([
  // egg: true = an Easter egg. It is shown as the objective-style card for `seconds` (6 to 9), not as the small toast.
  { id: 'good_neighbor', title: 'GOOD NEIGHBOR', text: 'Restore power for the tenant.', egg: true, seconds: 8 },
]);

export const ACHIEVEMENT_STORAGE_KEY = 'overcharge.achievements.v1';

export function createAchievements({ storage, search = globalThis.location?.search || '', catalogue = ACHIEVEMENTS } = {}) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { storage = null; }
  }
  const mode = new URLSearchParams(search).get('achievements');
  const disabled = mode === 'off';
  // ?achievements=reset forgets what was earned, so an Easter egg can be tested again.
  if (mode === 'reset') { try { storage?.removeItem(ACHIEVEMENT_STORAGE_KEY); } catch { /* blocked storage */ } }
  const byId = new Map(catalogue.map(a => [a.id, a]));
  let saved = [];
  if (!disabled) {
    try {
      const data = JSON.parse(storage?.getItem(ACHIEVEMENT_STORAGE_KEY) || '[]');
      if (Array.isArray(data)) saved = data.filter(id => byId.has(id));
    } catch { /* Private mode or blocked storage: memory-only. */ }
  }
  const earned = new Set(saved);
  const queue = [];
  let current = null;
  let remaining = 0;

  function unlock(id) {
    if (disabled || !byId.has(id) || earned.has(id)) return false;
    earned.add(id);
    queue.push(byId.get(id));
    try { storage?.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify([...earned])); }
    catch { /* A blocked write never blocks the unlock. */ }
    return true;
  }

  function update(dt) {
    if (disabled) return;
    remaining -= dt;
    if ((!current || remaining <= 0) && queue.length) {
      current = queue.shift();
      remaining = current.seconds || 3;
      return current;
    }
    if (remaining <= 0) current = null;
    return null;
  }

  function draw(ctx, width) {
    if (!current || disabled || current.egg) return;   // Easter eggs draw as the top-right card (ui.js)
    const w = Math.min(300, width - 20), x = Math.round((width - w) / 2), y = 25;
    ctx.save();
    ctx.fillStyle = '#0b1121';
    ctx.fillRect(x, y, w, 48);
    ctx.strokeStyle = '#6ee3ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, 46);
    ctx.fillStyle = '#ffc651';
    ctx.fillRect(x + 10, y + 12, 15, 20);
    ctx.fillStyle = '#111827';
    ctx.fillRect(x + 15, y + 16, 5, 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f5efff';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(current.title, x + 35, y + 19);
    ctx.fillStyle = '#a9c9db';
    ctx.font = '11px monospace';
    ctx.fillText(current.text, x + 35, y + 36);
    ctx.restore();
  }

  return {
    unlock, update, draw,
    has: id => earned.has(id),
    get list() { return catalogue.map(a => ({ ...a, earned: earned.has(a.id) })); },
    get current() { return current; },
    get queued() { return queue.length; },
    get disabled() { return disabled; },
  };
}

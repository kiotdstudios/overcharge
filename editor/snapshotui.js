// snapshotui.js — wiring for LEVEL VERSION HISTORY.
//
// Owns the 📸 SNAPSHOT button, the 🕔 HISTORY panel, and the auto-snapshot
// triggers. Kept out of main.js so the snapshot feature is one reviewable unit.
//
// SAFETY INVARIANTS enforced here:
//   • RESTORE and DELETE and CLEAR always go through a confirm dialog.
//   • RESTORE always writes an automatic backup of the CURRENT state first.
//   • After a restore the editor is marked DIRTY, so nothing can be mistaken
//     for the committed level and SAVE stays an explicit human act.
//   • Nothing here ever writes to the repo. Snapshots live only in IndexedDB
//     (or in files the user explicitly downloads).

import { state, notify } from './state.js';
import * as Snap from './snapshots.js';
import { levelChecksum } from '../src_scroll/levelsig.js';
import { BUILD } from './buildinfo.js';

// Auto-snapshot reasons. Deliberately coarse: destructive/whole-level events
// only, never per-tile edits.
export const REASON = {
  BEFORE_LOAD:    'Auto: before loading another level',
  BEFORE_IMPORT:  'Auto: before importing a level',
  BEFORE_NEW:     'Auto: before NEW level',
  BEFORE_REPLACE: 'Auto: before replacing level data',
  BEFORE_RESTORE: 'Auto: before restoring a snapshot',
  BEFORE_GENERATE:'Auto: before generated level replaced this one',
  BEFORE_RECOVERY:'Auto: before applying crash recovery',
  ON_SAVE:        'Auto: on save',
};

let $ = id => document.getElementById(id);
let _previewing = null;   // snapshot id currently previewed (read-only marker)

// Remember the checksum of the last thing we snapshotted, so SAVE only
// snapshots when the level actually changed since then (Chief: do not snapshot
// on every tiny tile placement).
let _lastSnapshotSum = null;

function buildRecord() {
  // Bonus: pair every snapshot with the code build it was taken against, so
  // "go back to how it looked two days ago" can identify BOTH the level
  // version and the commit it was tested on.
  try {
    return { branch: BUILD.branch, shaShort: BUILD.shaShort, shaFull: BUILD.shaFull,
             worktree: BUILD.worktree, dirtyBuild: !!BUILD.dirty };
  } catch { return null; }
}

function flash(msg, color) {
  const el = $('save-flash');
  if (!el) return;
  el.textContent = msg;
  el.style.color = color || '';
  el.className = 'show';
  setTimeout(() => { el.textContent = ''; el.style.color = ''; el.className = ''; }, 5000);
}

function msg(text, color) {
  const el = $('history-msg');
  if (el) { el.textContent = text; el.style.color = color || '#8aaabb'; }
}

// ── generic confirm ───────────────────────────────────────────────────────
// Resolves true/false. Falls back to window.confirm when <dialog> is missing
// so the safety prompt can never be silently skipped.
function confirmAction(title, body) {
  const dlg = $('confirm-dialog'), t = $('confirm-title'), b = $('confirm-body');
  const ok = $('confirm-ok'), cx = $('confirm-cancel');
  if (!dlg || !ok || !cx || typeof dlg.showModal !== 'function') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm
      ? window.confirm(`${title}\n\n${body}`) : false);
  }
  if (t) t.textContent = title;
  if (b) b.textContent = body;
  return new Promise(resolve => {
    const done = v => {
      ok.removeEventListener('click', yes);
      cx.removeEventListener('click', no);
      try { dlg.close(); } catch { /* already closed */ }
      resolve(v);
    };
    const yes = () => done(true), no = () => done(false);
    ok.addEventListener('click', yes);
    cx.addEventListener('click', no);
    dlg.showModal();
  });
}

// ── AUTOMATIC snapshots ───────────────────────────────────────────────────
/**
 * Snapshot the CURRENT level before a destructive operation.
 * Safe to call when no level is loaded (no-ops). Never throws — a storage
 * failure must not block the operation the user asked for, so it warns and
 * returns null instead.
 */
export async function autoSnapshot(reason, level = state.level) {
  if (!level) return null;
  try {
    const rec = await Snap.create(level, { kind: Snap.KIND.AUTO, note: reason, build: buildRecord() });
    if (rec) {
      _lastSnapshotSum = rec.checksum;
      console.info(`[snapshots] auto (${reason}) — ${rec.checksum} ${rec.id}`);
    }
    return rec;
  } catch (err) {
    console.warn('[snapshots] auto snapshot failed: ' + err.message);
    return null;
  }
}

/**
 * Called after a successful SAVE. Only snapshots when the level differs from
 * whatever we last captured, so repeated saves of identical content do not
 * fill history with duplicates.
 */
export async function snapshotOnSaveIfChanged() {
  if (!state.level) return null;
  const sum = levelChecksum(state.level);
  if (sum === _lastSnapshotSum) {
    console.info('[snapshots] save: unchanged since last snapshot, skipping');
    return null;
  }
  return autoSnapshot(REASON.ON_SAVE);
}

// ── MANUAL snapshot ───────────────────────────────────────────────────────
function openSnapshotDialog() {
  if (!state.level) { flash('No level loaded.', '#ff8888'); return; }
  const dlg = $('snapshot-dialog'), note = $('snapshot-note'), ctx = $('snapshot-context');
  const sum = levelChecksum(state.level);
  if (ctx) {
    ctx.textContent = `${state.level.name ?? 'level'} · #${state.level.number ?? '?'} · ` +
      `checksum ${sum}` + (state.dirty ? ' · UNSAVED CHANGES' : '');
  }
  if (!dlg || typeof dlg.showModal !== 'function') {
    // Fallback path: still allow the snapshot, just with a plain prompt.
    const n = typeof window !== 'undefined' && window.prompt
      ? window.prompt('Snapshot note (optional):', '') : '';
    if (n !== null) doManualSnapshot(n || '');
    return;
  }
  if (note) note.value = '';
  dlg.showModal();
  if (note) setTimeout(() => note.focus(), 30);
}

async function doManualSnapshot(note) {
  const rec = await Snap.create(state.level, {
    kind: Snap.KIND.MANUAL, note, build: buildRecord(),
  });
  if (!rec) { flash('✗ Snapshot failed — browser storage unavailable.', '#ff8888'); return null; }
  _lastSnapshotSum = rec.checksum;
  flash(`📸 Snapshot saved — ${Snap.describe(rec)}`, '#44ff88');
  console.info(`[snapshots] MANUAL — ${rec.checksum} ${rec.id} "${note}"`);
  await refreshPanel();
  return rec;
}

// ── RESTORE ───────────────────────────────────────────────────────────────
async function restoreSnapshot(id) {
  const rec = await Snap.get(id);
  if (!rec) { msg('Snapshot no longer exists.', '#ff8888'); return; }

  const label = rec.note ? `"${rec.note}"` : Snap.formatStamp(rec.createdAt);
  const okay = await confirmAction(
    `Restore ${label}?`,
    `This replaces the level currently open in the editor with the snapshot from ` +
    `${Snap.formatStamp(rec.createdAt)} (checksum ${rec.checksum}).\n\n` +
    `Your current state will be backed up automatically first. ` +
    `Nothing is written to the repository — the editor will be marked UNSAVED.`
  );
  if (!okay) { msg('Restore cancelled.'); return; }

  // 1) safety net FIRST, always.
  const backup = await autoSnapshot(REASON.BEFORE_RESTORE);

  // 2) apply. Deep copy so the stored record can never be mutated by editing.
  let payload;
  try { payload = JSON.parse(JSON.stringify(rec.level)); }
  catch { msg('Snapshot payload is unreadable.', '#ff8888'); return; }

  state.level = payload;
  // In-memory from here on: restoring must never imply "this is the committed
  // file", so drop the path and force DIRTY.
  state.levelPath = null;
  state.dirty = true;
  state.selection = Array.isArray(state.selection) ? [] : state.selection;
  if (state.camera) { state.camera.x = 0; state.camera.y = 0; }

  const applied = levelChecksum(state.level);
  notify();
  await refreshPanel();

  const okSum = applied === rec.checksum;
  msg(okSum ? `Restored ${label} — checksum ${applied} verified.`
            : `Restored, but checksum ${applied} != stored ${rec.checksum}!`,
      okSum ? '#44ff88' : '#ff8888');
  flash(okSum
    ? `↺ Restored ${label} (${applied}) — DIRTY / UNSAVED${backup ? ', previous state backed up' : ''}`
    : `⚠ Restore checksum mismatch: ${applied} vs ${rec.checksum}`,
    okSum ? '#44ccff' : '#ff8888');
  console.info(`[snapshots] RESTORE ${rec.id} -> checksum ${applied} (expected ${rec.checksum})`);
}

// ── PREVIEW ───────────────────────────────────────────────────────────────
// Read-only: reports what the snapshot contains and how it differs from the
// level currently open, WITHOUT touching editor state.
async function previewSnapshot(id) {
  const rec = await Snap.get(id);
  if (!rec) { msg('Snapshot no longer exists.', '#ff8888'); return; }
  _previewing = id;
  const cur = state.level;
  const curSum = cur ? levelChecksum(cur) : null;
  const parts = [
    `${rec.levelName ?? 'level'} #${rec.levelNumber ?? '?'}`,
    `${rec.cols ?? '?'} cols`,
    `${rec.tileCount ?? '?'} tiles`,
    `checksum ${rec.checksum}`,
  ];
  if (curSum) {
    parts.push(rec.checksum === curSum
      ? 'IDENTICAL to the level open now'
      : `differs from open level (${curSum})`);
    if (cur && Array.isArray(cur.tiles) && Array.isArray(rec.level.tiles) &&
        cur.tiles.length === rec.level.tiles.length) {
      let d = 0;
      for (let i = 0; i < cur.tiles.length; i++) if (cur.tiles[i] !== rec.level.tiles[i]) d++;
      parts.push(`${d} tile(s) differ`);
    }
  }
  if (rec.build) parts.push(`build ${rec.build.branch}@${rec.build.shaShort}`);
  msg('PREVIEW · ' + parts.join(' · '), '#44ccff');
  await refreshPanel();
}

// ── DOWNLOAD ──────────────────────────────────────────────────────────────
function download(filename, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    return true;
  } catch (err) {
    console.warn('[snapshots] download failed: ' + err.message);
    return false;
  }
}

async function downloadSnapshot(id) {
  const rec = await Snap.get(id);
  if (!rec) { msg('Snapshot no longer exists.', '#ff8888'); return; }
  // Download the LEVEL itself, so the file drops straight into
  // src_scroll/levels/ if Chief wants to promote it.
  const ok = download(Snap.filenameFor(rec), JSON.stringify(rec.level, null, 2));
  msg(ok ? `Downloaded ${Snap.filenameFor(rec)}` : 'Download failed.', ok ? '#44ff88' : '#ff8888');
}

async function deleteSnapshot(id) {
  const rec = await Snap.get(id);
  if (!rec) return;
  const label = rec.note ? `"${rec.note}"` : Snap.formatStamp(rec.createdAt);
  const okay = await confirmAction(`Delete ${label}?`,
    `This permanently removes the snapshot from ${Snap.formatStamp(rec.createdAt)} ` +
    `(checksum ${rec.checksum}). This cannot be undone.`);
  if (!okay) { msg('Delete cancelled.'); return; }
  await Snap.remove(id);
  msg(`Deleted ${label}.`, '#8aaabb');
  await refreshPanel();
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────
async function exportAll() {
  const pkg = await Snap.exportPackage();
  if (!pkg.count) { msg('No snapshots to export.', '#ff8888'); return; }
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const name = `overcharge_snapshots_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}` +
               `-${p(d.getHours())}${p(d.getMinutes())}.json`;
  const ok = download(name, JSON.stringify(pkg, null, 2));
  msg(ok ? `Exported ${pkg.count} snapshot(s) to ${name}` : 'Export failed.',
      ok ? '#44ff88' : '#ff8888');
}

async function importFromFile(file) {
  let obj;
  try { obj = JSON.parse(await file.text()); }
  catch (err) { msg('Not valid JSON: ' + err.message, '#ff8888'); return; }

  // Validate BEFORE writing anything.
  const v = Snap.validatePackage(obj);
  if (!v.ok) {
    msg('Import rejected: ' + (v.error || v.corrupt.slice(0, 2).join('; ')), '#ff8888');
    console.warn('[snapshots] import rejected', v);
    return;
  }
  const okay = await confirmAction('Import backup package?',
    `${v.count} snapshot(s) validated (${v.verified} checksum-verified). ` +
    `Existing snapshots with the same id are skipped, never overwritten. Nothing ` +
    `currently in the editor changes.`);
  if (!okay) { msg('Import cancelled.'); return; }

  const r = await Snap.importPackage(obj);
  msg(r.error ? 'Import failed: ' + r.error
              : `Imported ${r.imported}, skipped ${r.skipped} already present.`,
      r.error ? '#ff8888' : '#44ff88');
  await refreshPanel();
}

async function clearStorage() {
  const st = await Snap.stats();
  const okay = await confirmAction('Delete ALL snapshots?',
    `This permanently removes all ${st.total} snapshot(s) across ${st.levels} level(s), ` +
    `including ${st.manual} manual snapshot(s). This cannot be undone.\n\n` +
    `Consider EXPORT ALL BACKUPS first.`);
  if (!okay) { msg('Clear cancelled.'); return; }
  await Snap.clearAll();
  _lastSnapshotSum = null;
  msg('All snapshots deleted.', '#ff8888');
  await refreshPanel();
}

// ── panel rendering ───────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

export async function refreshPanel() {
  const list = $('history-list');
  if (!list) return;
  const scope = $('history-scope')?.value || 'level';
  const rows = scope === 'all'
    ? await Snap.listAll()
    : await Snap.listForLevel(Snap.levelKeyOf(state.level));

  const st = await Snap.stats();
  const statsEl = $('history-stats');
  if (statsEl) {
    statsEl.textContent =
      `${st.total} snapshot(s) · ${st.manual} manual · ${st.auto} auto · ` +
      `${st.levels} level(s) · ~${Math.round(st.approxBytes / 1024)} KB · ` +
      `auto retention ${Snap.AUTO_RETENTION}/level`;
  }

  if (!rows.length) {
    list.innerHTML = `<div style="padding:18px;color:#667;text-align:center;">` +
      `No snapshots yet.<br><span style="font-size:10px;">Press 📸 SNAPSHOT to save one, ` +
      `or they will appear automatically before destructive operations.</span></div>`;
    return;
  }

  const curSum = state.level ? levelChecksum(state.level) : null;
  list.innerHTML = rows.map(r => {
    const isManual  = r.kind === Snap.KIND.MANUAL;
    const isCurrent = curSum && r.checksum === curSum;
    const isPrev    = _previewing === r.id;
    const badge = isManual
      ? `<span style="color:#ffcc44;border:1px solid #665522;padding:0 4px;font-size:9px;">MANUAL</span>`
      : `<span style="color:#5588aa;border:1px solid #223344;padding:0 4px;font-size:9px;">AUTO</span>`;
    return `<div data-id="${esc(r.id)}" style="border:1px solid ${isPrev ? '#44ccff' : '#1a2330'};
              background:${isPrev ? '#0d1926' : '#080c14'};padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        ${badge}
        <span style="color:#cdd;">${esc(Snap.formatStamp(r.createdAt))}</span>
        ${r.note ? `<span style="color:#8aaabb;">— ${esc(r.note)}</span>` : ''}
        ${isCurrent ? `<span style="color:#44ff88;font-size:9px;">= OPEN NOW</span>` : ''}
      </div>
      <div style="color:#556;font-size:10px;margin-top:3px;">
        ${esc(r.levelName ?? 'level')} #${esc(r.levelNumber ?? '?')} ·
        ${esc(r.cols ?? '?')} cols · ${esc(r.tileCount ?? '?')} tiles ·
        checksum <span style="color:#44ccff;">${esc(r.checksum)}</span>
        ${r.build ? ` · build ${esc(r.build.branch)}@${esc(r.build.shaShort)}` : ''}
      </div>
      <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;">
        <button data-act="preview"  data-id="${esc(r.id)}" style="font-size:10px;">PREVIEW</button>
        <button data-act="restore"  data-id="${esc(r.id)}" style="font-size:10px;color:#ffddaa;">RESTORE</button>
        <button data-act="download" data-id="${esc(r.id)}" style="font-size:10px;">DOWNLOAD JSON</button>
        <button data-act="delete"   data-id="${esc(r.id)}" style="font-size:10px;color:#ff8888;">DELETE</button>
      </div>
    </div>`;
  }).join('');
}

// ── init ──────────────────────────────────────────────────────────────────
export function initSnapshotUI() {
  if (!Snap.isAvailable()) {
    console.warn('[snapshots] IndexedDB unavailable — version history disabled.');
    const b = $('btn-snapshot'), h = $('btn-history');
    if (b) { b.disabled = true; b.title = 'Browser storage unavailable — snapshots disabled'; }
    if (h) { h.disabled = true; h.title = 'Browser storage unavailable — snapshots disabled'; }
    return;
  }

  $('btn-snapshot')?.addEventListener('click', openSnapshotDialog);
  $('snapshot-cancel')?.addEventListener('click', () => { try { $('snapshot-dialog').close(); } catch {} });
  $('snapshot-confirm')?.addEventListener('click', async () => {
    const note = $('snapshot-note')?.value || '';
    try { $('snapshot-dialog').close(); } catch {}
    await doManualSnapshot(note.trim());
  });
  $('snapshot-note')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('snapshot-confirm')?.click(); }
  });

  $('btn-history')?.addEventListener('click', async () => {
    _previewing = null;
    msg('');
    await refreshPanel();
    const d = $('history-dialog');
    if (d && typeof d.showModal === 'function') d.showModal();
  });
  $('history-close')?.addEventListener('click', () => { try { $('history-dialog').close(); } catch {} });
  $('history-scope')?.addEventListener('change', refreshPanel);
  $('history-export')?.addEventListener('click', exportAll);
  $('history-import')?.addEventListener('click', () => $('history-import-input')?.click());
  $('history-import-input')?.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) await importFromFile(f);
  });
  $('history-clear')?.addEventListener('click', clearStorage);

  // One delegated listener for all per-row actions.
  $('history-list')?.addEventListener('click', async e => {
    const btn = e.target.closest && e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    switch (btn.getAttribute('data-act')) {
      case 'preview':  await previewSnapshot(id); break;
      case 'restore':  await restoreSnapshot(id); break;
      case 'download': await downloadSnapshot(id); break;
      case 'delete':   await deleteSnapshot(id);  break;
    }
  });

  console.info('[snapshots] version history ready (IndexedDB, auto retention ' +
               Snap.AUTO_RETENTION + '/level)');
}

// Exposed so main.js can seed the baseline after boot, meaning the first SAVE
// of an unmodified level does not create a pointless snapshot.
export function seedBaseline(level = state.level) {
  if (level) _lastSnapshotSum = levelChecksum(level);
}

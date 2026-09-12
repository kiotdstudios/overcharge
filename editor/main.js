// main.js — editor bootstrap. Wires DOM to state/renderer/tools/assets modules.

import {
  state, subscribe, notify,
  loadManifest, loadLevel, preloadManifestImages,
  setTool, setShowGrid, resetZoom, zoomCamera,
  setGuardsOn, setMagneticSnap, setSnapOverride,
  screenToWorld, levelRows, TILE_SIZE, tileIsSolid,
} from './state.js';
import { render } from './renderer.js';
import { mountAssetBrowser } from './assets.js';
import { TOOLS, middleMousePan, wheelZoom } from './tools.js';
import * as History from './history.js';
import * as Clipboard from './clipboard.js';
import * as Selection from './selection.js';
import * as Persistence from './persistence.js';
import * as Generator   from './generator.js';
import * as Actions     from './actions.js';
import { levelChecksum, logLevelSource } from '../src_scroll/levelsig.js';
import { BUILD } from './buildinfo.js';
import * as SnapUI from './snapshotui.js';

// Default level to load on first boot. After that, the dropdown drives switching.
const DEFAULT_LEVEL_URL = 'src_scroll/levels/level1.json';

// ── DOM refs ─────────────────────────────────────────────────────────────
const canvas   = document.getElementById('editor-canvas');
const ctx      = canvas.getContext('2d');
const sidebar  = document.getElementById('asset-browser');
const toolBtns = document.querySelectorAll('[data-tool]');
const zoomInBtn  = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomResetBtn = document.getElementById('zoom-reset');
const gridToggle = document.getElementById('grid-toggle');
const levelInfo  = document.getElementById('level-info');
const levelSelect  = document.getElementById('level-select');
const btnNew       = document.getElementById('btn-new');
const btnDuplicate = document.getElementById('btn-duplicate');
const btnSave      = document.getElementById('btn-save');
const btnPlay      = document.getElementById('btn-play');
const btnTest      = document.getElementById('btn-test');
const btnUndo      = document.getElementById('btn-undo');
const btnRedo      = document.getElementById('btn-redo');
const saveFlash    = document.getElementById('save-flash');
const btnChooseFolder  = document.getElementById('btn-choose-folder');
const saveFolderName   = document.getElementById('save-folder-name');
const editorRoot     = document.getElementById('editor-root');
const btnInspHide    = document.getElementById('btn-inspector-hide');
const inspShowTab    = document.getElementById('inspector-show-tab');
const guardsToggle   = document.getElementById('guards-toggle');
const magneticToggle = document.getElementById('magnetic-toggle');
const snapSelect     = document.getElementById('snap-select');
const btnLayerFront    = document.getElementById('btn-layer-front');
const btnLayerForward  = document.getElementById('btn-layer-forward');
const btnLayerBackward = document.getElementById('btn-layer-backward');
const btnLayerBack     = document.getElementById('btn-layer-back');
const btnRotate        = document.getElementById('btn-rotate');

// ── Inspector collapse ────────────────────────────────────────────────────
// UI-only layout toggle. Selection/state is untouched — CSS just hides the
// panel and expands the main grid column. Persists across the session via
// sessionStorage (cleared when the tab closes; spec allows session-only).
const INSP_KEY = 'overcharge.editor.inspectorCollapsed';
function setInspectorCollapsed(collapsed) {
  if (!editorRoot) return;
  editorRoot.classList.toggle('inspector-collapsed', collapsed);
  try { sessionStorage.setItem(INSP_KEY, collapsed ? '1' : '0'); } catch {}
  // Grid column change doesn't fire a window resize event — force canvas
  // to re-measure so pan/zoom hit-testing stays accurate.
  fitCanvas();
  // Trigger a redraw
  import('./state.js').then(m => m.notify());
}
function toggleInspector() {
  setInspectorCollapsed(!editorRoot.classList.contains('inspector-collapsed'));
}
btnInspHide?.addEventListener('click', () => setInspectorCollapsed(true));
inspShowTab?.addEventListener('click', () => setInspectorCollapsed(false));

// Redraw flag — hoisted here so the ResizeObserver below can reference it
// without hitting a TDZ. Actual redraw loop wiring lives further down.
let needsRedraw = true;
// Match canvas backing-store size to its current CSS box. Called on window
// resize, inspector-collapse toggle, and by a ResizeObserver so any future
// layout change auto-syncs — preventing CSS-vs-backing coordinate skew.
// Uses Math.round (not floor) so the backing is one pixel closer to CSS
// when the box has a fractional width.
function fitCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width  = Math.max(100, Math.round(r.width));
  canvas.height = Math.max(100, Math.round(r.height));
}
window.addEventListener('resize', fitCanvas);

// ResizeObserver ensures fitCanvas fires on ANY layout change — grid template
// toggle, devtools open/close, sidebar drag (future) — not just window resize.
// Note: canvasCoords in tools.js also scales CSS→backing dynamically, so even
// if fitCanvas hasn't run yet, clicks still map correctly.
if (typeof ResizeObserver !== 'undefined') {
  const ro = new ResizeObserver(() => { fitCanvas(); needsRedraw = true; });
  ro.observe(canvas);
}

// ── Tool button wiring ────────────────────────────────────────────────────
toolBtns.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

// Zoom buttons
zoomInBtn ?.addEventListener('click', () => zoomCamera(1.25, canvas.width/2, canvas.height/2));
zoomOutBtn?.addEventListener('click', () => zoomCamera(1/1.25, canvas.width/2, canvas.height/2));
zoomResetBtn?.addEventListener('click', () => resetZoom());
gridToggle?.addEventListener('change', () => setShowGrid(gridToggle.checked));
guardsToggle?.addEventListener('change', () => setGuardsOn(guardsToggle.checked));
magneticToggle?.addEventListener('change', () => setMagneticSnap(magneticToggle.checked));
snapSelect?.addEventListener('change', (e) => {
  const v = e.target.value;
  setSnapOverride(v === 'auto' ? 'auto' : Number(v));
});

// ── Layer ordering wiring ─────────────────────────────────────────────────
// Operates on the current decoration selection. Bring/Send are undoable via
// Actions.reorderDecorations. No-ops silently when nothing selected.
function _applyLayerOp(op) {
  const decs = Selection.selectedDecorations();
  if (decs.length === 0) return;
  const a = Actions.reorderDecorations(decs, op);
  if (a) History.apply(a);
}
btnLayerFront   ?.addEventListener('click', () => _applyLayerOp('bring-to-front'));
btnLayerForward ?.addEventListener('click', () => _applyLayerOp('bring-forward'));
btnLayerBackward?.addEventListener('click', () => _applyLayerOp('send-backward'));
btnLayerBack    ?.addEventListener('click', () => _applyLayerOp('send-to-back'));

// ── Rotate wiring ─────────────────────────────────────────────────────────
// Rotates the currently-selected tiles AND decorations by ±90°. Gameplay
// markers (spawn/source/gate/switch/checkpoint/enemy) have no rotation
// semantic yet and are ignored. Tiles + decorations rotate as two adjacent
// undo entries — Ctrl+Z once reverts decorations, twice reverts tiles.
function _applyRotate(delta) {
  const decs  = Selection.selectedDecorations();
  const cells = Selection.selectedTiles();
  let applied = false;
  if (decs.length > 0) {
    const a = Actions.rotateDecorations(decs, delta);
    if (a) { History.apply(a); applied = true; }
  }
  if (cells.length > 0) {
    const a = Actions.rotateTiles(cells, delta);
    if (a) { History.apply(a); applied = true; }
  }
  if (!applied) console.info('[editor] rotate — nothing rotatable in selection');
}
btnRotate?.addEventListener('click', () => _applyRotate(90));

// ── Level workflow wiring ─────────────────────────────────────────────────
btnUndo?.addEventListener('click', () => History.undo());
btnRedo?.addEventListener('click', () => History.redo());
btnNew?.addEventListener('click', async () => {
  await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_NEW);
  await Persistence.newLevel();
});
btnDuplicate?.addEventListener('click', async () => {
  await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_REPLACE);
  await Persistence.duplicateLevel();
});

// ── Test Level ────────────────────────────────────────────────────────────
// Hand the current in-memory level to the game runtime for a playable
// preview. Serializes state.level to localStorage under a known key, then
// opens index.html?test=1 in a new tab. The game (src_scroll/main.js)
// detects the query param and loads the level def from localStorage instead
// of the compiled-in LEVEL1. No disk save required — perfect for iterating.
const TEST_LEVEL_KEY = 'overcharge.testLevel';
btnTest?.addEventListener('click', () => {
  if (!state.level) return;
  try {
    localStorage.setItem(TEST_LEVEL_KEY, JSON.stringify(state.level));
  } catch (err) {
    console.error('[editor] Could not stash test level:', err);
    return;
  }
  // Parity trace: log the EXACT payload the game is about to read back, with
  // the same shared checksum the runtime prints. Chief can diff at a glance.
  logLevelSource('[editor] TEST HANDOFF',
    state.dirty
      ? `localStorage['${TEST_LEVEL_KEY}']  (LOCAL UNSAVED editor state — NOT the committed JSON)`
      : `localStorage['${TEST_LEVEL_KEY}']  (clean — identical to committed ${state.levelPath || 'JSON'})`,
    state.level);
  // Cache-busting param so any code changes I ship land immediately.
  const url = 'index.html?test=1&t=' + Date.now();
  window.open(url, '_blank', 'noopener');
});

// ── ▶ PLAY: open game in dev mode (plays local save if present) ─────────
btnPlay?.addEventListener('click', () => {
  window.open('index.html?dev=1&t=' + Date.now(), '_blank', 'noopener');
});

// ── Generator modal wiring ────────────────────────────────────────────────
const genDialog     = document.getElementById('gen-dialog');
const btnGenerate   = document.getElementById('btn-generate');
const genStyle      = document.getElementById('gen-style');
const genLength     = document.getElementById('gen-length');
const genComplexity = document.getElementById('gen-complexity');
const genProps      = document.getElementById('gen-props');
const genElectrical = document.getElementById('gen-electrical');
const genCheckpoint = document.getElementById('gen-checkpoint');
const genEnemies    = document.getElementById('gen-enemies');
const genSeedInput  = document.getElementById('gen-seed');
const genSeedCopy   = document.getElementById('gen-seed-copy');
const genCancel     = document.getElementById('gen-cancel');
const genClose      = document.getElementById('gen-close');
const genGo         = document.getElementById('gen-go');
const genRegenerate = document.getElementById('gen-regenerate');
const genStatus     = document.getElementById('gen-status');

function collectGenOpts() {
  const seedStr = (genSeedInput?.value || '').trim();
  const seedNum = seedStr ? parseInt(seedStr, 10) : null;
  return {
    style:      genStyle?.value      || 'Balanced',
    length:     genLength?.value     || 'Medium',
    complexity: genComplexity?.value || 'Moderate',
    props:      !!genProps?.checked,
    electrical: !!genElectrical?.checked,
    checkpoint: !!genCheckpoint?.checked,
    enemies:    !!genEnemies?.checked,
    seed:       (Number.isFinite(seedNum) && seedNum > 0) ? seedNum : null,
  };
}
async function runGeneration(opts) {
  try {
    const result = Generator.generateLevel(opts);
    // Close the generator dialog BEFORE the persistence layer may open the
    // confirm-discard dialog. Two <dialog>.showModal() calls stacked without
    // closing the first throws InvalidStateError in most browsers.
    const wasOpen = genDialog && genDialog.open;
    if (wasOpen) try { genDialog.close(); } catch {}
    await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_GENERATE);
    const ok = await Persistence.loadInMemoryLevel(result.level, {
      confirmMessage: 'Discard unsaved changes and load a generated level?',
    });
    // Reopen the generator dialog so Chief can immediately regenerate or copy the seed.
    if (wasOpen && genDialog && !genDialog.open) try { genDialog.showModal(); } catch {}
    if (ok) {
      // Reflect seed back into the input so Chief can copy or regenerate deterministically.
      if (genSeedInput) genSeedInput.value = String(result.seed);
      genStatus.textContent = `✓ ${result.name} · seed ${result.seed} · ${result.retries} internal retries`;
    } else if (genStatus) {
      genStatus.textContent = 'Cancelled — no changes.';
    }
  } catch (err) {
    console.error('[generator]', err);
    if (genStatus) genStatus.textContent = `✗ ${err.message}`;
  }
}
btnGenerate?.addEventListener('click', () => {
  if (!genDialog) return;
  if (genStatus) genStatus.textContent = '';
  genDialog.showModal();
});
genCancel?.addEventListener('click', () => genDialog.close());
genClose ?.addEventListener('click', () => genDialog.close());
genGo?.addEventListener('click', async () => {
  await runGeneration(collectGenOpts());
});
genRegenerate?.addEventListener('click', async () => {
  // Regenerate = ignore any manually entered seed, use fresh random seed.
  if (genSeedInput) genSeedInput.value = '';
  await runGeneration(collectGenOpts());
});
genSeedCopy?.addEventListener('click', async () => {
  const v = genSeedInput?.value || '';
  if (!v) return;
  try { await navigator.clipboard.writeText(v); genStatus.textContent = `Copied seed ${v}`; }
  catch { genStatus.textContent = `Seed: ${v} (clipboard unavailable)`; }
});
btnSave?.addEventListener('click', async () => {
  const r = await Persistence.saveCurrentLevel();
  // Snapshot on a SUCCESSFUL save, but only if the level changed since the last
  // snapshot — repeated saves of identical content must not fill history.
  if (r && r.ok) await SnapUI.snapshotOnSaveIfChanged();
  // A successful save writes to local disk + IndexedDB, never to the server.
  // Record that so the parity strip stops claiming "in sync with committed".
  showSaveFlash(r);
  // Refresh dropdown so a newly-created custom filename appears immediately.
  if (r.ok) {
    try { state.availableLevels = await Persistence.discoverLevels(); refreshLevelSelect(); } catch {}
  }
  _updateFolderDisplay();
});
// Let Chief pick (or re-pick) the save folder. Once set, all future saves
// write directly into that folder — no more Downloads downloads.
btnChooseFolder?.addEventListener('click', async () => {
  // ORDER 005 diagnostics: this button must NEVER appear to "do nothing".
  if (typeof window.showDirectoryPicker !== 'function') {
    showSaveFlash({ ok: false, message:
      'This browser cannot pick folders (no File System Access API). '
      + 'Use desktop Chrome or Edge to save into the Git folder.' });
    return;
  }
  const handle = await Persistence.chooseSaveFolder();
  if (handle) {
    showSaveFlash({ ok: true, message: `Save folder set: ${handle.name} — SAVE now writes directly there.` });
  } else {
    const why = Persistence.lastPickerError();
    showSaveFlash({ ok: false, message: why
      ? `Folder picker failed: ${why} — if this page is embedded, open it in a full Chrome/Edge tab.`
      : 'No folder chosen — SAVE will FAIL until the Git levels folder (src_scroll/levels) is set.' });
  }
  _updateFolderDisplay();
});
function _updateFolderDisplay() {
  if (!saveFolderName) return;
  const name = Persistence.saveFolderName();
  if (name) {
    saveFolderName.textContent = name + '/';
    saveFolderName.className = 'set';
    saveFolderName.title = 'Saves write to this folder. Click 📁 FOLDER to change.';
  } else {
    saveFolderName.textContent = 'no folder set';
    saveFolderName.className = '';
    saveFolderName.title = 'Click 📁 FOLDER to pick the git levels folder (src_scroll/levels/)';
  }
}
_updateFolderDisplay();
// ORDER 005: REVERT reloads the level from Git-tracked JSON, discarding
// in-memory edits. There is no IndexedDB copy to discard anymore.
const btnRevertLocal = document.getElementById('btn-revert-local');
btnRevertLocal?.addEventListener('click', async () => {
  const num = state.level?.number;
  if (num == null) return;
  const msg = `Reload level ${num} from the Git JSON (src_scroll/levels/level${num}.json), `
            + `discarding any unsaved editor changes?\n\nSnapshots in history are NOT affected.`;
  if (!window.confirm(msg)) return;
  state.dirty = false;   // deliberate discard — skip the dirty prompt in switchToLevel
  const committed = (state.availableLevels || [])
    .find(l => l.source !== 'dir' && l.number === num);
  const ok = await Persistence.switchToLevel(
    committed || `src_scroll/levels/level${num}.json`);
  state.availableLevels = await Persistence.discoverLevels();
  refreshLevelSelect();
  showSaveFlash({ ok, message: ok
    ? `Reloaded level ${num} from Git.`
    : `Could not load level ${num} from Git.` });
});

// ORDER 005: level ORDER buttons — move the current level in the Git-tracked
// manifest (src_scroll/levels/levels.json). Requires the FOLDER so the edit
// lands in the clone and can be committed; never stored in the browser.
async function _moveOrder(delta) {
  const num = state.level?.number;
  if (num == null) { showSaveFlash({ ok: false, message: 'No level loaded.' }); return; }
  const r = await Persistence.moveLevelInOrder(num, delta);
  showSaveFlash(r);
  if (r.ok) { state.availableLevels = await Persistence.discoverLevels(); refreshLevelSelect(); }
}
document.getElementById('btn-order-up')  ?.addEventListener('click', () => _moveOrder(-1));
document.getElementById('btn-order-down')?.addEventListener('click', () => _moveOrder(+1));


// ── Delete level handler ──────────────────────────────────────────────────
// ORDER 005: deletes the level's JSON files from the chosen Git folder
// (canonical level<N>.json + descriptive variant) and removes it from the
// order manifest. Requires the FOLDER; git history remains the undo.
const btnDeleteLevel = document.getElementById('btn-delete-level');
btnDeleteLevel?.addEventListener('click', async () => {
  const num = state.level?.number;
  if (num == null) {
    showSaveFlash({ ok: false, message: 'No level loaded.' });
    return;
  }
  const dir = await Persistence.currentSaveDir();
  if (!dir) {
    showSaveFlash({ ok: false, message: 'Set the FOLDER (src_scroll/levels in your Git clone) first — deletion edits Git files.' });
    return;
  }
  const title = 'DELETE LEVEL FILES?';
  const body  = `Delete level ${num}'s JSON from the Git folder (level${num}.json + its named variant) and remove it from the level order?

The working-tree files are removed; git history still has them until you commit. Snapshots are NOT affected.`;
  const dlg = document.getElementById('confirm-dialog');
  if (dlg) {
    const titleEl = document.getElementById('confirm-title');
    const bodyEl  = document.getElementById('confirm-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl)  bodyEl.textContent  = body;
    dlg.showModal();
    const ok = await new Promise(res => {
      const onOk     = () => { dlg.close(); cleanup(); res(true); };
      const onCancel = () => { dlg.close(); cleanup(); res(false); };
      const cleanup  = () => {
        document.getElementById('confirm-ok')?.removeEventListener('click', onOk);
        document.getElementById('confirm-cancel')?.removeEventListener('click', onCancel);
      };
      document.getElementById('confirm-ok')?.addEventListener('click', onOk);
      document.getElementById('confirm-cancel')?.addEventListener('click', onCancel);
    });
    if (!ok) return;
  } else if (!window.confirm(body)) return;

  const del = await Persistence.deleteLevelFiles(num);
  if (!del.ok) { showSaveFlash(del); return; }
  state.dirty = false;   // its files are gone by explicit choice
  state.availableLevels = await Persistence.discoverLevels();
  const next = (state.availableLevels || []).find(l => l.number !== num) || state.availableLevels?.[0];
  if (next) await Persistence.switchToLevel(next);
  else await Persistence.newLevel();
  state.availableLevels = await Persistence.discoverLevels();
  refreshLevelSelect();
  _statusSnapCount = null;
  refreshStatusStrip();
  showSaveFlash({ ok: true, message: `Level ${num} files deleted from the Git folder — commit the deletion to publish it.` });
});

levelSelect?.addEventListener('change', async (e) => {
  // Value is an index into state.availableLevels; the array is (re)populated
  // by refreshLevelSelect from Persistence.discoverLevels().
  const idx = Number(e.target.value);
  const list = state.availableLevels || [];
  const entry = list[idx];
  const priorValue = levelSelect._priorValue || '';
  if (!entry) return;
  // Loading another level replaces everything on screen — snapshot first.
  await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_LOAD);
  const ok = await Persistence.switchToLevel(entry);
  if (!ok) e.target.value = priorValue;
  else levelSelect._priorValue = e.target.value;
});

function showSaveFlash(result) {
  if (!saveFlash) return;
  saveFlash.className = 'show' + (result.ok ? '' : ' err');
  saveFlash.textContent = result.ok ? `✓ ${result.message}` : `✗ ${result.message}`;
  setTimeout(() => { saveFlash.className = ''; saveFlash.textContent = ''; }, 3200);
}

// ── Canvas mouse events → active tool ─────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  if (state.pendingSpawn) { _doSpawn(e, canvas); return; }
  TOOLS[state.tool]?.onMouseDown?.(e, canvas);
});
canvas.addEventListener('mousemove', (e) => TOOLS[state.tool]?.onMouseMove?.(e, canvas));
window.addEventListener('mouseup',   (e) => TOOLS[state.tool]?.onMouseUp?.  (e, canvas));

middleMousePan(canvas);
wheelZoom(canvas);

// Note: asset drag from sidebar → canvas is handled entirely in tools.js
// (startAssetDrag) via pointer events, called from assets.js on pointerdown.
// HTML5 native drag-and-drop was removed here because it was unreliable
// across browsers.

// ── Keyboard shortcuts ────────────────────────────────────────────────────
window.addEventListener('keydown', async (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  if (ctrl) {
    if (e.key === 'z' || e.key === 'Z') {
      if (shift) { e.preventDefault(); History.redo(); return; }
      e.preventDefault(); History.undo(); return;
    }
    if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); History.redo(); return; }
    if (e.key === 'c' || e.key === 'C') { e.preventDefault(); Clipboard.copy(); return; }
    if (e.key === 'x' || e.key === 'X') { e.preventDefault(); Clipboard.cut(); return; }
    if (e.key === 'v' || e.key === 'V') { e.preventDefault(); Clipboard.paste(); return; }
    if (e.key === 'd' || e.key === 'D') { e.preventDefault(); Clipboard.duplicate(); return; }
    if (e.key === 's' || e.key === 'S') {
      e.preventDefault();
      const r = await Persistence.saveCurrentLevel();
      showSaveFlash(r);
      if (r && r.ok) await SnapUI.snapshotOnSaveIfChanged();
      if (r.ok) {
        try { state.availableLevels = await Persistence.discoverLevels(); refreshLevelSelect(); } catch {}
      }
      return;
    }
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      Selection.clearSelection();
      const L = state.level;
      if (L) {
        if (Array.isArray(L.decorations)) for (const d of L.decorations) Selection.selectDecoration(d, true);
        for (let r = 0; r < L.tiles.length / L.cols; r++) {
          for (let c = 0; c < L.cols; c++) {
            if (L.tiles[r * L.cols + c] !== 0) Selection.selectTile(c, r, true);
          }
        }
      }
      return;
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); Clipboard.deleteSelection(); return; }
  if (e.key === 'Escape') {
    if (state.pendingSpawn) { state.pendingSpawn = null; _refreshSpawnStatus(); return; }
    Selection.clearSelection();
    return;
  }
  if (e.key === '1') setTool('pointer');
  if (e.key === '2') setTool('select');
  if (e.key === '3') setTool('place');
  if (e.key === '4') setTool('erase');
  if (e.key === '5') setTool('pan');
  if (e.key === '6') setTool('rect');
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !state.showGrid; setShowGrid(gridToggle.checked); }
  if (e.key === '0') resetZoom();
  if (e.key === 'i' || e.key === 'I') { e.preventDefault(); toggleInspector(); }
  // Layer ordering shortcuts
  if (e.key === ']') { e.preventDefault(); _applyLayerOp(shift ? 'bring-to-front' : 'bring-forward'); }
  if (e.key === '[') { e.preventDefault(); _applyLayerOp(shift ? 'send-to-back'  : 'send-backward'); }
  // Rotate — R = 90° CW, Shift+R = 90° CCW
  if (e.key === 'r' || e.key === 'R') { e.preventDefault(); _applyRotate(shift ? -90 : 90); }
});

// beforeunload — warn on unsaved changes (Ctrl+R, tab close, etc.)
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) { e.preventDefault(); e.returnValue = ''; return ''; }
});

// ── UI refresh (subscribes to every state change) ─────────────────────────
function refreshUI() {
  // Active tool button highlight
  toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === state.tool));
  const cur = TOOLS[state.tool];
  if (cur) canvas.style.cursor = cur.cursor;

  // Undo / Redo enabled state
  if (btnUndo) btnUndo.disabled = !History.canUndo();
  if (btnRedo) btnRedo.disabled = !History.canRedo();

  // Save button — brighter when dirty
  if (btnSave) {
    btnSave.disabled = !state.level;
    btnSave.classList.toggle('primary', true);   // always primary style
  }

  // Level dropdown — keep in sync with state.levelPath. If current is in-memory-only
  // (levelPath is null after NEW/DUPLICATE), show a synthetic option at the top.
  refreshLevelSelect();

  // Level info bar
  refreshLevelInfo();
}

function refreshLevelSelect() {
  if (!levelSelect) return;
  const list = state.availableLevels || [];
  const isInMemory = state.level && !state.levelPath;

  // Rebuild options only when the set of entries changes (avoid focus loss).
  // Option `value` is the entry's index in availableLevels — kept simple
  // because entries can be directory-handle-backed with no stable string key.
  const desiredSig = (isInMemory ? '__inmemory__|' : '')
                   + list.map(l => (l.source || 'x') + ':' + (l.filename || l.path || l.levelKey || '')).join('|');
  const currentSig = levelSelect._sig || '';
  if (currentSig !== desiredSig) {
    levelSelect.innerHTML = '';
    if (isInMemory) {
      const o = document.createElement('option');
      o.value = '__inmemory__';
      o.textContent = `(unsaved) ${state.level.name || 'new level'}`;
      levelSelect.appendChild(o);
    }
    list.forEach((l, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      // Two rows can share a level number: the copy committed in git and
      // Chief's own newer save. Spell out which is which, and which one the
      // game will actually load, or it just looks like a duplicate.
      const src = l.source === 'dir' ? '📂' : '📦';
      const tag = l.source === 'dir'
        ? '  (Git folder file — commit & push to publish)'
        : '  (committed in Git)';
      o.textContent = `${src} ${l.number ?? '?'} — ${l.name}${tag}`;
      levelSelect.appendChild(o);
    });
    levelSelect._sig = desiredSig;
  }
  // Sync selected value based on current levelPath / in-memory flag.
  if (isInMemory) {
    levelSelect.value = '__inmemory__';
  } else {
    const path = state.levelPath || '';
    const idx = list.findIndex(l =>
      (l.source === 'dir' && ('dir:' + l.filename) === path) ||
      (l.source === 'bundled' && l.path === path));
    levelSelect.value = idx >= 0 ? String(idx) : '';
    levelSelect._priorValue = levelSelect.value;
  }
}

function refreshLevelInfo() {
  if (!levelInfo) return;
  const L = state.level;
  if (!L) { levelInfo.textContent = 'no level loaded'; return; }
  const rows = Math.floor(L.tiles.length / L.cols);
  const selCount = Selection.selectionCount();
  const selPart = selCount > 0 ? ` · sel: ${selCount}` : '';
  const histPart = ` · hist: ${History.depth()}`;
  const dirtyPart = state.dirty ? '<span class="dirty-star">●</span>' : '';
  levelInfo.innerHTML = `${L.name || '?'} · #${L.number ?? '?'} · ${L.cols}×${rows} · zoom ${state.camera.zoom.toFixed(2)}x${selPart}${histPart}${dirtyPart}`;
}

// (needsRedraw declared earlier — hoisted for ResizeObserver access)

// ── Dev build label ───────────────────────────────────────────────────────
// Two servers on two worktrees were serving two different editors with
// nothing on screen to tell them apart. This makes the open build obvious.
(function showBuildLabel() {
  const el = document.getElementById('build-label');
  if (!el) return;
  const dirtyTag = BUILD.dirty
    ? ' <span style="color:#ff8800">(uncommitted)</span>'
    : '';
  el.innerHTML =
    `BRANCH: <span style="color:#44ccff">${BUILD.branch}</span>` +
    ` · BASE SHA: <span style="color:#8aaabb" title="SHA at build time — not necessarily HEAD">${BUILD.shaShort}</span>${dirtyTag}` +
    `<br>worktree: <span style="color:#8aaabb">${BUILD.worktree}</span>`;
  el.title = `full SHA ${BUILD.shaFull}\nbuild info generated ${BUILD.generated}\n` +
             `Regenerate with: node scripts/build_info.mjs`;
  console.info(`[editor] BUILD  branch=${BUILD.branch}  sha=${BUILD.shaShort}` +
               `${BUILD.dirty ? ' (uncommitted changes)' : ''}  worktree=${BUILD.worktree}`);
})();

// ── Parity status strip ───────────────────────────────────────────────────
// Chief §2: make it impossible to confuse "what I am testing" with
// "what the game will load".
const parityStatus = document.getElementById('parity-status');

// ORDER 005: the level on screen came from a Git-folder file (dir:) rather
// than the served committed copy — meaning it may be ahead of what's pushed.
const _isLocalOnly = () => String(state.levelPath || '').startsWith('dir:');

function refreshParityStatus() {
  if (!parityStatus || !state.level) return;
  const sum = levelChecksum(state.level);
  if (state.dirty) {
    parityStatus.innerHTML =
      '<span style="color:#ff8800">\u25CF TESTING LOCAL UNSAVED LEVEL</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#8aaabb">GAME USES COMMITTED LEVEL JSON</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#44ccff">editor checksum ' + sum + '</span>';
    parityStatus.title = 'Your edits are local only. The normal game still loads the committed src_scroll/levels/level1.json until you SAVE and commit it.';
  } else if (_isLocalOnly()) {
    parityStatus.innerHTML =
      '<span style="color:#ffee00">\u25CF LOCAL SAVE \u2014 NOT COMMITTED</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#ffee00">GAME PLAYS THIS SAVE IN YOUR BROWSER ONLY</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#44ccff">checksum ' + sum + '</span>';
    parityStatus.title = 'Saved on this machine only (disk + browser storage). The game in THIS browser '
      + 'plays it, but everyone else still gets the committed src_scroll/levels JSON until '
      + 'you publish it to git (PUBLISH_LEVELS.bat).';
  } else {
    parityStatus.innerHTML =
      '<span style="color:#44ff88">\u25CF IN SYNC WITH COMMITTED LEVEL JSON</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#8aaabb">GAME USES COMMITTED LEVEL JSON</span>' +
      '<span style="color:#556"> \u2502 </span>' +
      '<span style="color:#44ccff">checksum ' + sum + '</span>';
    parityStatus.title = 'Editor state matches the level file it was loaded from. TEST and the normal game will report the same checksum.';
  }
}

// ── Level status strip (top of Tools Panel) ───────────────────────────
// Shows: level name+number, dirty state, checksum, snapshot count.
// Answers: "I am editing Level N, SAVED/UNSAVED, checksum X, Y backups".
let _statusSnapCount = null;   // cached to avoid async on every keystroke
let _statusSnapTimer = null;
async function _fetchSnapCount() {
  try {
    const { listForLevel, levelKeyOf } = await import('./snapshots.js');
    const rows = await listForLevel(levelKeyOf(state.level));
    _statusSnapCount = rows.length;
  } catch { _statusSnapCount = null; }
  refreshStatusStrip();
}
function refreshStatusStrip() {
  const nameEl  = document.getElementById('lss-name');
  const stateEl = document.getElementById('lss-state');
  const snapEl  = document.getElementById('lss-snaps');
  if (!nameEl) return;
  if (!state.level) { nameEl.textContent = 'No level loaded'; if (stateEl) stateEl.textContent = ''; return; }
  const L = state.level;
  const num  = L.number != null ? '#' + L.number : '';
  const name = L.name || 'Untitled';
  nameEl.innerHTML = `<span>${name}</span> <span style="color:#667;font-size:10px">${num}</span>`;
  if (stateEl) {
    const sum = levelChecksum(L);
    const dirtyMark = state.dirty
      ? '<span class="lss-dirty">● UNSAVED</span>'
      : '<span class="lss-saved">✓ SAVED</span>';
    const local = _isLocalOnly()
      ? ' <span style="color:#ffee00">· LOCAL</span>'
      : '';
    stateEl.innerHTML = `${dirtyMark}${local} <span class="lss-chk">· ${sum}</span>`;
  }
  if (snapEl) {
    snapEl.innerHTML = _statusSnapCount != null
      ? `<span class="lss-snaps">📷 ${_statusSnapCount} snapshot${_statusSnapCount !== 1 ? 's' : ''}</span>`
      : '';
  }
  // Debounce the async snap count fetch (don't hit IDB on every keystroke)
  if (_statusSnapCount === null) {
    clearTimeout(_statusSnapTimer);
    _statusSnapTimer = setTimeout(_fetchSnapCount, 800);
  }
}

subscribe(() => { needsRedraw = true; refreshUI(); refreshParityStatus(); refreshStatusStrip(); });
// Sprite images loaded async — trigger a canvas repaint when they finish loading.
window.addEventListener('_editorRepaint', () => { needsRedraw = true; });
function frame() {
  if (needsRedraw) { render(ctx, canvas); needsRedraw = false; }
  requestAnimationFrame(frame);
}

// ── UPLOAD LEVEL ─────────────────────────────────────────────────────────
// Import an OVERCHARGE .json level from disk. Runs through the same
// _loadInMemory path the generator uses, so the uploaded level lands in
// state as DIRTY / UNSAVED — Chief must explicitly SAVE to commit.
//
// Validation happens BEFORE any state is mutated; malformed JSON leaves
// the current editor state untouched (Chief directive).
const btnUpload   = document.getElementById('btn-upload');
const uploadInput = document.getElementById('upload-input');

function _validateLevelShape(obj) {
  if (!obj || typeof obj !== 'object')          return 'not an object';
  if (typeof obj.cols !== 'number' || obj.cols < 1) return 'missing/invalid cols';
  if (!Array.isArray(obj.tiles))                return 'missing tiles array';
  const expected = obj.cols * 14;
  if (obj.tiles.length !== expected)            return `tiles length ${obj.tiles.length} ≠ cols*14 (${expected})`;
  if (!obj.playerStart || typeof obj.playerStart.x !== 'number' || typeof obj.playerStart.y !== 'number') return 'missing playerStart {x,y}';
  return null;
}

function _normalizeUploadedLevel(obj) {
  // Match the runtime normalizer + editor conventions. Missing collections
  // default to []. Preserves ALL supported fields (rotation, snap, family,
  // etc.) — we spread the original to avoid dropping unknown-yet-valid keys.
  return {
    ...obj,
    name:         obj.name || 'UPLOADED',
    number:       Number.isFinite(obj.number) ? obj.number : (state.level?.number ?? 1),
    decorations:  obj.decorations || [],
    sources:      obj.sources     || [],
    gates:        obj.gates       || [],
    switches:     obj.switches    || [],
    checkpoints:  obj.checkpoints || [],
    platforms:    obj.platforms   || [],
    enemies:      obj.enemies     || [],
  };
}

btnUpload?.addEventListener('click', () => uploadInput?.click());
uploadInput?.addEventListener('change', async () => {
  const file = uploadInput.files && uploadInput.files[0];
  uploadInput.value = '';  // allow re-picking the same file next time
  if (!file) return;
  try {
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (e) { throw new Error('invalid JSON: ' + e.message); }
    const err = _validateLevelShape(parsed);
    if (err) throw new Error('rejected — ' + err);
    const normalized = _normalizeUploadedLevel(parsed);
    await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_IMPORT);
    const ok = await Persistence.loadInMemoryLevel(normalized, {
      confirmMessage: `Discard unsaved changes and load "${normalized.name}" from ${file.name}?`,
      syntheticKey:   'upload:' + file.name,
    });
    if (ok) {
      saveFlash.textContent = `↑ Uploaded ${file.name} — DIRTY / UNSAVED. Review, then SAVE to commit.`;
      saveFlash.style.color = '#44ccff';
      setTimeout(() => { saveFlash.textContent = ''; saveFlash.style.color = ''; }, 5000);
    }
  } catch (e) {
    console.warn('[editor] upload rejected:', e.message);
    saveFlash.textContent = `✗ Upload rejected: ${e.message}`;
    saveFlash.style.color = '#ff8888';
    setTimeout(() => { saveFlash.textContent = ''; saveFlash.style.color = ''; }, 6000);
  }
});

// ── AUTO-RECOVERY ────────────────────────────────────────────────────────
// Chief's directive: on meaningful editor changes, save a local recovery
// snapshot. On refresh/startup, if a recovery exists, show a prompt with
// RESTORE / DISCARD. Never silently replace the committed level.
//
// The snapshot lives in localStorage under a single slot. It contains the
// dirty in-memory level as JSON plus the source path we started from (so
// Chief can tell what the recovery is relative to). Save is debounced.
const RECOVERY_KEY   = 'overcharge.editor.recovery';
const RECOVERY_DEBOUNCE_MS = 600;
let _recoverySaveTimer = null;
let _recoverySuppress  = true;   // true during bootstrap — avoid writing the freshly-loaded snapshot

function _saveRecoverySnapshot() {
  if (_recoverySuppress) return;
  if (!state.level || !state.dirty) return;
  try {
    const payload = {
      savedAt:    new Date().toISOString(),
      sourcePath: state.levelPath || null,
      levelName:  state.level.name || 'LEVEL',
      level:      state.level,
    };
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[editor] Could not persist recovery snapshot:', e.message);
  }
}

function _clearRecoverySnapshot() {
  try { localStorage.removeItem(RECOVERY_KEY); } catch {}
}

function _readRecoverySnapshot() {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !p.level) return null;
    return p;
  } catch { return null; }
}

// Debounced writer — wired to subscribe() below (after bootstrap sets up).
function _scheduleRecoverySave() {
  clearTimeout(_recoverySaveTimer);
  _recoverySaveTimer = setTimeout(_saveRecoverySnapshot, RECOVERY_DEBOUNCE_MS);
}

// Also drop a synchronous snapshot on tab close so we don't lose the last
// few ms of edits between debounce fires.
window.addEventListener('beforeunload', () => {
  if (state.dirty) _saveRecoverySnapshot();
});

// Recovery dialog wiring — presented from bootstrap() when a snapshot is found.
async function _promptRecovery(snap) {
  const dialog  = document.getElementById('recovery-dialog');
  const detail  = document.getElementById('recovery-details');
  const btnR    = document.getElementById('recovery-restore');
  const btnD    = document.getElementById('recovery-discard');
  if (!dialog || !btnR || !btnD) return false;   // no dialog → skip prompt
  detail.textContent = `An unsaved editor session was found (saved ${snap.savedAt}, level "${snap.levelName}"). Restore it, or discard and keep the committed level?`;
  return new Promise(resolve => {
    const cleanup = () => {
      btnR.removeEventListener('click', onRestore);
      btnD.removeEventListener('click', onDiscard);
      try { dialog.close(); } catch {}
    };
    const onRestore = () => { cleanup(); resolve(true); };
    const onDiscard = () => { cleanup(); resolve(false); };
    btnR.addEventListener('click', onRestore);
    btnD.addEventListener('click', onDiscard);
    try { dialog.showModal(); }
    catch { resolve(window.confirm('Restore unsaved editor session?')); }
  });
}

async function _handleRecoveryOnBoot() {
  const snap = _readRecoverySnapshot();
  if (!snap) return;
  const restore = await _promptRecovery(snap);
  if (restore) {
    // Validate before applying — a corrupt snapshot must NOT wipe committed state.
    const err = _validateLevelShape(snap.level);
    if (err) {
      console.warn('[editor] Recovery snapshot rejected —', err);
      _clearRecoverySnapshot();
      return;
    }
    const normalized = _normalizeUploadedLevel(snap.level);
    // Force-load: recovery has its own confirm dialog; bypass the "dirty" prompt.
    state.dirty = false;
    // Crash recovery is about to replace the committed level that just loaded.
    // Snapshot it first: recovery and snapshots are separate systems, and one
    // must never destroy the other's evidence.
    await SnapUI.autoSnapshot(SnapUI.REASON.BEFORE_RECOVERY);
    await Persistence.loadInMemoryLevel(normalized, {
      confirmMessage: '',   // never actually shown; state.dirty=false forces bypass
      syntheticKey:   'recovery:' + (snap.savedAt || Date.now()),
    });
    saveFlash.textContent = `↺ Restored unsaved level from ${snap.savedAt}`;
    saveFlash.style.color = '#44ccff';
    setTimeout(() => { saveFlash.textContent = ''; saveFlash.style.color = ''; }, 5000);
  } else {
    _clearRecoverySnapshot();
  }
}

// ── DEV QA quick-action buttons ────────────────────────────────
document.getElementById('qa-play')?.addEventListener('click', () => {
  window.open('index.html?dev=1&t=' + Date.now(), '_blank', 'noopener');
});
document.getElementById('qa-test')?.addEventListener('click', () => btnTest?.click());
document.getElementById('qa-snapshot')?.addEventListener('click', () => document.getElementById('btn-snapshot')?.click());
document.getElementById('qa-history')?.addEventListener('click', () => document.getElementById('btn-history')?.click());

// ── EXPORT / IMPORT BACKUP in Tools Panel ──────────────────────────
document.getElementById('btn-export-backups')?.addEventListener('click', () => {
  // Delegate to the history-export button inside the history dialog
  document.getElementById('history-export')?.click();
});
document.getElementById('btn-import-backups')?.addEventListener('click', () => {
  document.getElementById('import-backups-input')?.click();
});
document.getElementById('import-backups-input')?.addEventListener('change', async e => {
  // Delegate to the history-import-input handler via a synthetic click on it
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!f) return;
  // Transfer the file to the history-import-input and fire its handler
  const dt = new DataTransfer();
  dt.items.add(f);
  const hi = document.getElementById('history-import-input');
  if (hi) {
    hi.files = dt.files;
    hi.dispatchEvent(new Event('change'));
  }
});


// ── Spawn mode ──────────────────────────────────────────────────────────────
// state.pendingSpawn = null | { kind } where kind is one of:
//   'drain-enemy', 'patrol-enemy', 'drone-enemy',
//   'source', 'switch', 'gate', 'checkpoint', 'platform'
// Set by spawn buttons. Cleared after placement or Escape.

state.pendingSpawn = null;

const _spawnStatus   = document.getElementById('spawn-status');

function _refreshSpawnStatus() {
  if (!_spawnStatus) return;
  if (state.pendingSpawn) {
    _spawnStatus.textContent = '\u25cf Click canvas to place: ' + state.pendingSpawn.kind.toUpperCase();
    _spawnStatus.classList.add('active');
    if (canvas) canvas.style.cursor = 'crosshair';
  } else {
    _spawnStatus.textContent = '';
    _spawnStatus.classList.remove('active');
    const cur = TOOLS[state.tool];
    if (cur && canvas) canvas.style.cursor = cur.cursor;
  }
}

function _groundAt(worldX, worldY, objH) {
  const L = state.level;
  if (!L) return Math.round(worldY);
  const col  = Math.floor(worldX / TILE_SIZE);
  const rows = levelRows();
  const startRow = Math.max(0, Math.floor(worldY / TILE_SIZE));
  for (let r = startRow; r < rows; r++) {
    if (col >= 0 && col < L.cols) {
      const v = L.tiles[r * L.cols + col];
      if (tileIsSolid(v)) return r * TILE_SIZE - objH;
    }
  }
  return Math.round(worldY);
}

function _snapGrid(v) { return Math.round(v / TILE_SIZE) * TILE_SIZE; }

function _doSpawn(e, canvas) {
  const L = state.level;
  if (!L || !state.pendingSpawn) return;
  const r  = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * (canvas.width  / (r.width  || 1));
  const sy = (e.clientY - r.top)  * (canvas.height / (r.height || 1));
  const { x: wx, y: wy } = screenToWorld(sx, sy);
  const kind = state.pendingSpawn.kind;
  let obj = null, arr = null, arrLabel = null;

  if (kind === 'drain-enemy') {
    const w = 22, h = 24, px = Math.round(wx), py = _groundAt(wx, wy, h);
    obj = { type: 'drain', x: px, y: py, patrolLeft: px - 64, patrolRight: px + 64 + w, speed: 60 };
    arr = L.enemies || (L.enemies = []); arrLabel = 'add_enemy';
  } else if (kind === 'patrol-enemy') {
    const w = 20, h = 26, px = Math.round(wx), py = _groundAt(wx, wy, h);
    obj = { type: 'patrol', x: px, y: py, patrolLeft: px - 64, patrolRight: px + 64 + w, speed: 50 };
    arr = L.enemies || (L.enemies = []); arrLabel = 'add_enemy';
  } else if (kind === 'drone-enemy') {
    const w = 40, px = Math.round(wx), py = Math.round(wy);
    obj = { type: 'drone', x: px, y: py, patrolLeft: px - 64, patrolRight: px + 64 + w, speed: 55 };
    arr = L.enemies || (L.enemies = []); arrLabel = 'add_enemy';
  } else if (kind === 'source') {
    // Chief directive 2026-09-12: a standard generator gives 4 energy, period.
    // Other source types (e.g. ambient street lamps at ~0.5) set their own
    // `charge` — the field is per-source data, editable in the inspector.
    obj = { x: _snapGrid(wx), y: _snapGrid(wy), label: 'GEN', charge: 4 };
    arr = L.sources || (L.sources = []); arrLabel = 'add_source';
  } else if (kind === 'switch') {
    obj = { id: 'sw_' + Date.now(), x: _snapGrid(wx), y: _snapGrid(wy), required: 1, linkedId: null, label: '' };
    arr = L.switches || (L.switches = []); arrLabel = 'add_switch';
  } else if (kind === 'gate') {
    obj = { id: 'gate_' + Date.now(), x: _snapGrid(wx), y: _snapGrid(wy), w: 32, h: 96, required: 1, isExit: false, blockOnly: false, label: 'GATE' };
    arr = L.gates || (L.gates = []); arrLabel = 'add_gate';
  } else if (kind === 'checkpoint') {
    obj = { id: 'cp_' + Date.now(), x: Math.round(wx), y: Math.round(wy) };
    arr = L.checkpoints || (L.checkpoints = []); arrLabel = 'add_checkpoint';
  } else if (kind === 'platform') {
    const w = 96, px = _snapGrid(wx), py = _snapGrid(wy);
    obj = { x: px, y: py, w, h: 12, x1: px - 64, x2: px + 64 + w, speed: 80 };
    arr = L.platforms || (L.platforms = []); arrLabel = 'add_platform';
  }

  if (obj && arr !== null) {
    const action = Actions.addToArray(arr, obj, arrLabel);
    if (action) History.apply(action);
    const kindMap = {
      'drain-enemy': 'enemy', 'patrol-enemy': 'enemy', 'drone-enemy': 'enemy',
      'source': 'source', 'switch': 'switch', 'gate': 'gate',
      'checkpoint': 'checkpoint', 'platform': 'platform',
    };
    Selection.selectByKind(kindMap[kind], obj);
  }
  state.pendingSpawn = null;
  _refreshSpawnStatus();
}

[
  ['spawn-drain',      'drain-enemy'],
  ['spawn-patrol',     'patrol-enemy'],
  ['spawn-drone',      'drone-enemy'],
  ['spawn-source',     'source'],
  ['spawn-switch',     'switch'],
  ['spawn-gate',       'gate'],
  ['spawn-checkpoint', 'checkpoint'],
  ['spawn-platform',   'platform'],
].forEach(([id, kind]) => {
  document.getElementById(id)?.addEventListener('click', () => {
    state.pendingSpawn = { kind };
    _refreshSpawnStatus();
  });
});

// ── Selected-object property editor ────────────────────────────────────────
// Shows editable fields for the first selected gameplay object.
// Changes mutate the ref in-place and mark dirty (no undo — too granular).

const _selPanel   = document.getElementById('tp-selected');
const _selSection = document.getElementById('tp-selected-section');

function _refreshSelectedProps() {
  if (!_selPanel || !_selSection) return;
  const sel = state.selection;
  let kind = null, ref = null;
  for (const [k, kname] of [
    ['enemies','enemy'],['switches','switch'],['checkpoints','checkpoint'],
    ['platforms','platform'],['sources','source'],['gates','gate'],
  ]) {
    if (sel[k] && sel[k].size > 0) { kind = kname; ref = [...sel[k]][0]; break; }
  }
  if (!kind || !ref) { _selSection.style.display = 'none'; _selPanel.innerHTML = ''; return; }
  _selSection.style.display = '';

  let badge = '', color = '#cdd', fields = [];
  if (kind === 'enemy') {
    const type = ref.type || 'patrol';
    color = type === 'drain' ? '#ff3355' : type === 'drone' ? '#88cc44' : '#ff7733';
    badge = 'ENEMY · ' + type.toUpperCase();
    fields = [
      { label:'type',       key:'type',       ro:true },
      { label:'x',          key:'x',          num:true },
      { label:'y',          key:'y',          num:true },
      { label:'patrolLeft', key:'patrolLeft',  num:true },
      { label:'patrolRight',key:'patrolRight', num:true },
      { label:'speed',      key:'speed',       num:true, min:1 },
    ];
  } else if (kind === 'switch') {
    color = '#ff8800'; badge = 'SWITCH';
    const gateIds = (state.level?.gates || []).map(g => g.id||'').filter(Boolean);
    fields = [
      { label:'id',       key:'id',       text:true },
      { label:'required', key:'required', num:true, min:0 },
      { label:'linkedId', key:'linkedId', sel:true, opts:['(none)',...gateIds] },
      { label:'label',    key:'label',    text:true },
    ];
  } else if (kind === 'checkpoint') {
    color = '#44ff88'; badge = 'CHECKPOINT';
    fields = [
      { label:'id',       key:'id', text:true },
      { label:'x center', key:'x',  num:true },
      { label:'y ground', key:'y',  num:true },
    ];
  } else if (kind === 'platform') {
    color = '#44aadd'; badge = 'PLATFORM';
    fields = [
      { label:'x', key:'x', num:true }, { label:'y',key:'y', num:true },
      { label:'w', key:'w', num:true, min:16 }, { label:'h',key:'h', num:true, min:4 },
      { label:'x1',key:'x1',num:true }, { label:'x2',key:'x2',num:true },
      { label:'speed',key:'speed',num:true,min:1 },
    ];
  } else if (kind === 'source') {
    color = '#ffee00'; badge = 'SOURCE';
    fields = [
      { label:'label', key:'label', text:true },
      { label:'charge',key:'charge',num:true,min:1 },
      { label:'x',     key:'x',     num:true }, { label:'y',key:'y',num:true },
    ];
  } else if (kind === 'gate') {
    color = ref.isExit ? '#ff44ff' : (ref.blockOnly ? '#ff8800' : '#44ccff');
    badge = ref.isExit ? 'GATE · EXIT' : (ref.blockOnly ? 'GATE · BARRIER' : 'GATE');
    fields = [
      { label:'id',      key:'id',       text:true },
      { label:'label',   key:'label',    text:true },
      { label:'required',key:'required', num:true, min:0 },
      { label:'w',       key:'w',        num:true, min:1 },
      { label:'h',       key:'h',        num:true, min:1 },
      { label:'isExit',  key:'isExit',   bool:true },
      { label:'blockOnly',key:'blockOnly',bool:true },
    ];
  }

  let html = `<div class="prop-type-badge" style="color:${color};border-color:${color}55">${badge}</div>`;
  for (const f of fields) {
    if (f.ro) {
      html += `<div class="prop-row"><span class="prop-label">${f.label}</span><span style="color:#88aacc;font-family:monospace;font-size:11px">${ref[f.key]??''}</span></div>`;
    } else if (f.bool) {
      html += `<div class="prop-row"><span class="prop-label">${f.label}</span><input class="prop-input" data-key="${f.key}" data-vtype="bool" type="checkbox"${ref[f.key]?' checked':''} style="flex:0;width:16px;height:16px;cursor:pointer"></div>`;
    } else if (f.sel) {
      const opts = f.opts.map(o=>{const v=o==='(none)'?'':o;const s=(ref[f.key]===v||(ref[f.key]==null&&o==='(none)'))?'selected':'';return`<option value="${v}" ${s}>${o}</option>`;}).join('');
      html += `<div class="prop-row"><span class="prop-label">${f.label}</span><select class="prop-select" data-key="${f.key}" data-vtype="sel">${opts}</select></div>`;
    } else {
      const t = f.num ? 'number' : 'text';
      const extra = (f.min!=null?` min="${f.min}"`:'') + (f.num?' step="1"':'');
      html += `<div class="prop-row"><span class="prop-label">${f.label}</span><input class="prop-input" data-key="${f.key}" data-vtype="${t}" type="${t}" value="${ref[f.key]??''}"${extra}></div>`;
    }
  }
  _selPanel.innerHTML = html;
  _selPanel.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('change', () => {
      const vt = el.dataset.vtype;
      if (vt === 'number') ref[el.dataset.key] = Number(el.value);
      else if (vt === 'bool') ref[el.dataset.key] = el.checked;
      else if (vt === 'sel')  ref[el.dataset.key] = el.value === '' ? null : el.value;
      else ref[el.dataset.key] = el.value;
      state.dirty = true; notify();
    });
  });
}

subscribe(() => _refreshSelectedProps());

// ── Tools Panel: collapsible sections ──────────────────────────────
document.querySelectorAll('.tp-hdr').forEach(hdr => {
  hdr.addEventListener('click', () => {
    const body = document.getElementById('tp-' + hdr.dataset.sec);
    if (!body) return;
    const hidden = body.classList.toggle('hidden');
    hdr.classList.toggle('collapsed', hidden);
  });
});

// Hook the debounced saver into the state change stream. Fires only when
// state.dirty is true — clean loads don't overwrite the previous recovery.
subscribe(() => { if (state.dirty) _scheduleRecoverySave(); });
// Persistence.save*() flips state.dirty = false on success — clear the
// recovery slot when a level is successfully saved to disk.
subscribe(() => { if (!state.dirty && !_recoverySuppress) _clearRecoverySnapshot(); });

// ── Bootstrap ────────────────────────────────────────────────────────────
async function bootstrap() {
  fitCanvas();
  // Restore inspector-collapsed state from this session (spec §nice-to-have)
  try { if (sessionStorage.getItem(INSP_KEY) === '1') editorRoot.classList.add('inspector-collapsed'); } catch {}
  mountAssetBrowser(sidebar);
  try {
    await loadManifest('assets/ASSET_MANIFEST.json');
    // Preload every non-animated asset image so placeTool can read
    // naturalWidth/naturalHeight synchronously as a dimension fallback.
    await preloadManifestImages();
    state.availableLevels = await Persistence.discoverLevels();
    await loadLevel(DEFAULT_LEVEL_URL);
    // Prefer a previous session's local save over the committed copy.
    // ORDER 005: no IndexedDB restore — the fetched Git JSON is the truth.
    History.clearAll();
    Selection.clearSelection();
    state.dirty = false;
    setTool('pointer');   // everyday editing default per Chief
    refreshUI();
    frame();
    // Present recovery prompt if a snapshot exists. Suppression flag stays
    // true until after the prompt resolves so we don't overwrite the
    // recovery with the freshly-loaded default level.
    logLevelSource('[editor] BUILDER', DEFAULT_LEVEL_URL + '  (authoritative committed JSON)', state.level);
    // Snapshot system: wire the UI, then record the freshly-loaded level as the
    // baseline so an immediate SAVE of an unmodified level does not create a
    // pointless "on save" snapshot.
    SnapUI.initSnapshotUI();
    SnapUI.seedBaseline(state.level);
    await _handleRecoveryOnBoot();
    _recoverySuppress = false;
    console.info(`[editor] Boot OK — ${state.availableLevels.length} level(s), FSA save: ${Persistence.hasFSA() ? 'yes' : 'no (download-only)'}`);
  } catch (err) {
    console.error('Editor bootstrap failed:', err);
    ctx.fillStyle = '#f44';
    ctx.font = '14px monospace';
    ctx.fillText('Bootstrap failed: ' + err.message, 20, 40);
    ctx.fillText('Check console.', 20, 60);
  }
}
bootstrap();

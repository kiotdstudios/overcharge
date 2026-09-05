// main.js — editor bootstrap. Wires DOM to state/renderer/tools/assets modules.

import {
  state, subscribe,
  loadManifest, loadLevel, preloadManifestImages,
  setTool, setShowGrid, resetZoom, zoomCamera,
  setGuardsOn, setMagneticSnap, setSnapOverride,
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
const btnTest      = document.getElementById('btn-test');
const btnUndo      = document.getElementById('btn-undo');
const btnRedo      = document.getElementById('btn-redo');
const saveFlash    = document.getElementById('save-flash');
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
btnNew?.addEventListener('click', async () => { await Persistence.newLevel(); });
btnDuplicate?.addEventListener('click', async () => { await Persistence.duplicateLevel(); });

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
  // Cache-busting param so any code changes I ship land immediately.
  const url = 'index.html?test=1&t=' + Date.now();
  window.open(url, '_blank', 'noopener');
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
  showSaveFlash(r);
  // Refresh dropdown so a newly-created custom filename appears immediately.
  if (r.ok) {
    try { state.availableLevels = await Persistence.discoverLevels(); refreshLevelSelect(); } catch {}
  }
});
levelSelect?.addEventListener('change', async (e) => {
  // Value is an index into state.availableLevels; the array is (re)populated
  // by refreshLevelSelect from Persistence.discoverLevels().
  const idx = Number(e.target.value);
  const list = state.availableLevels || [];
  const entry = list[idx];
  const priorValue = levelSelect._priorValue || '';
  if (!entry) return;
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
canvas.addEventListener('mousedown', (e) => TOOLS[state.tool]?.onMouseDown?.(e, canvas));
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
  if (e.key === 'Escape') { Selection.clearSelection(); return; }
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
                   + list.map(l => (l.source || 'x') + ':' + (l.filename || l.path || '')).join('|');
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
      const src = l.source === 'dir' ? '📂' : '📦';
      o.textContent = `${src} ${l.number ?? '?'} — ${l.name}`;
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

// ── Redraw loop ───────────────────────────────────────────────────────────
// (needsRedraw declared earlier — hoisted for ResizeObserver access)
subscribe(() => { needsRedraw = true; refreshUI(); });
function frame() {
  if (needsRedraw) { render(ctx, canvas); needsRedraw = false; }
  requestAnimationFrame(frame);
}

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
    History.clearAll();
    Selection.clearSelection();
    state.dirty = false;
    setTool('pointer');   // everyday editing default per Chief
    refreshUI();
    frame();
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

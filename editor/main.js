// main.js — editor bootstrap. Wires DOM to state/renderer/tools/assets modules.

import {
  state, subscribe,
  loadManifest, loadLevel,
  setTool, setShowGrid, resetZoom, zoomCamera,
} from './state.js';
import { render } from './renderer.js';
import { mountAssetBrowser } from './assets.js';
import { TOOLS, middleMousePan, wheelZoom } from './tools.js';
import * as History from './history.js';
import * as Clipboard from './clipboard.js';
import * as Selection from './selection.js';
import * as Persistence from './persistence.js';

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
const btnUndo      = document.getElementById('btn-undo');
const btnRedo      = document.getElementById('btn-redo');
const saveFlash    = document.getElementById('save-flash');

function fitCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width  = Math.max(100, Math.floor(r.width));
  canvas.height = Math.max(100, Math.floor(r.height));
}
window.addEventListener('resize', fitCanvas);

// ── Tool button wiring ────────────────────────────────────────────────────
toolBtns.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

// Zoom buttons
zoomInBtn ?.addEventListener('click', () => zoomCamera(1.25, canvas.width/2, canvas.height/2));
zoomOutBtn?.addEventListener('click', () => zoomCamera(1/1.25, canvas.width/2, canvas.height/2));
zoomResetBtn?.addEventListener('click', () => resetZoom());
gridToggle?.addEventListener('change', () => setShowGrid(gridToggle.checked));

// ── Level workflow wiring ─────────────────────────────────────────────────
btnUndo?.addEventListener('click', () => History.undo());
btnRedo?.addEventListener('click', () => History.redo());
btnNew?.addEventListener('click', async () => { await Persistence.newLevel(); });
btnDuplicate?.addEventListener('click', async () => { await Persistence.duplicateLevel(); });
btnSave?.addEventListener('click', async () => {
  const r = await Persistence.saveCurrentLevel();
  showSaveFlash(r);
});
levelSelect?.addEventListener('change', async (e) => {
  const path = e.target.value;
  // Snapshot for revert-on-cancel
  const priorPath = state.levelPath;
  const ok = await Persistence.switchToLevel(path);
  if (!ok && priorPath) e.target.value = priorPath;
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
  if (e.key === '1') setTool('select');
  if (e.key === '2') setTool('place');
  if (e.key === '3') setTool('erase');
  if (e.key === '4') setTool('pan');
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !state.showGrid; setShowGrid(gridToggle.checked); }
  if (e.key === '0') resetZoom();
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

  // Rebuild options only when the set of paths changes (avoid focus loss)
  const currentOptions = Array.from(levelSelect.options).map(o => o.value).join('|');
  const desiredValues = [];
  if (isInMemory) desiredValues.push('__inmemory__');
  for (const l of list) desiredValues.push(l.path);
  const desiredSig = desiredValues.join('|');
  if (currentOptions !== desiredSig) {
    levelSelect.innerHTML = '';
    if (isInMemory) {
      const o = document.createElement('option');
      o.value = '__inmemory__';
      o.textContent = `(unsaved) ${state.level.name || 'new level'}`;
      levelSelect.appendChild(o);
    }
    for (const l of list) {
      const o = document.createElement('option');
      o.value = l.path;
      o.textContent = `${l.number ?? '?'} — ${l.name}`;
      levelSelect.appendChild(o);
    }
  }
  // Sync selected value
  levelSelect.value = isInMemory ? '__inmemory__' : (state.levelPath || '');
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
let needsRedraw = true;
subscribe(() => { needsRedraw = true; refreshUI(); });
function frame() {
  if (needsRedraw) { render(ctx, canvas); needsRedraw = false; }
  requestAnimationFrame(frame);
}

// ── Bootstrap ────────────────────────────────────────────────────────────
async function bootstrap() {
  fitCanvas();
  mountAssetBrowser(sidebar);
  try {
    await loadManifest('assets/ASSET_MANIFEST.json');
    state.availableLevels = await Persistence.discoverLevels();
    await loadLevel(DEFAULT_LEVEL_URL);
    History.clearAll();
    Selection.clearSelection();
    state.dirty = false;
    setTool('select');
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

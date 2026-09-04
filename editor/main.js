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

// Default level to load. Phase 4 will make this a File → Open dialog.
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
const levelInfo = document.getElementById('level-info');

function fitCanvas() {
  const r = canvas.getBoundingClientRect();
  canvas.width  = Math.max(100, Math.floor(r.width));
  canvas.height = Math.max(100, Math.floor(r.height));
}
window.addEventListener('resize', fitCanvas);

// ── Tool button wiring ────────────────────────────────────────────────────
toolBtns.forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});
function refreshToolUI() {
  toolBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tool === state.tool));
  const cur = TOOLS[state.tool];
  if (cur) canvas.style.cursor = cur.cursor;
}

// Zoom buttons
zoomInBtn ?.addEventListener('click', () => zoomCamera(1.25, canvas.width/2, canvas.height/2));
zoomOutBtn?.addEventListener('click', () => zoomCamera(1/1.25, canvas.width/2, canvas.height/2));
zoomResetBtn?.addEventListener('click', () => resetZoom());
gridToggle?.addEventListener('change', () => setShowGrid(gridToggle.checked));

// ── Canvas mouse events → active tool ─────────────────────────────────────
canvas.addEventListener('mousedown', (e) => TOOLS[state.tool]?.onMouseDown?.(e, canvas));
canvas.addEventListener('mousemove', (e) => TOOLS[state.tool]?.onMouseMove?.(e, canvas));
window.addEventListener('mouseup',   (e) => TOOLS[state.tool]?.onMouseUp?.  (e, canvas));

middleMousePan(canvas);
wheelZoom(canvas);

// ── Keyboard shortcuts ────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  // Never hijack keys when the user is typing in an input/textarea.
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;

  // Ctrl-modified shortcuts
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
    if (e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      // Select-all: every decoration + every solid tile
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

  // Non-modified keys
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); Clipboard.deleteSelection(); return; }
  if (e.key === 'Escape') { Selection.clearSelection(); return; }
  if (e.key === '1') setTool('select');
  if (e.key === '2') setTool('place');
  if (e.key === '3') setTool('erase');
  if (e.key === '4') setTool('pan');
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !state.showGrid; setShowGrid(gridToggle.checked); }
  if (e.key === '0') resetZoom();
});

// ── Redraw loop ───────────────────────────────────────────────────────────
let needsRedraw = true;
subscribe(() => { needsRedraw = true; refreshToolUI(); refreshLevelInfo(); });
function frame() {
  if (needsRedraw) { render(ctx, canvas); needsRedraw = false; }
  requestAnimationFrame(frame);
}

// ── Level info label ─────────────────────────────────────────────────────
function refreshLevelInfo() {
  if (!levelInfo) return;
  const L = state.level;
  if (!L) { levelInfo.textContent = 'no level loaded'; return; }
  const rows = Math.floor(L.tiles.length / L.cols);
  const selCount = Selection.selectionCount();
  const selPart = selCount > 0 ? ` · sel: ${selCount}` : '';
  const histPart = ` · hist: ${History.depth()}`;
  levelInfo.textContent = `${L.name || '?'} · #${L.number ?? '?'} · ${L.cols}×${rows} tiles · zoom ${state.camera.zoom.toFixed(2)}x${selPart}${histPart}`;
}

// ── Bootstrap ────────────────────────────────────────────────────────────
async function bootstrap() {
  fitCanvas();
  mountAssetBrowser(sidebar);
  try {
    await loadManifest('assets/ASSET_MANIFEST.json');   // curated production catalog (Aki-owned)
    await loadLevel(DEFAULT_LEVEL_URL);
    History.clearAll();                                  // fresh history per load
    Selection.clearSelection();
    setTool('select');                                   // Phase 2 default
    refreshToolUI();
    refreshLevelInfo();
    frame();
  } catch (err) {
    console.error('Editor bootstrap failed:', err);
    ctx.fillStyle = '#f44';
    ctx.font = '14px monospace';
    ctx.fillText('Bootstrap failed: ' + err.message, 20, 40);
    ctx.fillText('Check console.', 20, 60);
  }
}
bootstrap();

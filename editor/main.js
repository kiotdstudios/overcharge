// main.js — editor bootstrap. Wires DOM to state/renderer/tools/assets modules.

import {
  state, subscribe,
  loadManifest, loadLevel,
  setTool, setShowGrid, resetZoom,
} from './state.js';
import { render } from './renderer.js';
import { mountAssetBrowser } from './assets.js';
import { TOOLS, middleMousePan, wheelZoom } from './tools.js';

// Default level to load. Change here (or via Phase 4 File→Open) to open others.
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

// Sync canvas backing size to CSS size (pixel-perfect, no blur)
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
  toolBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === state.tool);
  });
  const cur = TOOLS[state.tool];
  if (cur) canvas.style.cursor = cur.cursor;
}

// Zoom buttons
zoomInBtn ?.addEventListener('click', () => import('./state.js').then(m => m.zoomCamera(1.25, canvas.width/2, canvas.height/2)));
zoomOutBtn?.addEventListener('click', () => import('./state.js').then(m => m.zoomCamera(1/1.25, canvas.width/2, canvas.height/2)));
zoomResetBtn?.addEventListener('click', () => resetZoom());
gridToggle?.addEventListener('change', () => setShowGrid(gridToggle.checked));

// ── Canvas mouse events → active tool ─────────────────────────────────────
canvas.addEventListener('mousedown', (e) => TOOLS[state.tool]?.onMouseDown?.(e, canvas));
canvas.addEventListener('mousemove', (e) => TOOLS[state.tool]?.onMouseMove?.(e, canvas));
window.addEventListener('mouseup',   (e) => TOOLS[state.tool]?.onMouseUp?.  (e, canvas));

// Global input helpers
middleMousePan(canvas);
wheelZoom(canvas);

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === '1') setTool('place');
  if (e.key === '2') setTool('erase');
  if (e.key === '3') setTool('pan');
  if (e.key === 'g' || e.key === 'G') { gridToggle.checked = !state.showGrid; setShowGrid(gridToggle.checked); }
  if (e.key === '0') resetZoom();
});

// ── Redraw loop ───────────────────────────────────────────────────────────
let needsRedraw = true;
subscribe(() => { needsRedraw = true; refreshToolUI(); refreshLevelInfo(); });

function frame() {
  if (needsRedraw) {
    render(ctx, canvas);
    needsRedraw = false;
  }
  requestAnimationFrame(frame);
}

// ── Level info label ─────────────────────────────────────────────────────
function refreshLevelInfo() {
  if (!levelInfo) return;
  const L = state.level;
  if (!L) { levelInfo.textContent = 'no level loaded'; return; }
  const rows = Math.floor(L.tiles.length / L.cols);
  levelInfo.textContent = `${L.name || '?'} · #${L.number ?? '?'} · ${L.cols}×${rows} tiles · ${L.cols * 32}×${rows * 32} px · zoom ${state.camera.zoom.toFixed(2)}x`;
}

// ── Bootstrap ────────────────────────────────────────────────────────────
async function bootstrap() {
  fitCanvas();
  mountAssetBrowser(sidebar);
  try {
    await loadManifest('assets/asset_index.json');
    await loadLevel(DEFAULT_LEVEL_URL);
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

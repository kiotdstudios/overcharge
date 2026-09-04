// assets.js — asset browser sidebar UI.
// Reads state.manifest + state.filter; writes state.filter + state.selectedAsset.
// Never hard-codes category list — categories are derived from the manifest.

import {
  state, subscribe,
  manifestCategories, filteredManifestItems,
  setFilterCategory, setFilterSearch, setSelectedAsset,
} from './state.js';

let root;                    // container element
let searchInput;             // search field
let categorySelect;          // <select> of categories
let thumbGrid;               // grid of thumbnails
let statusEl;                // "N items shown"

export function mountAssetBrowser(container) {
  root = container;
  root.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'ab-header';
  header.innerHTML = '<h3>ASSETS</h3>';
  root.appendChild(header);

  // Search
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search (e.g. roof, lamp, gate)';
  searchInput.className = 'ab-search';
  searchInput.addEventListener('input', () => setFilterSearch(searchInput.value));
  root.appendChild(searchInput);

  // Category dropdown — populated from manifest, not hard-coded
  categorySelect = document.createElement('select');
  categorySelect.className = 'ab-category';
  categorySelect.addEventListener('change', () => setFilterCategory(categorySelect.value));
  root.appendChild(categorySelect);

  // Status
  statusEl = document.createElement('div');
  statusEl.className = 'ab-status';
  root.appendChild(statusEl);

  // Thumbnail grid
  thumbGrid = document.createElement('div');
  thumbGrid.className = 'ab-grid';
  root.appendChild(thumbGrid);

  // React to state changes
  subscribe(refresh);
  refresh();
}

function refresh() {
  if (!root) return;
  _populateCategories();
  _populateThumbs();
}

function _populateCategories() {
  const cats = manifestCategories();
  if (!cats.length) { categorySelect.innerHTML = '<option value="all">(loading...)</option>'; return; }
  const current = state.filter.category;
  categorySelect.innerHTML = '';
  const optAll = document.createElement('option');
  optAll.value = 'all';
  optAll.textContent = `all (${state.manifest.count})`;
  categorySelect.appendChild(optAll);
  for (const c of cats) {
    const count = state.manifest.items.filter(i => i.category === c).length;
    const o = document.createElement('option');
    o.value = c;
    o.textContent = `${c} (${count})`;
    categorySelect.appendChild(o);
  }
  categorySelect.value = current;
}

function _populateThumbs() {
  const items = filteredManifestItems();
  statusEl.textContent = `${items.length} shown`;
  thumbGrid.innerHTML = '';
  // Cap render for perf (~200 tiles rendered at once is plenty).
  const cap = Math.min(items.length, 400);
  for (let i = 0; i < cap; i++) {
    const it = items[i];
    const cell = document.createElement('div');
    cell.className = 'ab-cell' + (state.selectedAsset && state.selectedAsset.path === it.path ? ' selected' : '');
    cell.title = `${it.name}\n${it.category}\n${it.path}`;
    cell.addEventListener('click', () => setSelectedAsset(it));

    const img = document.createElement('img');
    img.src = it.path;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'ab-thumb';
    cell.appendChild(img);

    const label = document.createElement('div');
    label.className = 'ab-label';
    label.textContent = it.name;
    cell.appendChild(label);

    thumbGrid.appendChild(cell);
  }
  if (items.length > cap) {
    const more = document.createElement('div');
    more.className = 'ab-status';
    more.textContent = `(+${items.length - cap} more — refine filter)`;
    thumbGrid.appendChild(more);
  }
}

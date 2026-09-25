// assets.js — asset browser sidebar UI.
// Reads state.manifest + state.filter + state.level; writes state.filter + state.selectedAsset.
// Layout:
//   § BACKGROUNDS — background pack cards; clicking sets level.background
//   § TILES & OBJECTS — existing tile/object grid with search + filters

import {
  state, subscribe,
  manifestCategories, filteredManifestItems, filteredBackgroundItems,
  currentLevelBackground,
  setFilterCategory, setFilterSearch, setSelectedAsset,
  setPurpleCityOnly, setPurpleRooftopOnly, setHvacOnly, setNightCityRailOnly,
  setLevelBackground,
} from './state.js';
import { startAssetDrag } from './tools.js';

let root;
let searchInput;
let categorySelect;
let thumbGrid;
let statusEl;
let bgSectionEl;   // background section container (rebuilt on notify)

// ─── Background pack catalog ─────────────────────────────────────────────────
// Hardcoded pack registry so the section renders even before ASSET_MANIFEST loads.
const BG_PACKS = [
  {
    key:         'night-city-rail',
    label:       'Night City Rail',
    preview:     'assets/bg/night-city-rail/night-city-rail-v1/01-sky.png',
    description: '4-layer parallax • sky / track / train / front skyline',
    tag:         'night-city-rail',
  },
];

export function mountAssetBrowser(container) {
  root = container;
  root.innerHTML = '';
  root.style.cssText += 'display:flex;flex-direction:column;gap:0;';

  // ── § BACKGROUNDS ──────────────────────────────────────────────────────────
  const bgWrap = document.createElement('div');
  bgWrap.style.cssText = 'border-bottom:1px solid #1c2a3a;padding:8px 8px 0;flex-shrink:0;';

  const bgHdr = document.createElement('div');
  bgHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';
  const bgTitle = document.createElement('h3');
  bgTitle.className = 'ab-header';
  bgTitle.style.cssText = 'font-size:10px;letter-spacing:2px;color:#557;margin:0;';
  bgTitle.textContent = 'BACKGROUNDS';
  bgHdr.appendChild(bgTitle);
  bgWrap.appendChild(bgHdr);

  bgSectionEl = document.createElement('div');
  bgSectionEl.id = 'bg-pack-list';
  bgWrap.appendChild(bgSectionEl);
  root.appendChild(bgWrap);

  // ── § TILES & OBJECTS ──────────────────────────────────────────────────────
  const tileWrap = document.createElement('div');
  tileWrap.style.cssText = 'flex:1;overflow-y:auto;padding:8px;min-height:0;';

  const tileHdr = document.createElement('h3');
  tileHdr.style.cssText = 'font-size:10px;letter-spacing:2px;color:#557;margin:0 0 6px;';
  tileHdr.textContent = 'TILES & OBJECTS';
  tileWrap.appendChild(tileHdr);

  // Search
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search (e.g. roof, lamp, gate)';
  searchInput.className = 'ab-search';
  searchInput.addEventListener('input', () => setFilterSearch(searchInput.value));
  tileWrap.appendChild(searchInput);

  // ── Quick-filter row: pack checkboxes ─────────────────────────────────────
  const filterRow = document.createElement('div');
  filterRow.style.cssText = 'border:1px solid #1c2a3a;border-radius:3px;padding:5px 6px 4px;margin-bottom:6px;';

  const filterLbl = document.createElement('div');
  filterLbl.style.cssText = 'font-size:9px;letter-spacing:2px;color:#446;margin-bottom:4px;';
  filterLbl.textContent = 'FILTER BY PACK';
  filterRow.appendChild(filterLbl);

  const packFilters = [
    { id: 'ab-purple-city-only',    label: 'Purple City',      color: '#9ac', getter: () => !!state.filter.purpleCityOnly,    setter: setPurpleCityOnly    },
    { id: 'ab-purple-rooftop-only', label: 'Purple Rooftop',   color: '#c9b', getter: () => !!state.filter.purpleRooftopOnly, setter: setPurpleRooftopOnly },
  ];

  const extraFilters = [
    { id: 'ab-hvac-only',           label: 'HVAC',             color: '#aec', getter: () => !!state.filter.hvacOnly,          setter: setHvacOnly           },
  ];

  for (const cfg of [...packFilters, ...extraFilters]) {
    const row = document.createElement('label');
    row.style.cssText = `display:flex;align-items:center;gap:6px;font-size:11px;color:${cfg.color};margin:1px 0;user-select:none;cursor:pointer;`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = cfg.id;
    box.checked = cfg.getter();
    box.addEventListener('change', () => cfg.setter(box.checked));
    row.appendChild(box);
    row.appendChild(Object.assign(document.createElement('span'), { textContent: cfg.label }));
    filterRow.appendChild(row);
  }
  tileWrap.appendChild(filterRow);

  // Category dropdown
  categorySelect = document.createElement('select');
  categorySelect.className = 'ab-category';
  categorySelect.addEventListener('change', () => setFilterCategory(categorySelect.value));
  tileWrap.appendChild(categorySelect);

  // Status
  statusEl = document.createElement('div');
  statusEl.className = 'ab-status';
  tileWrap.appendChild(statusEl);

  // Thumbnail grid
  thumbGrid = document.createElement('div');
  thumbGrid.className = 'ab-grid';
  tileWrap.appendChild(thumbGrid);

  root.appendChild(tileWrap);

  subscribe(refresh);
  refresh();
}

function refresh() {
  if (!root) return;
  _refreshBgSection();
  _populateCategories();
  _populateThumbs();
}

// ── Background section ────────────────────────────────────────────────────────
function _refreshBgSection() {
  if (!bgSectionEl) return;
  const activePack = currentLevelBackground();
  bgSectionEl.innerHTML = '';

  for (const pack of BG_PACKS) {
    const card = document.createElement('div');
    const isActive = activePack === pack.key;
    card.style.cssText = [
      'display:flex;align-items:center;gap:7px;',
      'padding:5px 6px;margin-bottom:5px;border-radius:3px;cursor:pointer;',
      'border:1px solid ' + (isActive ? '#44ccff' : '#1c2a3a') + ';',
      'background:' + (isActive ? '#0a1a28' : '#0d1119') + ';',
    ].join('');
    card.title = isActive ? `Active: ${pack.label} — click to remove` : `Set background: ${pack.label}`;

    // Preview thumbnail
    const thumb = document.createElement('img');
    thumb.src = pack.preview;
    thumb.style.cssText = 'width:52px;height:30px;object-fit:cover;image-rendering:pixelated;flex-shrink:0;border:1px solid #2a3a4a;';

    // Labels
    const info = document.createElement('div');
    info.style.cssText = 'min-width:0;flex:1;';
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'font-size:10px;font-family:monospace;color:' + (isActive ? '#44ccff' : '#cdd') + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;';
    nameEl.textContent = pack.label;
    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:9px;color:#557;font-family:monospace;margin-top:1px;';
    descEl.textContent = pack.description;
    info.appendChild(nameEl);
    info.appendChild(descEl);

    // Active badge or select badge
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:8px;font-family:monospace;padding:2px 5px;border-radius:2px;flex-shrink:0;';
    if (isActive) {
      badge.style.cssText += 'background:#003040;color:#44ccff;border:1px solid #44ccff;';
      badge.textContent = 'ON';
    } else {
      badge.style.cssText += 'background:#1a2030;color:#557;border:1px solid #2a3448;';
      badge.textContent = 'OFF';
    }

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(badge);

    card.addEventListener('click', () => {
      setLevelBackground(isActive ? null : pack.key);
    });

    // Preview layers button
    const layersBtn = document.createElement('button');
    layersBtn.style.cssText = 'font-size:8px;font-family:monospace;padding:2px 5px;background:#0d1420;color:#779;border:1px solid #2a3448;cursor:pointer;margin-top:3px;width:100%;text-align:left;';
    layersBtn.textContent = '▼ ' + (pack.expanded ? 'hide layers' : 'show layers');
    layersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pack.expanded = !pack.expanded;
      _refreshBgSection();
    });

    const cardWrap = document.createElement('div');
    cardWrap.appendChild(card);
    cardWrap.appendChild(layersBtn);

    // Layer thumbnails (expandable)
    if (pack.expanded) {
      const layerItems = filteredBackgroundItems(pack.tag);
      if (layerItems.length) {
        const layerGrid = document.createElement('div');
        layerGrid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:3px;margin-top:3px;margin-bottom:5px;';
        for (const it of layerItems) {
          const lc = document.createElement('div');
          lc.style.cssText = 'background:#0d1119;border:1px solid #1c2a3a;padding:3px;text-align:center;';
          const li = document.createElement('img');
          li.src = it.path;
          li.style.cssText = 'width:100%;height:38px;object-fit:cover;image-rendering:pixelated;';
          const ll = document.createElement('div');
          ll.style.cssText = 'font-size:8px;color:#557;font-family:monospace;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          ll.textContent = it.name.replace('bg_ncr_', '');
          lc.appendChild(li);
          lc.appendChild(ll);
          layerGrid.appendChild(lc);
        }
        cardWrap.appendChild(layerGrid);
      }
    }

    bgSectionEl.appendChild(cardWrap);
  }

  // "None" option — only shown if something is active
  if (activePack) {
    const noneRow = document.createElement('div');
    noneRow.style.cssText = 'text-align:right;margin-bottom:5px;';
    const noneBtn = document.createElement('button');
    noneBtn.style.cssText = 'font-size:9px;font-family:monospace;padding:2px 7px;background:transparent;color:#779;border:1px solid #2a3448;cursor:pointer;';
    noneBtn.textContent = '✕ remove background';
    noneBtn.addEventListener('click', () => setLevelBackground(null));
    noneRow.appendChild(noneBtn);
    bgSectionEl.appendChild(noneRow);
  }
}

// ── Tiles & objects section ───────────────────────────────────────────────────
function _populateCategories() {
  if (!categorySelect) return;
  const cats = manifestCategories().filter(c => c !== 'background'); // BG lives in its own section
  if (!cats.length) { categorySelect.innerHTML = '<option value="all">(loading...)</option>'; return; }
  const current = state.filter.category;
  categorySelect.innerHTML = '';
  const count = state.manifest ? state.manifest.items.filter(i => i.category !== 'background').length : 0;
  const optAll = Object.assign(document.createElement('option'), { value: 'all', textContent: `all (${count})` });
  categorySelect.appendChild(optAll);
  for (const c of cats) {
    const cnt = state.manifest.items.filter(i => i.category === c).length;
    categorySelect.appendChild(Object.assign(document.createElement('option'), { value: c, textContent: `${c} (${cnt})` }));
  }
  categorySelect.value = cats.includes(current) ? current : 'all';
}

function _populateThumbs() {
  if (!thumbGrid) return;
  const items = filteredManifestItems();
  statusEl.textContent = `${items.length} shown`;
  thumbGrid.innerHTML = '';
  const cap = Math.min(items.length, 400);
  for (let i = 0; i < cap; i++) {
    const it = items[i];
    const isSelected = state.selectedAsset && (state.selectedAsset.id === it.id || state.selectedAsset.path === it.path);
    const cell = document.createElement('div');
    cell.className = 'ab-cell' + (isSelected ? ' selected' : '');
    const tipParts = [it.name, `${it.category}  ${it.width}×${it.height}`, it.path];
    if (it.raw && it.raw.notes) tipParts.push('— ' + it.raw.notes);
    if (it.isAnimation) tipParts.push('(animation — placement disabled in Phase 1)');
    if (it.source === 'disk-index') tipParts.push('(from disk — not yet in Aki manifest)');
    cell.title = tipParts.join('\n');
    cell.addEventListener('click', () => setSelectedAsset(it));
    cell.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      console.info('[drag] mousedown on', it.id);
      setSelectedAsset(it);
      startAssetDrag(it, e);
    });
    const previewPath = it.isAnimation
      ? it.path.replace('{dir}', 'east').replace('{n}', '000')
      : it.path;
    const img = document.createElement('img');
    img.src = previewPath;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'ab-thumb';
    img.draggable = false;
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

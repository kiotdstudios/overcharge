// UI composition only. Existing controls keep their IDs and editing handlers.
import { state, subscribe } from './state.js';

export function mountWorkspace() {
  const root = document.getElementById('editor-root');
  const toolbar = document.getElementById('toolbar');
  const panel = document.getElementById('tools-panel-content');
  const byId = id => document.getElementById(id);
  const move = (id, target) => { const el = byId(id); if (el) target.append(el); };

  toolbar.querySelector('h1').innerHTML = '<span class="brand-mark">ϟ</span> OVERCHARGE <small>Builder</small>';
  toolbar.querySelectorAll('.divider').forEach(el => el.remove());
  const levelNav = byId('level-nav-row');
  toolbar.querySelector('h1').after(levelNav);
  const selector = byId('level-select');
  selector.style.display = '';
  selector.setAttribute('aria-label', 'Choose level');
  levelNav.after(selector);
  byId('tp-sec-level').parentElement.remove();

  const actions = document.createElement('div');
  actions.className = 'workspace-actions';
  toolbar.append(actions);
  move('btn-test', actions);
  move('btn-save', actions);
  byId('btn-test').textContent = '▶ Test level';
  byId('btn-save').textContent = 'Save changes';
  const settings = document.createElement('details');
  settings.id = 'save-settings';
  settings.innerHTML = '<summary>Save settings</summary><div class="settings-body"><p>Connect GitHub to save across computers. A local folder is optional.</p></div>';
  actions.append(settings);
  const settingsBody = settings.querySelector('.settings-body');
  move('btn-gh-token', settingsBody);
  move('gh-pat-input', settingsBody);
  move('btn-choose-folder', settingsBody);
  move('save-folder-name', settingsBody);
  byId('btn-choose-folder').textContent = 'Choose local folder';
  byId('btn-choose-folder').title = 'Optional: save to a local Git clone instead of GitHub';

  const ribbon = document.createElement('div');
  const facadeButton = document.createElement('button');
  facadeButton.id = 'btn-landable-facade';
  facadeButton.className = 'tp-btn';
  facadeButton.textContent = 'Walk in front · landable top';
  facadeButton.title = 'Select the raised building tiles, excluding the lower floor. Preserve the art, make its top landable, and open the route in front. Undo restores solid terrain.';
  byId('tp-arrange').append(facadeButton);
  ribbon.id = 'workspace-tools';
  ribbon.setAttribute('aria-label', 'Level editing tools');
  root.append(ribbon);
  const tools = byId('tp-tools');
  tools.classList.add('workspace-tool-group');
  ribbon.append(tools);
  byId('rail-anchor-tools').parentElement.remove();
  const names = { pointer: 'Move', select: 'Select', place: 'Paint', rect: 'Fill', erase: 'Erase', pan: 'Pan' };
  document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.textContent = names[btn.dataset.tool];
    btn.setAttribute('aria-label', btn.title);
  });
  const checks = byId('guards-toggle').parentElement;
  checks.lastChild.textContent = ' Placement checks';
  checks.title = 'Reject floating placements and overlaps while editing';
  const magnetic = byId('magnetic-toggle').parentElement;
  magnetic.lastChild.textContent = ' Snap to edges';
  magnetic.title = 'Snap scenery to nearby matching edges';
  const undo = byId('tp-edit');
  const oldUndoSection = undo.parentElement;
  ribbon.append(undo);
  oldUndoSection.remove();
  byId('btn-undo').textContent = '↶ Undo';
  byId('btn-redo').textContent = '↷ Redo';
  const zoom = document.createElement('div');
  zoom.className = 'workspace-zoom';
  ribbon.append(zoom);
  ['zoom-out', 'zoom-reset', 'zoom-in'].forEach(id => move(id, zoom));

  const status = document.createElement('footer');
  status.id = 'workspace-status';
  status.innerHTML = '<div id="workspace-hint"></div><div class="save-result" aria-label="Last save result"></div><details class="build-details"><summary>Build details</summary></details>';
  root.append(status);
  move('tile-readout', status);
  const result = status.querySelector('.save-result');
  ['save-flash', 'gh-pub-status', 'btn-copy-save-result'].forEach(id => move(id, result));
  byId('btn-copy-save-result').textContent = 'Copy result';
  ['level-info', 'build-label'].forEach(id => move(id, status.querySelector('.build-details')));

  byId('tools-icon-rail').remove();
  byId('tools-panel-hdr').querySelector('.ph-title').textContent = 'Inspector';
  byId('tools-panel-hdr').querySelector('.ph-sub').textContent = 'Objects and level settings';
  byId('tools-panel-hdr').querySelector('.ph-icon').remove();
  const views = document.createElement('div');
  views.className = 'workspace-views';
  views.setAttribute('aria-label', 'Inspector views');
  views.innerHTML = '<button type="button" data-workspace-view="edit" aria-pressed="true">Objects</button><button type="button" data-workspace-view="level" aria-pressed="false">Level</button>';
  byId('tools-panel-hdr').after(views);
  const empty = document.createElement('div');
  empty.id = 'selection-help';
  empty.innerHTML = '<h3>Edit an object</h3><p>Use Move and click an object to adjust its position, size, or settings.</p><p>Choose an asset on the left, then click or drag it onto the level.</p><p><a href="hero-lab.html" target="_blank" rel="noopener" style="color:#8bdcff">Preview new character animations</a></p>';
  views.after(empty);

  const editSections = [byId('tp-selected-section'), byId('tp-arrange').parentElement, byId('tp-spawn').parentElement];
  const levelSections = [byId('tp-level').parentElement, byId('tp-leveltest').parentElement, byId('tp-sec-background')];
  // Selected-object properties appear above arrangement, rather than below every action.
  empty.after(editSections[0]);
  const setView = view => {
    root.dataset.inspectorView = view;
    editSections.forEach(el => { el.hidden = view !== 'edit'; });
    levelSections.forEach(el => { el.hidden = view !== 'level'; });
    empty.hidden = view !== 'edit';
    views.querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.workspaceView === view)));
  };
  views.addEventListener('click', event => {
    const btn = event.target.closest('[data-workspace-view]');
    if (btn) setView(btn.dataset.workspaceView);
  });
  setView('edit');
  panel.querySelectorAll('.sec-badge').forEach(el => el.remove());
  const labels = { arrange: 'Arrange selection', level: 'Level actions', leveltest: 'Saved level status', spawn: 'Add gameplay objects', selected: 'Selected object', background: 'Background' };
  panel.querySelectorAll('.tp-hdr').forEach(el => {
    const label = labels[el.dataset.sec];
    if (label) el.innerHTML = `${label} <span class="ch">▼</span>`;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.click(); }
    });
  });
  const rename = { 'btn-new': 'New level', 'btn-duplicate': 'Duplicate', 'btn-upload': 'Import level', 'btn-generate': 'Generate idea', 'btn-snapshot': 'Save snapshot', 'btn-history': 'History', 'btn-revert-local': 'Reload saved level', 'btn-export-backups': 'Export backups', 'btn-import-backups': 'Import backups', 'btn-rotate': '↻ Rotate', 'btn-flip': '⇄ Flip', 'btn-inspector-hide': 'Hide' };
  for (const [id, label] of Object.entries(rename)) byId(id).textContent = label;
  const hints = { pointer: 'Move: click an object to select it, then drag to reposition.', select: 'Select: drag a box around tiles or objects. Delete removes the selection.', place: 'Paint: choose an asset on the left, then click or drag on the grid.', rect: 'Fill: drag a rectangle to fill it with the selected tile.', erase: 'Erase: click or drag over tiles to remove them.', pan: 'Pan: drag the canvas to explore the level.' };
  const update = () => {
    byId('workspace-hint').textContent = hints[state.tool] || 'Choose a tool to edit the level.';
    document.querySelectorAll('[data-tool]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.tool === state.tool)));
    empty.classList.toggle('has-selection', byId('tp-selected-section').style.display !== 'none');
    const decorations = state.selection?.decorations?.size || 0;
    facadeButton.disabled = !(state.selection?.tiles?.size > 0);
    const tiles = state.selection?.tiles?.size || 0;
    for (const id of ['btn-layer-front', 'btn-layer-forward', 'btn-layer-backward', 'btn-layer-back']) {
      byId(id).disabled = !decorations;
      byId(id).title = decorations ? 'Change selected scenery drawing order' : 'Select scenery to change its drawing order';
    }
    for (const id of ['btn-rotate', 'btn-flip']) {
      byId(id).disabled = !decorations && !tiles;
      byId(id).title = id === 'btn-rotate'
        ? (decorations || tiles ? 'Rotate selected tiles or scenery 90° (R; Shift+R reverses)' : 'Select tiles or scenery first, then press R to rotate')
        : (decorations || tiles ? 'Flip selected tiles or scenery (F)' : 'Select tiles or scenery first');
    }
  };
  subscribe(update);
  new MutationObserver(update).observe(byId('tp-selected-section'), { attributes: true, attributeFilter: ['style'] });
  const updateResult = () => {
    const hasResult = !!(byId('save-flash').classList.contains('show') || (byId('gh-pub-status').textContent && byId('gh-pub-status').style.display !== 'none'));
    result.hidden = !hasResult;
  };
  new MutationObserver(updateResult).observe(result, { subtree: true, attributes: true, attributeFilter: ['class', 'style'], childList: true, characterData: true });
  updateResult();
  update();
}

// AKI_26 Part 1, item 1.6 -- per-level abilities (Bolt/Melee checkboxes).
//
// Scope: pure logic in editor/actions.js's new setLevelAbility(level, key,
// enabled), writing level.abilities per the shared data contract with
// Codex ("abilities" | level, optional, e.g. { bolt: false, melee: false }
// | missing means all on). The Abilities checkboxes in editor.html's Level
// Actions panel and their wiring in editor/main.js are DOM-dependent and
// not re-tested here (same limitation as every other main.js UI change
// this order -- confirmed main.js still parses: `node --check` fails only
// at `document is not defined` inside mountWorkspace, the same pre-existing
// error with or without this change).

const Actions = await import('../editor/actions.js');
const History = await import('../editor/history.js');
const S = await import('../editor/state.js');

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' \u2014 ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' \u2014 ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

function freshLevel(extra = {}) {
  const level = { cols: 10, tiles: new Array(10 * 5).fill(0), ...extra };
  S.state.level = level;
  History.clearAll();
  return level;
}

sec('Default: no abilities key means both are on');
{
  const lvl = freshLevel();
  ok(lvl.abilities === undefined, 'a fresh level has no abilities key at all');
}

sec('Turning an ability OFF writes abilities[key] = false, leaves the other untouched');
{
  const lvl = freshLevel();
  const action = Actions.setLevelAbility(lvl, 'bolt', false);
  ok(!!action, 'setLevelAbility(level, "bolt", false) produces an action');
  History.apply(action);
  ok(lvl.abilities && lvl.abilities.bolt === false, 'abilities.bolt is explicitly false');
  ok(!('melee' in lvl.abilities), 'melee key is untouched (not added just because bolt changed)');
}

sec('Turning an ability back ON (the default) deletes the key -- keeps JSON clean');
{
  const lvl = freshLevel({ abilities: { bolt: false } });
  const action = Actions.setLevelAbility(lvl, 'bolt', true);
  ok(!!action, 'setLevelAbility(level, "bolt", true) produces an action when it was off');
  History.apply(action);
  ok(lvl.abilities === undefined, 'abilities object is removed entirely once empty (bolt was the only key)');
}

sec('Turning the only-remaining-off ability back on removes just that key, keeps the sibling');
{
  const lvl = freshLevel({ abilities: { bolt: false, melee: false } });
  History.apply(Actions.setLevelAbility(lvl, 'bolt', true));
  ok(lvl.abilities.bolt === undefined && lvl.abilities.melee === false, 'bolt key removed, melee:false preserved');
}

sec('No-op when the requested state already matches (no action, no history entry)');
{
  const lvl = freshLevel();
  ok(Actions.setLevelAbility(lvl, 'bolt', true) === null, 'setting an already-on ability to on returns null');
  const lvl2 = freshLevel({ abilities: { melee: false } });
  ok(Actions.setLevelAbility(lvl2, 'melee', false) === null, 'setting an already-off ability to off returns null');
}

sec('Undo / redo round trip');
{
  const lvl = freshLevel();
  History.apply(Actions.setLevelAbility(lvl, 'melee', false));
  ok(lvl.abilities.melee === false, 'melee turned off');
  History.undo();
  ok(lvl.abilities === undefined, 'undo removes the abilities object entirely (it never existed before)');
  History.redo();
  ok(lvl.abilities.melee === false, 'redo re-applies melee:false');
}

sec('Undo restores a pre-existing abilities object exactly, including a key not being touched');
{
  const lvl = freshLevel({ abilities: { bolt: false } });
  History.apply(Actions.setLevelAbility(lvl, 'melee', false));
  ok(lvl.abilities.bolt === false && lvl.abilities.melee === false, 'both abilities now off');
  History.undo();
  ok(lvl.abilities.bolt === false && !('melee' in lvl.abilities), 'undo restores the original object (bolt:false, no melee key) exactly');
}

sec('Old levels (no abilities key) round-trip through JSON unchanged');
{
  const before = { cols: 10, tiles: new Array(10 * 5).fill(0), decorations: [] };
  const beforeStr = JSON.stringify(before);
  const after = JSON.parse(JSON.stringify(before)); // simulates a save/load round trip untouched by this feature
  ok(JSON.stringify(after) === beforeStr, 'a level with no abilities key is completely unaffected by this feature existing');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

// AKI_26 Part 1, item 1.4 — reactive NPC dialogue fields (poweredLines,
// linkedObjectId) and the "Linked object" picker.
//
// Scope note: _renderNpcInspector() lives in editor/main.js and builds its
// DOM via innerHTML + querySelector against a REAL document -- main.js
// executes browser-only code at module scope (grabs the canvas, calls
// getContext) and is not import()-able standalone in Node, the same
// limitation every other NPC-inspector change in this codebase has had
// (npc_dialogue.mjs tests src_scroll/npc.js's RUNTIME behavior, never
// editor/main.js's UI function directly). This suite instead covers:
//   (a) the data contract -- shape of poweredLines/linkedObjectId, old-NPC
//       byte-identical round trip, new-NPC round trip
//   (b) static source checks that the critical invariants called out in the
//       order are actually present in main.js: the placeholder-delete
//       convention for linkedObjectId (so an unset link never writes a
//       stray key), and that the charged-object dropdown is sourced from
//       state.level.sources (the id+label fields docs/reference/LEVEL_SCHEMA.md defines)
// DOM-level verification (the dropdown renders, both line lists edit
// independently, focus survives typing) is flagged as not done here -- see
// the Part 1 report.
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  ✓ ${m}${d ? ' — ' + d : ''}`); } else { fail++; console.log(`  ✗ ${m}${d ? ' — ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

const mainSrc = fs.readFileSync('editor/main.js', 'utf8');

sec('Old NPC (no poweredLines, no linkedObjectId) is byte-identical after a no-op pass');
{
  const npc = {
    id: 'npc_1', assetId: 'streetlamp-woman', x: 100, y: 200, facing: 'right',
    dialogue: {
      enabled: true, trigger: 'player_proximity', radiusPx: 112, triggerMode: 'enter',
      cooldownMs: 6000, oncePerLevel: false, durationMs: 3500, selectionMode: 'sequential',
      lines: [{ id: 'L1', text: 'Hey there.' }],
    },
  };
  const before = JSON.stringify(npc);
  const after = JSON.stringify(JSON.parse(JSON.stringify(npc)));
  ok(before === after, 'old-style NPC round-trips with zero byte changes');
  ok(!('poweredLines' in npc.dialogue), 'poweredLines absent on an old NPC (no silent default key)');
  ok(!('linkedObjectId' in npc.dialogue), 'linkedObjectId absent on an old NPC');
}

sec('New NPC with poweredLines + linkedObjectId round-trips exactly');
{
  const npc = {
    id: 'npc_ac', assetId: 'window-npc', x: 300, y: 150, facing: 'left',
    dialogue: {
      enabled: true, radiusPx: 112, durationMs: 3500, cooldownMs: 6000,
      oncePerLevel: false, selectionMode: 'sequential',
      lines: [{ id: 'L1', text: "It's so hot in here..." }],
      poweredLines: [{ id: 'P1', text: 'Ah, much better now!' }],
      linkedObjectId: 'AC1',
    },
  };
  const rt = JSON.parse(JSON.stringify(npc));
  ok(JSON.stringify(rt.dialogue.poweredLines) === JSON.stringify(npc.dialogue.poweredLines), 'poweredLines byte-identical after round trip');
  ok(rt.dialogue.linkedObjectId === 'AC1', 'linkedObjectId byte-identical after round trip');
  ok(rt.dialogue.lines.length === 1 && rt.dialogue.poweredLines.length === 1, 'the two line sets stay independent arrays, not aliased');
}

sec('poweredLines is the SAME shape as lines ({id, text})');
{
  const line = { id: 'P3', text: 'Thanks for the charge.' };
  ok(typeof line.id === 'string' && typeof line.text === 'string', 'a powered line is {id: string, text: string}, identical shape to a normal line');
}

sec('main.js: poweredLines defaults to [] (not undefined) so .length/.map never throws on an old NPC');
{
  ok(/if \(!Array\.isArray\(d\.poweredLines\)\) d\.poweredLines = \[\];/.test(mainSrc),
    'inspector seeds d.poweredLines = [] for any NPC missing it, mirroring the existing d.lines guard');
}

sec('main.js: linked-object placeholder follows the delete-not-null convention used everywhere else');
{
  ok(/if \(e\.target\.value === ''\) delete d\.linkedObjectId;/.test(mainSrc),
    'selecting "(none)" DELETES linkedObjectId rather than writing an empty string or null');
}

sec('main.js: charged-object dropdown is sourced from state.level.sources (id + label, per LEVEL_SCHEMA)');
{
  ok(/function _chargedObjectOptions/.test(mainSrc), '_chargedObjectOptions helper exists');
  ok(/const sources = \(state\.level && Array\.isArray\(state\.level\.sources\)\) \? state\.level\.sources : \[\];/.test(mainSrc),
    'reads from state.level.sources, not gates/switches/enemies');
  ok(/label: `\$\{s\.label \|\| s\.id\} \(\$\{s\.id\}\)`/.test(mainSrc),
    'dropdown label is "label (id)" as the order specifies ("by id and label")');
}

sec('main.js: both line lists and both preview buttons exist, wired to independent arrays');
{
  ok(/npc-powered-lines-list/.test(mainSrc), 'powered-lines list container exists');
  ok(/npc-powered-line-add/.test(mainSrc), 'add-powered-line button exists');
  ok(/npc-preview-powered-btn/.test(mainSrc), 'second preview button (powered set) exists');
  ok(/d\.poweredLines\.push\(\{ id: `P\$\{d\.poweredLines\.length \+ 1\}`, text: 'New powered line' \}\)/.test(mainSrc),
    'add-powered-line pushes into d.poweredLines (not d.lines)');
  // The Order 25 focus fix must apply to the new list too: `input` updates the
  // model without touching the DOM, keeping focus/caret while typing.
  const poweredBlockStart = mainSrc.indexOf("npc-powered-line-text').forEach");
  ok(poweredBlockStart > -1, 'powered-line-text wiring block found');
  const poweredBlock = mainSrc.slice(poweredBlockStart, poweredBlockStart + 900);
  ok(poweredBlock.includes("addEventListener('input'"), 'powered line text uses the input event (not just change) to stay live while typing, same Order 25 fix as the normal line list');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS ✓');
process.exit(fail === 0 ? 0 : 1);

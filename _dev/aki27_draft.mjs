import fs from 'node:fs';
import assert from 'node:assert/strict';
const read = name => JSON.parse(fs.readFileSync(`src_scroll/levels/${name}.json`, 'utf8'));
const original = read('level1'), draft = read('level1_vertical');
let pass = 0;
function check(condition, message) { assert.ok(condition, message); console.log('  ✓ ' + message); pass++; }
check(draft.cols === 100 && draft.rows === 34 && draft.tiles.length === 3400, '100 x 34 vertical geometry');
for (const key of ['tiles','tileRotations','tileFlips']) {
  const a = original[key] || [];
  const b = draft[key] || [];
  check(b.length === 3400 && (key === 'tiles' ? a.every((v,i) => v === 0 || b[i+1600] === v) : JSON.stringify(b.slice(1600)) === JSON.stringify(a)), `${key} preserves old cells after adding decks`);
}
check(draft.playerStart.x === original.playerStart.x && draft.playerStart.y === original.playerStart.y + 512, 'spawn shifted up with ground');
const oldLamps = original.sources.slice(0,3), newLamps = draft.sources.slice(0,3);
check(newLamps.every((s,i) => s.charge === oldLamps[i].charge && s.y === oldLamps[i].y + 512) && newLamps.reduce((t,s)=>t+s.charge,0) === 12, 'three authored lamps retained, 12 charge');
check(draft.sources.filter(s => !s.uncharged).reduce((t,s)=>t+s.charge,0) === 12, 'only 12 initially available source charge');
check(['src_vending','src_fusebox','src_shutter'].every(id => draft.sources.some(s => s.id === id && s.uncharged && s.charge === 2)), 'new spending props start uncharged, capacity two');
check(draft.checkpoints.length === 3, 'three checkpoints');
check(draft.gates.some(g => g.isExit && g.required === 8 && g.y < draft.playerStart.y - 500), 'cost-eight exit on upper roof');
const ladders = draft.decorations.filter(d => /ladder\.png$/.test(d.src || ''));
check(ladders.length >= 4 && ladders.every(d => d.src === 'assets/objects/night-city-props/ladder/ladder.png'), 'four climbable exact-path ladders');
check(draft.platforms.some(p => p.kind === 'charge-platform' && p.charge === 2 && p.path?.length === 2 && p.path[0].y - p.path[1].y === 256), 'lift authored with 8-tile vertical path');
check(!fs.readFileSync('src_scroll/levels/levels.json','utf8').includes('level1_vertical'), 'draft excluded from progression manifest');
const main = fs.readFileSync('src_scroll/main.js','utf8'), builder = fs.readFileSync('editor/main.js','utf8'), save = fs.readFileSync('editor/persistence.js','utf8');
check(main.includes("draftParam === 'level1_vertical'") && builder.includes("_draftRequested ? DRAFT_LEVEL_URL"), 'game and Builder select named draft only on explicit URL');
check(save.includes("state.levelPath === 'src_scroll/levels/level1_vertical.json'") && save.includes('Review-only vertical draft: publishing'), 'Builder local and GitHub save paths reject draft overwrite');
// Import only the exported analyser; the suite footer calls process.exit() on import.
const analyserSource = fs.readFileSync('_dev/completability.mjs','utf8').split('// ── run over the shipped manifest')[0];
const { analyse } = await import('data:text/javascript,' + encodeURIComponent(analyserSource));
const analysis = analyse(draft);
// completability.mjs counts source capacities even when uncharged:true, so
// its 21/8 margin is optimistic; use the real starting source budget instead.
const initiallyCharged = draft.sources.filter(s => !s.uncharged).reduce((n,s)=>n+s.charge,0);
check(initiallyCharged === 12 && initiallyCharged - 8 === 4, 'real starting charge 12 minus exit 8 leaves four (before optional spending)');
console.log('DRAFT_ANALYSIS', JSON.stringify({completable:analysis.completable,totalCharge:analysis.totalCharge,mandatory:analysis.mandatory,margin:analysis.margin,exitOK:analysis.exitOK,reasons:analysis.reasons}));
check(analysis.exitOK && analysis.margin >= 0, 'prover reports horizontal gate reachability (it counts uncharged capacities; NOT a vertical proof)');
console.log(`RESULTS: ${pass} passed, 0 failed`);

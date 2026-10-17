// easter_egg_card.mjs - finishing an Easter egg replaces the objective card (top right) for 8 s (Chief, 2026-10-16:
// "should be a card like the objective top right so objective would be replaced by the easter egg completion animation
// for at least 6 to 9 seconds").
import { Player, Level } from './support/headless.mjs';
import { drawHUD, showEasterEggCard, easterEggCardState, clearEasterEggCard } from '../src_scroll/ui.js';
import { createAchievements } from '../src_scroll/achievements.js';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);
const def = () => JSON.parse(fs.readFileSync(new URL('../src_scroll/levels/level1.json', import.meta.url), 'utf8'));
const mem = () => { const o = {}; return { getItem: k => o[k] ?? null, setItem: (k, v) => { o[k] = v; }, removeItem: k => { delete o[k]; } }; };

function recorder() {
  const texts = []; let calls = 0;
  const ctx = new Proxy({}, {
    get: (_, k) => {
      if (k === 'fillText' || k === 'strokeText') return s => { texts.push(String(s)); calls++; };
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (k === 'measureText') return s => ({ width: String(s).length * 6 });
      return () => { calls++; };
    },
    set: () => true,
  });
  return { ctx, texts, get calls() { return calls; } };
}
const level = new Level(def());
const player = new Player(500, 250);
const hud = t => { const r = recorder(); drawHUD(r.ctx, player, level, t); return r.texts; };

sec('THE OBJECTIVE WITHOUT AN EASTER EGG');
clearEasterEggCard();
ok(hud(100).includes('NEED TO POWER UP'), 'the objective card is shown', 'NEED TO POWER UP');
ok(!easterEggCardState(100).active, 'and no Easter egg card is active');

sec('THE EASTER EGG CARD REPLACES IT FOR 8 SECONDS');
showEasterEggCard({ title: 'GOOD NEIGHBOR', text: 'Restore power for the tenant.' }, 100);
const s0 = easterEggCardState(100);
ok(s0.active && s0.seconds === 8, 'the card lasts 8 seconds (Chief asked for 6 to 9)', `${s0.seconds} s`);
for (const dt of [1.0, 3.0, 6.0, 7.9]) {
  const tx = hud(100 + dt);
  ok(tx.includes('EASTER EGG COMPLETE') && tx.includes('GOOD NEIGHBOR') && tx.includes('Restore power for the tenant.') && !tx.includes('NEED TO POWER UP'),
    `at ${dt.toFixed(1)} s: the egg card is drawn and the objective is gone`);
}
ok(!easterEggCardState(108.1).active, 'after 8 s the card is over');
ok(hud(108.2).includes('NEED TO POWER UP') && !hud(108.3).includes('EASTER EGG COMPLETE'), 'and the objective card comes back');

sec('DURATION LIMITS AND RESET');
showEasterEggCard({ title: 'A', text: 'b' }, 0, 2);
ok(easterEggCardState(0).seconds === 6, 'asking for 2 s gives the 6 s minimum', `${easterEggCardState(0).seconds}`);
showEasterEggCard({ title: 'A', text: 'b' }, 0, 30);
ok(easterEggCardState(0).seconds === 9, 'asking for 30 s gives the 9 s maximum', `${easterEggCardState(0).seconds}`);
clearEasterEggCard();
ok(!easterEggCardState(1).active, 'clearEasterEggCard() ends it at once');

sec('THE ACHIEVEMENT SIDE');
{
  const store = mem();
  const ach = createAchievements({ storage: store, search: '' });
  ok(ach.unlock('good_neighbor'), 'GOOD NEIGHBOR unlocks');
  const shown = ach.update(0.016);
  ok(shown && shown.egg === true && shown.seconds === 8, 'it is flagged as an Easter egg that holds for 8 s');
  const r = recorder(); ach.draw(r.ctx, 960);
  ok(r.calls === 0, 'the small toast does not draw for an Easter egg (the card does)');
  ok(!ach.update(7) && ach.current, 'the queue waits while the card is up (7 s later it is still current)');
  ok(ach.has('good_neighbor') && !createAchievements({ storage: store, search: '' }).unlock('good_neighbor'), 'it stays earned and never unlocks twice');
  createAchievements({ storage: store, search: '?achievements=reset' });
  ok(createAchievements({ storage: store, search: '' }).unlock('good_neighbor'), '?achievements=reset forgets it so the egg can be tested again');
}

sec('TESTING BUILD: resetOnLoad forgets everything on every refresh');
{
  // Chief: "the achievement needs to reset each time i refresh until i
  // finish the game and publish it" — a tester's browser must start every
  // single page load with nothing earned, not just the first visit.
  const store = mem();
  ok(createAchievements({ storage: store, search: '', resetOnLoad: true }).unlock('good_neighbor'),
    'with resetOnLoad, a fresh instance unlocks it the first time, same as always');
  // Simulate a page refresh: a brand new createAchievements() call against
  // the SAME storage (localStorage survives a refresh; the module instance
  // does not) — without resetOnLoad this would already be earned (proven
  // right above by the plain '?achievements=reset' case), but WITH it the
  // instance must come up blank every time, exactly like the very first load.
  ok(!createAchievements({ storage: store, search: '', resetOnLoad: true }).has('good_neighbor'),
    'a second instance (simulated refresh) with resetOnLoad does NOT see it as already earned');
  ok(createAchievements({ storage: store, search: '', resetOnLoad: true }).unlock('good_neighbor'),
    'so it can unlock again on that "new" page load, visible to every tester');
  // The default (resetOnLoad omitted / false) is completely untouched — this
  // is the normal, permanent-persistence behavior every other test above
  // already relies on, and it must stay that way for the eventual real
  // release once Chief flips the flag back off in main.js.
  const storeB = mem();
  createAchievements({ storage: storeB, search: '' }).unlock('good_neighbor');
  ok(createAchievements({ storage: storeB, search: '' }).has('good_neighbor'),
    'without resetOnLoad (the default), a second instance still sees it earned - zero regression');
}

sec('WIRING');
{
  const mn = fs.readFileSync(new URL('../src_scroll/main.js', import.meta.url), 'utf8');
  const au = fs.readFileSync(new URL('../src_scroll/audio.js', import.meta.url), 'utf8');
  ok(/showEasterEggCard\(shown, t, shown\.seconds\)/.test(mn) && /sfx\.play\('egg-complete'\)/.test(mn), 'main.js shows the card and plays the fanfare when an egg unlocks');
  ok(/'egg-complete':\s*\(\) =>/.test(au), 'audio.js has the egg-complete fanfare');
  ok(/createAchievements\(\{\s*resetOnLoad:\s*_TESTING_RESET_ACHIEVEMENTS\s*\}\)/.test(mn),
    'main.js currently wires resetOnLoad through the _TESTING_RESET_ACHIEVEMENTS flag (remove this assertion once that flag is retired for the real release)');
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

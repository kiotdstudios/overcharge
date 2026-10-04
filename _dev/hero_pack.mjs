// Pack-selection regression suite for the hero-v6 migration.
//
// The browser lab suite (_dev/overcharge_lab.mjs) needs playwright, which is not
// installed in this clone. These checks cover the same change surface without a
// browser: pack geometry, frame paths, state aliases, anchor maths, the jump
// index scaling, and — the one that actually catches a broken pack — whether
// every file hero-v6 claims to have is really on disk.
//
//   node _dev/hero_pack.mjs

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// hero-sprites.js builds Image objects at module scope, so stub one that just
// records the src it was handed.
globalThis.Image = class { constructor() { this.src = ''; this.complete = true; this.naturalWidth = 1; this.naturalHeight = 1; } };

const { PlayerSprites, HERO_PACKS, HERO_STATES, DEFAULT_PACK } =
  await import('../src_scroll/hero-sprites.js');
const { heroFramePlacement, V3_FOOT_ANCHOR } =
  await import('../src_scroll/hero-render.js');

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  — ' + detail : '')); }
};
const eq = (name, got, want) => ok(name, got === want, 'got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
const near = (name, got, want, tol) =>
  ok(name, Math.abs(got - want) <= tol, 'got ' + got + ', want ' + want + ' +/- ' + tol);

// ── pack metadata ───────────────────────────────────────────────────
eq('default pack is still hero-v3', DEFAULT_PACK, 'hero-v3');
ok('hero-v3 pack exists', !!HERO_PACKS['hero-v3']);
ok('hero-v6 pack exists', !!HERO_PACKS['hero-v6']);
eq('v3 frame count', HERO_PACKS['hero-v3'].frames, 8);
eq('v6 frame count', HERO_PACKS['hero-v6'].frames, 16);
eq('v3 cell size', HERO_PACKS['hero-v3'].cell, 512);
eq('v6 cell size', HERO_PACKS['hero-v6'].cell, 128);
eq('v3 foot anchor', HERO_PACKS['hero-v3'].footAnchor, 496);
eq('v6 foot anchor', HERO_PACKS['hero-v6'].footAnchor, 126);

// ── frame paths and counts ──────────────────────────────────────────
const v3 = new PlayerSprites({ pack: 'hero-v3' });
const v6 = new PlayerSprites({ pack: 'hero-v6' });

eq('v3 walk has 8 frames', v3.get('walk', 'east').frames.length, 8);
eq('v6 walk has 16 frames', v6.get('walk', 'east').frames.length, 16);
ok('v3 walk points at hero-v3', v3.get('walk', 'east').frames[0].src.includes('assets/sprites/hero-v3/walk/east/frame_000.png'),
   v3.get('walk', 'east').frames[0].src);
ok('v6 walk points at hero-v6', v6.get('walk', 'east').frames[0].src.includes('assets/sprites/hero-v6/walk/east/frame_000.png'),
   v6.get('walk', 'east').frames[0].src);
ok('v6 frame 15 is addressed', v6.get('walk', 'east').frames[15].src.includes('frame_015.png'),
   v6.get('walk', 'east').frames[15].src);

// ── state aliases ───────────────────────────────────────────────────
// v6 named its attack states differently and has no grapple or ladder-down.
const aliasCases = [
  ['energy-strike', 'melee'],
  ['projectile-cast', 'cast'],
  ['grapple', 'jump'],
  ['ladder-down', 'ladder-up'],
];
for (const [canonical, folder] of aliasCases) {
  const src = v6.get(canonical, 'east').frames[0].src;
  ok('v6 maps ' + canonical + ' -> ' + folder, src.includes('/hero-v6/' + folder + '/east/'), src);
}
// v3 must NOT be aliased
ok('v3 leaves energy-strike alone',
   v3.get('energy-strike', 'east').frames[0].src.includes('/hero-v3/energy-strike/'),
   v3.get('energy-strike', 'east').frames[0].src);

// ── gait-v4 override stays v3-only ──────────────────────────────────
const v3gait = new PlayerSprites({ pack: 'hero-v3', gaitRoot: 'assets/sprites/hero-gait-v4' });
ok('gait-v4 still overrides v3 walk',
   v3gait.get('walk', 'east').frames[0].src.includes('hero-gait-v4/walk/east'),
   v3gait.get('walk', 'east').frames[0].src);
eq('gait-v4 walk is 7 frames', v3gait.get('walk', 'east').frames.length, 7);
ok('gait-v4 leaves v3 idle alone',
   v3gait.get('idle', 'east').frames[0].src.includes('hero-v3/idle/east'),
   v3gait.get('idle', 'east').frames[0].src);
const v6gait = new PlayerSprites({ pack: 'hero-v6', gaitRoot: 'assets/sprites/hero-gait-v4' });
ok('gait-v4 does NOT leak into v6',
   v6gait.get('walk', 'east').frames[0].src.includes('hero-v6/walk/east'),
   v6gait.get('walk', 'east').frames[0].src);
eq('v6 walk stays 16 frames under a gait root', v6gait.get('walk', 'east').frames.length, 16);

// ── fall / land, added with v6 ──────────────────────────────────────
ok('HERO_STATES has fall', !!HERO_STATES.fall);
ok('HERO_STATES has land', !!HERO_STATES.land);
ok('v6 fall loads its own clip', v6.get('fall', 'east').frames[0].src.includes('/hero-v6/fall/east/'),
   v6.get('fall', 'east').frames[0].src);
ok('v6 land loads its own clip', v6.get('land', 'east').frames[0].src.includes('/hero-v6/land/east/'),
   v6.get('land', 'east').frames[0].src);
ok('v3 fall stands in with jump (v3 has no fall folder)',
   v3.get('fall', 'east').frames[0].src.includes('/hero-v3/jump/east/'), v3.get('fall', 'east').frames[0].src);

// ── stand-in marking ────────────────────────────────────────────────
const { isStandIn } = await import('../src_scroll/hero-sprites.js');
ok('v6 grapple is a stand-in', isStandIn('hero-v6', 'grapple'));
ok('v6 ladder-down is a stand-in', isStandIn('hero-v6', 'ladder-down'));
ok('v6 melee rename is NOT a stand-in', !isStandIn('hero-v6', 'energy-strike'));
ok('v6 fall is NOT a stand-in', !isStandIn('hero-v6', 'fall'));
ok('v3 fall is a stand-in', isStandIn('hero-v3', 'fall'));
ok('v3 grapple is NOT a stand-in', !isStandIn('hero-v3', 'grapple'));
for (const pack of Object.keys(HERO_PACKS)) {
  for (const s of HERO_PACKS[pack].standIn) {
    ok(pack + ' stand-in ' + s + ' has an alias to play', !!HERO_PACKS[pack].alias[s]);
  }
}

// ── fps scales with frame count so clip DURATION is unchanged ───────
eq('v3 fps scale', v3.fpsScale, 1);
eq('v6 fps scale', v6.fpsScale, 2);
for (const st of ['ledge-climb', 'idle', 'death', 'energy-strike']) {
  const a3 = v3.get(st, 'east'), a6 = v6.get(st, 'east');
  near('v6 ' + st + ' lasts as long as v3', a6.frames.length / a6.fps, a3.frames.length / a3.fps, 1e-9);
}
// gait fps follows speed and must scale too, or the feet slide
const gait = (sp, state, speed) => { sp.update(0, true, true, false, state === 'run', false, false, speed); return sp._current.fps; };
const g3 = new PlayerSprites({ pack: 'hero-v3' }), g6 = new PlayerSprites({ pack: 'hero-v6' });
near('v6 walk fps is 2x v3 at the same speed', gait(g6, 'walk', 75), gait(g3, 'walk', 75) * 2, 1e-9);
near('v6 run fps is 2x v3 at the same speed', gait(g6, 'run', 150), gait(g3, 'run', 150) * 2, 1e-9);

// ── unknown pack falls back rather than throwing ────────────────────
const bogus = new PlayerSprites({ pack: 'hero-v99' });
eq('unknown pack falls back to default', bogus.pack, 'hero-v3');

// ── foot anchor maths ───────────────────────────────────────────────
const img = { naturalWidth: 128, naturalHeight: 128 };
near('v3 anchor constant', V3_FOOT_ANCHOR, 496 / 512, 1e-9);
const r3 = heroFramePlacement(img, 100, 200, 80);
eq('default anchor still places v3 at the old y', r3.y, Math.round(200 - 80 * 496 / 512));
const r6 = heroFramePlacement(img, 100, 200, 80, 126 / 128);
eq('v6 anchor places feet on the ground line', r6.y, Math.round(200 - 80 * 126 / 128));
ok('v6 sits lower in frame than v3 (bigger anchor)', r6.y < r3.y,
   'v6 y=' + r6.y + ' v3 y=' + r3.y);

// ── ledge hang agreement between packs ──────────────────────────────
const HERO_DRAW = 80;
const LEDGE_FRAME0_TOP = { 'hero-v3': 69, 'hero-v6': 20 };
const handAbove = p => HERO_DRAW * (HERO_PACKS[p].footAnchor - LEDGE_FRAME0_TOP[p]) / HERO_PACKS[p].cell;
near('v3 hands above feet', handAbove('hero-v3'), 66.72, 0.02);
near('v6 hands above feet', handAbove('hero-v6'), 66.25, 0.02);
near('packs agree on hang height within 1px', handAbove('hero-v6'), handAbove('hero-v3'), 1);

// ── jump index scaling ──────────────────────────────────────────────
// Rebuilt from the mapping in update(): slot is expressed against 8 frames.
const jumpSlot = vy => (vy < -220 ? 1 : vy < -50 ? 2 : vy < 50 ? 4 : 5);
const scaled = (vy, n) => Math.min(n - 1, Math.round(jumpSlot(vy) * n / 8));
for (const vy of [-430, -300, -100, 0, 200, 430]) {
  eq('jump slot unchanged at 8 frames (vy=' + vy + ')', scaled(vy, 8), jumpSlot(vy));
}
eq('jump rising maps into 16-frame pack', scaled(-430, 16), 2);
eq('jump apex maps into 16-frame pack', scaled(0, 16), 8);
eq('jump falling maps into 16-frame pack', scaled(430, 16), 10);
ok('16-frame jump uses the later arc, not just the first third', scaled(430, 16) > jumpSlot(430),
   'scaled=' + scaled(430, 16) + ' raw=' + jumpSlot(430));
for (const n of [8, 16]) for (const vy of [-430, 0, 430]) {
  ok('jump index in range (n=' + n + ', vy=' + vy + ')', scaled(vy, n) >= 0 && scaled(vy, n) < n);
}

// ── the pack really exists on disk ──────────────────────────────────
const v6dir = ROOT + '/assets/sprites/hero-v6';
ok('hero-v6 directory exists', existsSync(v6dir), v6dir);
if (existsSync(v6dir)) {
  const manifestPath = v6dir + '/manifest.json';
  ok('hero-v6 manifest exists', existsSync(manifestPath));
  const man = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
  if (man) {
    eq('manifest frame count', man.frameCount, 16);
    eq('manifest frame size', JSON.stringify(man.frameSize), JSON.stringify([128, 128]));
    eq('manifest foot anchor matches pack', man.footAnchor, HERO_PACKS['hero-v6'].footAnchor);
    eq('manifest directions', JSON.stringify(man.directions), JSON.stringify(['east', 'west']));
    ok('manifest palette is small', man.paletteColours > 0 && man.paletteColours <= 32,
       'colours=' + man.paletteColours);
  }

  // Every canonical state the animator can request must resolve to real files.
  for (const state of Object.keys(HERO_STATES)) {
    const folder = HERO_PACKS['hero-v6'].alias[state] || state;
    const dir = v6dir + '/' + folder;
    if (!existsSync(dir)) { ok('v6 has files for ' + state + ' (-> ' + folder + ')', false, dir + ' missing'); continue; }
    for (const facing of ['east', 'west']) {
      const fdir = dir + '/' + facing;
      const n = existsSync(fdir) ? readdirSync(fdir).filter(f => f.endsWith('.png')).length : 0;
      ok('v6 ' + state + '/' + facing + ' has 16 frames', n === 16, 'found ' + n);
    }
  }

  // Mirrored west must be byte-for-byte derivable, i.e. same count and size as east.
  const states = readdirSync(v6dir).filter(d => existsSync(v6dir + '/' + d + '/east'));
  eq('v6 state folder count', states.length, 16);
  for (const s of states) {
    const e = readdirSync(v6dir + '/' + s + '/east').filter(f => f.endsWith('.png')).sort();
    const w = readdirSync(v6dir + '/' + s + '/west').filter(f => f.endsWith('.png')).sort();
    ok('v6 ' + s + ' east/west frame names match', JSON.stringify(e) === JSON.stringify(w));
  }
}

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

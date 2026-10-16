// litter_front.mjs - street litter must stay ABOVE the rooftop tile and be the front-most world object
// (Chief, 2026-10-16: "litter cant go behind the street light ... most in front object ... sometimes it goes through the floor").
import assert from 'node:assert/strict';
import fs from 'node:fs';

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' - ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' - ' + d : ''}`); } };
const sec = t => console.log(`\n[ ${t} ]`);

globalThis.Image = class { complete = true; naturalWidth = 32; naturalHeight = 32; set src(v) { this._src = v; } };
const { StreetLitter } = await import('../src_scroll/street-litter.js');

// A recording 2D context that composes translate / rotate / scale and reports the lowest drawn pixel.
function recorder() {
  let m = [1, 0, 0, 1, 0, 0];
  const stack = [];
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  const r = { lowest: -1e9, draws: 0, order: [] };
  return Object.assign(r, {
    save() { stack.push(m.slice()); }, restore() { m = stack.pop(); },
    translate(x, y) { m = mul(m, [1, 0, 0, 1, x, y]); },
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); m = mul(m, [c, s, -s, c, 0, 0]); },
    scale(x, y) { m = mul(m, [x, 0, 0, y, 0, 0]); },
    fillRect() {}, set fillStyle(v) {}, set globalAlpha(v) {}, set imageSmoothingEnabled(v) {},
    drawImage(img, x, y, w, h) {
      r.draws++;
      for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        const wy = m[1] * px + m[3] * py + m[5];
        if (wy > r.lowest) r.lowest = wy;
      }
    },
  });
}

sec('NEVER BELOW THE ROOFTOP (every kind, every angle, every fold)');
{
  const GROUND = 320;                 // the top of the rooftop tile
  let worst = -1e9, tried = 0;
  for (let kind = 0; kind < 4; kind++) {
    for (let a = 0; a < 6.3; a += 0.05) {
      const lit = new StreetLitter();
      lit.pieces = [{ x: 1000, y: GROUND, row: 10, direction: 1, speed: 20, age: 1, kind, phase: 0, angle: a, lift: 0, done: false }];
      const ctx = recorder();
      lit.draw(ctx);
      tried++;
      if (ctx.lowest - GROUND > worst) worst = ctx.lowest - GROUND;
    }
  }
  ok(worst <= 0.0001, 'the lowest drawn pixel is never below the tile top', `${tried} poses, worst ${worst.toFixed(2)} px (<= 0 means above or on it)`);
  const lit = new StreetLitter();
  lit.pieces = [{ x: 1000, y: GROUND, row: 10, direction: 1, speed: 20, age: 1, kind: 0, phase: 0, angle: 0.7, lift: 6, done: false }];
  const ctx = recorder(); lit.draw(ctx);
  ok(ctx.lowest <= GROUND - 6 + 0.0001, 'a lifted piece stays lifted', `lowest ${ctx.lowest.toFixed(2)} vs ${GROUND - 6}`);
}

sec('FRONT-MOST: drawn after the hero, not inside the level layers');
{
  const lv = fs.readFileSync(new URL('../src_scroll/level.js', import.meta.url), 'utf8');
  const mn = fs.readFileSync(new URL('../src_scroll/main.js', import.meta.url), 'utf8');
  ok(!/this\.streetLitter\.draw\(ctx\);\s*\n\s*\n?\s*\/\/ 3\. Moving platforms/.test(lv) && !/drawDecorations\('front'\);\s*\n\s*this\.streetLitter\.draw/.test(lv), 'Level.draw no longer draws litter between the layers');
  ok(/drawLitter\(ctx\)\s*\{\s*this\.streetLitter\.draw\(ctx\);\s*\}/.test(lv), 'Level has drawLitter()');
  const iPlayer = mn.indexOf('player.draw(ctx);'), iLitter = mn.indexOf('level.drawLitter(ctx);'), iJuice = mn.indexOf('juice.draw(ctx);');
  ok(iPlayer > 0 && iLitter > iPlayer && iLitter > iJuice, 'main.js draws the litter after the hero and the juice', `player ${iPlayer}, juice ${iJuice}, litter ${iLitter}`);
}

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
if (fail === 0) console.log('ALL TESTS PASS \u2713');
process.exit(fail === 0 ? 0 : 1);

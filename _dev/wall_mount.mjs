// WALL-MOUNTED SOURCE PROPS
//
// Chief 2026-09-27: "i cant move the neon sign up; its like its locked to this one spot."
// It was locked. Every `source-prop` ran through the editor's _groundAt(), which pins an
// object to the nearest surface. Correct for a streetlight or vending machine, which
// stand on pavement; wrong for a sign, fuse box or camera, which bolt to a wall.
//
// This suite pins the split and the reach consequence, because the reach is the part that
// decides whether a wall prop is actually playable.
import fs from 'node:fs';

const R = process.cwd();
let pass = 0, fail = 0;
const ok = (c, label, detail = '') => {
  if (c) { pass++; console.log(`  \u2713 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? ' \u2014 ' + detail : ''}`); }
};
const sec = t => console.log(`\n[ ${t} ]`);

const m = JSON.parse(fs.readFileSync(`${R}/assets/ASSET_MANIFEST.json`, 'utf8'));
const arr = Array.isArray(m) ? m : Object.values(m).find(Array.isArray);
const byId = id => arr.find(a => a.id === id);

sec('which props mount on a wall, which stand on the ground');
for (const id of ['prop_ncp_neon_sign', 'prop_ncp_fuse_box', 'prop_ncp_security_camera']) {
  ok(byId(id)?.mount === 'wall', `${id} is wall-mounted`, byId(id)?.mount ?? 'no mount field');
}
for (const id of ['prop_ncp_streetlight', 'prop_ncp_vending_machine']) {
  ok(byId(id) && byId(id).mount === undefined, `${id} stays grounded — it stands on pavement`);
}

sec('the editor honours it, and does so from DATA not a hardcoded id list');
const em = fs.readFileSync(`${R}/editor/main.js`, 'utf8');
ok(/a\.mount === 'wall'/.test(em), 'placement reads `mount` off the asset');
ok(/wallMounted \? propPos\.y : _groundAt\(/.test(em),
   'wall props use fine Y placement; floor props initially ground');
ok(/if \(wallMounted\) obj\.mount = 'wall';/.test(em),
   'the flag is copied into the level object — the runtime never reads the manifest');
// Prop ids DO appear in editor/main.js, in the _propLabel display map ('NEON', 'CAM').
// That is fine and unrelated. What matters is that the mount DECISION is not keyed off an
// id, so adding a wall prop is a manifest edit and never an editor edit. Assert on the
// placement expression rather than on the file containing the string anywhere.
{
  const i = em.indexOf("kind === 'source-prop'");
  const branch = i >= 0 ? em.slice(i, i + 2000) : '';
  ok(branch.length > 0, 'found the source-prop placement branch');
  ok(!/prop_ncp_\w+/.test(branch),
     'the mount decision keys off `mount`, not a hardcoded prop id — new wall props need no editor change');
}

sec('the grounding assertion no longer calls a wall prop "floating"');
const pr = fs.readFileSync(`${R}/_dev/parity_regression.mjs`, 'utf8');
ok(/obj\.mount === 'wall'/.test(pr), 'parity_regression is mount-aware');
ok(/has pixel-aligned prop coordinates/.test(pr),
   'a powered prop is checked for pixel-aligned coordinates');

sec('REACH: can the player actually charge one? (the gameplay consequence)');
const c = fs.readFileSync(`${R}/src_scroll/constants.js`, 'utf8');
const num = k => { const x = c.match(new RegExp('export const ' + k + '\\s*=\\s*(-?[0-9.]+)')); return x ? +x[1] : null; };
const RAD = num('ABSORB_RADIUS'), PH = num('PLAYER_H'), TILE = num('TILE');
const JF = num('JUMP_FORCE'), G = num('GRAVITY');
const apex = (JF * JF) / (2 * G);
const standReach = RAD - PH / 2;              // player centre is PH/2 above its feet
const jumpReach  = RAD - PH / 2 + apex;
ok(RAD > 0, 'ABSORB_RADIUS is defined', String(RAD));
console.log(`    standing : ${standReach.toFixed(0)}px above head = ${(standReach / TILE).toFixed(1)} tiles`);
console.log(`    jumping  : ${jumpReach.toFixed(0)}px above head = ${(jumpReach / TILE).toFixed(1)} tiles (apex ${apex.toFixed(0)}px)`);
ok(standReach < TILE * 2,
   'a wall prop more than ~1 tile overhead is NOT chargeable from standing',
   `${(standReach / TILE).toFixed(1)} tiles — mount low, or expect the player to jump`);
ok(jumpReach > TILE * 3,
   'jumping extends reach to several tiles, so a high mount is still playable',
   `${(jumpReach / TILE).toFixed(1)} tiles`);

sec('absorb is radial, so height works at all');
const el = fs.readFileSync(`${R}/src_scroll/electricity.js`, 'utf8');
ok(/inRange\s*\(px,\s*py\)\s*\{\s*return dist\(/.test(el),
   'inRange is a radial distance check, not a same-row test — height is reachable');

console.log(`\nRESULTS: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

// AKI 27 TASK 3 — "default charges from one table".
//
// Order (docs/KIRO_ORDER_AKI_27.md): "When Codex adds CHARGE_TABLE to
// constants.js (CODEX 02 task 4), make the Builder palette and inspector
// defaults read it. Until then, use the numbers in section 3.9."
//
// CHARGE_TABLE is NOT in src_scroll/constants.js yet, so the Builder carries ONE
// interim fallback in editor/charge-defaults.js and adopts the shared table automatically
// (namespace import, so a missing export cannot break the module graph). This
// suite is what keeps the interim honest:
//   1. every number the Builder defaults to is a real row of the 3.9 table,
//      PARSED OUT OF THE DESIGN DOC, not restated here;
//   2. every charged thing the palette can place has a tier (nothing silently
//      falls through to the pre-order flat 4);
//   3. the shared table takes precedence and the dependency guard says so the
//      day CHARGE_TABLE lands;
//   4. nothing clamps, and no authored level number is touched (3.9 rule 2).
//
// Generator creation in editor/generator.js and editor/tools.js reads the same
// helper so newly created sources share the 3.9 default.
import fs from 'node:fs';
import path from 'node:path';

// ── DOM shim: editor/main.js is a browser bootstrap and touches the DOM at
// module scope. Same approach and same reason as _dev/module_parse.mjs.
globalThis.window = { addEventListener(){}, removeEventListener(){}, innerWidth:1600, innerHeight:900,
  devicePixelRatio:1, location:{ search:'' },
  localStorage:{ getItem:()=>null, setItem(){}, removeItem(){} },
  sessionStorage:{ getItem:()=>null, setItem(){} },
  matchMedia:()=>({ matches:false, addEventListener(){} }) };
globalThis.localStorage = window.localStorage; globalThis.sessionStorage = window.sessionStorage;
globalThis.location = window.location;
globalThis.Image = class { constructor(){ this.complete=true; this.naturalWidth=32; this.naturalHeight=32; } addEventListener(n,f){ if(n==='load') f&&f(); } };
const _ctx = () => new Proxy({}, { get:()=>()=>{}, set:()=>true });
const _el = () => new Proxy({
  getContext:_ctx, style:{}, dataset:{}, value:'', textContent:'', innerHTML:'',
  width:800, height:600, checked:false, disabled:false, files:[],
  classList:{ add(){}, remove(){}, toggle(){}, contains:()=>false },
  appendChild(){}, removeChild(){}, setAttribute(){}, removeAttribute(){},
  addEventListener(){}, removeEventListener(){}, remove(){}, focus(){}, blur(){}, click(){},
  getBoundingClientRect:()=>({ left:0, top:0, width:800, height:600, right:800, bottom:600 }),
  querySelector:()=>_el(), querySelectorAll:()=>[], closest:()=>null, insertAdjacentHTML(){},
  after(){}, before(){}, replaceWith(){}, append(){}, prepend(){},
  insertBefore(){}, insertAdjacentElement(){}, cloneNode:()=>_el(),
  replaceChildren(){}, replaceChild(){}, contains:()=>false, hasAttribute:()=>false,
  getAttribute:()=>null, scrollIntoView(){}, setSelectionRange(){}, select(){},
}, { get:(t,k)=> (k in t ? t[k] : (typeof k === 'string' && /^on/.test(k) ? null : _el())), set:()=>true });
globalThis.document = { getElementById:()=>_el(), querySelector:()=>_el(), querySelectorAll:()=>[],
  addEventListener(){}, removeEventListener(){},
  body:{ style:{}, appendChild(){}, classList:{ add(){}, remove(){} } }, createElement:()=>_el() };
globalThis.indexedDB = { open:()=>({ addEventListener(){} }) };
globalThis.fetch = async () => ({ ok:false, status:404, text:async()=>'', json:async()=>({}) });
globalThis.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
globalThis.MutationObserver = class { observe(){} disconnect(){} takeRecords(){ return []; } };
globalThis.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
globalThis.matchMedia = globalThis.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame || (() => 0);
globalThis.cancelAnimationFrame  = globalThis.cancelAnimationFrame  || (() => {});

let pass = 0, fail = 0, warn = 0;
const ok   = (c, m, d = '') => { if (c) { pass++; console.log(`  \u2713 ${m}${d ? ' \u2014 ' + d : ''}`); } else { fail++; console.log(`  \u2717 ${m}${d ? ' \u2014 ' + d : ''}`); } };
const note = (m, d = '') => { warn++; console.log(`  ! ${m}${d ? ' \u2014 ' + d : ''}`); };
const sec  = t => console.log(`\n[ ${t} ]`);

const R = process.cwd();
const mainSrc  = fs.readFileSync(path.join(R, 'editor/main.js'), 'utf8');
const helperSrc = fs.readFileSync(path.join(R, 'editor/charge-defaults.js'), 'utf8');
const constSrc = fs.readFileSync(path.join(R, 'src_scroll/constants.js'), 'utf8');
const designMd = fs.readFileSync(path.join(R, 'docs/GAME_DESIGN_V2.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(R, 'assets/ASSET_MANIFEST.json'), 'utf8'));

const M = await import('../editor/charge-defaults.js');
const {
  defaultChargeFor,
  AKI27_INTERIM_CHARGE_TABLE: TABLE,
  AKI27_CHARGE_KEY_BY_PALETTE: ALIAS,
  AKI27_MAX_OBJECT_CHARGE: MAX_OBJ,
  AKI27_UNKNOWN_KIND_CHARGE: FALLBACK,
} = M;

// ── Section 3.9, parsed out of the design doc ─────────────────────────────
// The expectations below are derived from the DOC, so a change to the table
// that nobody mirrored in the Builder fails here instead of shipping quietly.
sec('GAME_DESIGN_V2 section 3.9 parses');
const sec39 = designMd.split(/^### 3\.9 /m)[1]?.split(/^### 3\.10 /m)[0] || '';
const docRows = new Map();   // object name (lowercased) -> charge
for (const line of sec39.split('\n')) {
  const m = /^\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|\s*\*{0,2}(\d+)\*{0,2}\s*\|/.exec(line.trim());
  if (m && !/^object$/i.test(m[1].trim())) docRows.set(m[1].trim().toLowerCase(), Number(m[2]));
}
ok(sec39.length > 0, 'section 3.9 found in docs/GAME_DESIGN_V2.md');
ok(docRows.size === 12, 'all 12 object rows parsed from the 3.9 table', `${docRows.size} rows`);
const docCharges = new Set(docRows.values());
ok([...docCharges].every(v => [1,2,3,4,8,10].includes(v)),
   'every charge in the doc table is one of the 1/2/3/4/8/10 tiers', [...docCharges].sort((a,b)=>a-b).join(','));

// Doc row name -> the canonical key the Builder uses for that row.
const DOC_TO_CANON = {
  'security camera': 'security-camera',
  'vending machine': 'vending-machine',
  'fuse box': 'fuse-box',
  'small shop neon sign': 'small-neon-sign',
  'atm': 'atm',
  'roller shutter motor': 'shutter-motor',
  'charge platform (ferry, lift)': 'charge-platform',
  'ac / hvac unit': 'hvac',
  'streetlight': 'streetlight',
  'large neon sign, billboard': 'large-neon-sign',
  'generator': 'generator',
  'substation or transformer': 'substation',
};

sec('Interim table is exactly the 3.9 numbers (one row each)');
{
  for (const [docName, canon] of Object.entries(DOC_TO_CANON)) {
    const expected = docRows.get(docName);
    ok(expected != null, `3.9 still has a row for "${docName}"`);
    if (expected == null) continue;
    ok(TABLE[canon] === expected, `${canon} defaults to the doc's ${expected}`, `got ${TABLE[canon]}`);
  }
  const extra = Object.keys(TABLE).filter(k => !Object.values(DOC_TO_CANON).includes(k));
  ok(extra.length === 0, 'the Builder invents no tier the doc does not list', extra.join(',') || 'none');
  ok(Object.values(TABLE).every(v => Number.isFinite(v) && v >= 1 && v <= MAX_OBJ),
     `every interim value is 1..${MAX_OBJ} (3.9 rule 1)`);
  ok(MAX_OBJ === 10, 'MAX_OBJECT_CHARGE is 10', String(MAX_OBJ));
  ok(Object.isFrozen(TABLE), 'the table is frozen (no runtime mutation)');
}

// ── Palette: one expectation per placeable charged thing ──────────────────
sec('Palette defaults, every kind the Builder can place');
{
  const EXPECT = {
    'source':                     8,   // generator
    'electrical_generator':       8,
    'source-hvac':                4,   // AC / HVAC unit (round 15: 4)
    'source_hvac':                4,
    'charge-platform':            2,
    'night_city_charge_platform': 2,
    'prop_ncp_security_camera':   1,
    'prop_ncp_vending_machine':   2,
    'prop_ncp_atm_machine':       2,
    'prop_ncp_fuse_box':          4,   // round 15: fuse box is 4
    'prop_ncp_streetlight':       3,   // round 15: streetlight is 3
    'prop_ncp_neon_sign':         4,   // large sign / billboard tier
    'prop_ncp_tire_sign':         4,   // manifest: "Large literal neon tire wall sign"
    'prop_ncp_book_sign':         2,   // small shop sign tier
    'prop_ncp_plug_sign':         2,
  };
  for (const [key, want] of Object.entries(EXPECT)) {
    ok(defaultChargeFor(key) === want, `defaultChargeFor('${key}') is ${want}`, `got ${defaultChargeFor(key)}`);
  }
  for (const [key, canon] of Object.entries(ALIAS)) {
    ok(defaultChargeFor(key) === TABLE[canon], `'${key}' resolves through the table row '${canon}'`);
  }
  // Canonical names work directly too, so a caller may pass either spelling.
  for (const canon of Object.keys(TABLE)) {
    ok(defaultChargeFor(canon) === TABLE[canon], `canonical '${canon}' resolves to ${TABLE[canon]}`);
  }
}

sec('Nothing placeable falls through to the pre-order flat 4 by accident');
{
  const assets = (manifest.assets || []).filter(a => ['source', 'source-hvac', 'source-prop'].includes(a.spawnsKind));
  ok(assets.length >= 11, `${assets.length} source-spawning palette assets found in ASSET_MANIFEST.json`);
  for (const a of assets) {
    const covered = Object.prototype.hasOwnProperty.call(ALIAS, a.id);
    ok(covered, `palette asset '${a.id}' has a 3.9 tier`, covered ? `${defaultChargeFor(a.id)}` : 'UNTIERED — add a row');
  }
  const platform = (manifest.assets || []).find(a => a.spawnsKind === 'platform');
  ok(!!platform && defaultChargeFor('charge-platform') === 2, 'the charge platform keeps its built-at-2 number');
  ok(defaultChargeFor('prop_ncp_something_chief_adds_tomorrow') === FALLBACK,
     `an unknown kind keeps the Builder's previous behaviour (${FALLBACK}), it does not become 0 or NaN`);
  ok(FALLBACK === 4, 'the unknown-kind fallback is the pre-order 4', String(FALLBACK));
  ok(defaultChargeFor(undefined) === FALLBACK && defaultChargeFor(null) === FALLBACK && defaultChargeFor('') === FALLBACK,
     'a missing/empty key is survivable, never NaN');
}

// ── The shared table must win the moment Codex lands it ───────────────────
sec('CHARGE_TABLE dependency (CODEX 02 task 4)');
{
  const landed = /export\s+const\s+CHARGE_TABLE\b/.test(constSrc) || 'CHARGE_TABLE' in (await import('../src_scroll/constants.js'));
  if (!landed) {
    note('constants.js has no CHARGE_TABLE yet, so the interim 3.9 numbers are live (order: "Until then, use the numbers in section 3.9")');
  } else {
    const { CHARGE_TABLE } = await import('../src_scroll/constants.js');
    for (const [canon, v] of Object.entries(CHARGE_TABLE)) {
      if (Number.isFinite(v)) ok(defaultChargeFor(canon) === v, `shared CHARGE_TABLE['${canon}'] = ${v} wins over the interim value`, `got ${defaultChargeFor(canon)}`);
    }
    note('CHARGE_TABLE has landed: remove the interim fallback from editor/charge-defaults.js once aliases match its keys');
  }
  ok(/import \* as RUNTIME_CONSTANTS from '\.\.\/src_scroll\/constants\.js'/.test(helperSrc),
     'charge-defaults.js imports constants as a NAMESPACE, so a missing export cannot break the module graph');
  ok(!/import\s*\{[^}]*CHARGE_TABLE[^}]*\}\s*from/.test(helperSrc),
     'charge-defaults.js does not named-import CHARGE_TABLE before it exists');
  ok(/RUNTIME_CONSTANTS\.CHARGE_TABLE/.test(helperSrc), 'defaultChargeFor consults the shared table');
  const fn = defaultChargeFor.toString();
  ok(fn.indexOf('CHARGE_TABLE') < fn.indexOf('AKI27_INTERIM_CHARGE_TABLE'),
     'the shared table is consulted BEFORE the interim fallback');
}

// ── No clamping, no rewriting of authored numbers ─────────────────────────
sec('No clamping (3.9 rule 2: existing levels keep their authored numbers)');
{
  ok(!/Math\.(min|max)\([^)]*charge/i.test(mainSrc) && !/charge[^;\n]*Math\.(min|max)\(/.test(mainSrc),
     'main.js never clamps a charge value with Math.min/Math.max');
  ok(!/clamp\w*\([^)]*charge/i.test(mainSrc), 'main.js has no clamp() on charge');
  const chargeField = /\{\s*label:'charge',key:'charge',num:true,min:0\.01\s*\}/.test(mainSrc);
  ok(chargeField, "the charge-platform inspector field keeps min:0.01 and adds no max");
  ok(!/key:\s*'charge'[^}]*max:/.test(mainSrc), 'no max attribute is attached to any charge input');
  const fields = fs.readFileSync(path.join(R, 'editor/inspector-fields.js'), 'utf8');
  ok(!/max/.test(fields), 'the shared source field spec still has no max on Capacity');
  // Every call site is a NEW object, or guarded on an ABSENT value.
  const calls = [...mainSrc.matchAll(/^.*defaultChargeFor\(.*$/gm)].map(m => m[0]).filter(l => !/^\s*(\/\/|export function)/.test(l));
  ok(calls.length === 5, 'exactly 5 live defaultChargeFor call sites', `${calls.length}`);
  ok(calls.filter(l => /obj\s*=|obj\.charge|charge:/.test(l)).length === 4, '4 of them write a brand-new object on placement');
  ok(/el\.dataset\.key === 'kind' && ref\.kind === 'charge-platform' && ref\.charge == null/.test(mainSrc),
     "the inspector call site only fires when charge is ABSENT (never overwrites Chief's number)");
}

sec('Authored levels are untouched');
{
  const dir = path.join(R, 'src_scroll/levels');
  const levels = fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'levels.json');
  ok(levels.length > 0, `${levels.length} level files checked`, levels.join(', '));
  const l1 = JSON.parse(fs.readFileSync(path.join(dir, 'level1.json'), 'utf8'));
  const lamps = (l1.sources || []).filter(s => s.label === 'LAMP' || /streetlight/.test(s.sprite || ''));
  ok(lamps.length === 3, "Level 1 still has Chief's three street lamps", `${lamps.length}`);
  ok(lamps.every(s => s.charge === 3), 'each Level 1 lamp is authored at 3 (round 15, Chief)', lamps.map(s => s.charge).join(','));
  const lampTotal = lamps.reduce((a, s) => a + Number(s.charge), 0);
  ok(lampTotal === 9, 'the three lamps total 9 (round 15: lamps are 3)', String(lampTotal));
  const total = (l1.sources || []).reduce((a, s) => a + (Number(s.charge) || 0), 0);
  // 9 lamp + 4 for the tenant's AC unit (the 3.9 AC tier, round 15).
  // This is an AUTHORED total: placing nothing new must not move it.
  note('Level 1 authored source total (Chief edits this; reported, not asserted)', String(total));
  const ac = (l1.sources || []).find(s => s.kind === 'hvac' || s.label === 'HVAC');
  ok(!ac || ac.charge === 4, 'the tenant AC unit is authored at 4', ac ? String(ac.charge) : 'absent');
  for (const f of levels) {
    const L = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const gens = (L.sources || []).filter(s => s.label === 'GEN' && !s.kind);
    // A generator authored at 4 or 5 must STAY there: the table only moved the
    // default for new placements. This is the regression that a "fix up the old
    // numbers" shortcut would trip.
    for (const g of gens) ok([4, 5].includes(Number(g.charge)),
      `${f}: generator still authored at its pre-table number, not rewritten to the new default`, `charge ${g.charge}`);
    const over = (L.sources || []).filter(s => Number(s.charge) > MAX_OBJ);
    if (over.length) note(`${f}: ${over.length} authored source(s) above ${MAX_OBJ} — reported, never clamped (CODEX 02 owns the warning)`);
  }
}

sec('Additional source placement paths use the same helper');
{
  for (const f of ['editor/generator.js', 'editor/tools.js']) {
    const src = fs.readFileSync(path.join(R, f), 'utf8');
    const hits = [...src.matchAll(/charge:\s*(\d+(?:\.\d+)?)/g)].map(m => m[1]);
    ok(hits.length === 0 && src.includes("import { defaultChargeFor } from './charge-defaults.js'") && src.includes("charge: defaultChargeFor('generator')"), `${f} uses the shared Builder default for new generators`);
  }
}

console.log(`\n${pass} passed, ${fail} failed, ${warn} note(s)`);
process.exit(fail ? 1 : 0);

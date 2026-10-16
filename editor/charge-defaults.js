import * as RUNTIME_CONSTANTS from '../src_scroll/constants.js';

// -- AKI 27 Task 3: default charges from ONE table ------------------------
// GAME_DESIGN_V2 3.9 fixes the DEFAULT charge of a NEWLY PLACED object (tiers
// 1, 2, 3, 4, 8, 10). The shared table is CODEX 02 task 4 (CHARGE_TABLE in
// src_scroll/constants.js) and is NOT in the tree yet; order AKI 27 Task 3 says
// "Until then, use the numbers in section 3.9". So this is ONE interim fallback,
// Builder-local, read through a single function, and the shared table WINS over
// it as soon as it exists -- there is no second contract to reconcile later, and
// nothing here is a new shared export for the runtime to read.
//
// 3.9 rule 2: existing levels keep their authored numbers. These values are only
// ever written into an object the Builder is creating right now.
// 3.9 rule 1: no object holds more than 10 -- a DEFAULT ceiling, not a clamp.
// Authored or inspector-typed values are never limited (CODEX 02 owns the
// out-of-range warning for level data).

// Canonical object name, spelled as in the 3.9 table, -> default charge.
export const AKI27_INTERIM_CHARGE_TABLE = Object.freeze({
  'security-camera':  1,
  'vending-machine':  2,
  'fuse-box':         2,
  'small-neon-sign':  2,
  'atm':              2,
  'shutter-motor':    2,
  'charge-platform':  2,
  'hvac':             3,
  'streetlight':      4,
  'large-neon-sign':  4,
  'generator':        8,
  'substation':      10,
});

// 3.9 rule 1. Exported for the tests; deliberately not used to clamp anything.
export const AKI27_MAX_OBJECT_CHARGE = 10;

// Builder spawn kind, or palette asset id, -> canonical 3.9 name. The table is
// written in object terms and the Builder places things by spawn kind / asset
// id, so this is the only translation layer and it stays beside the table.
// Sign sizing follows the table's small-shop-sign (2) vs large-sign/billboard
// (4) split, by the art's own size and manifest description: the 128px "large
// literal neon tire wall sign" and the 96px neon sign Chief already had at 4
// are large; the plug and BOOKS shop signs are small. Flagged in the report --
// Chief or Codex can re-tier any of them in this one place.
export const AKI27_CHARGE_KEY_BY_PALETTE = Object.freeze({
  'source':                     'generator',
  'electrical_generator':       'generator',
  'source-hvac':                'hvac',
  'source_hvac':                'hvac',
  'charge-platform':            'charge-platform',
  'night_city_charge_platform': 'charge-platform',
  'prop_ncp_security_camera':   'security-camera',
  'prop_ncp_vending_machine':   'vending-machine',
  'prop_ncp_atm_machine':       'atm',
  'prop_ncp_fuse_box':          'fuse-box',
  'prop_ncp_streetlight':       'streetlight',
  'prop_ncp_neon_sign':         'large-neon-sign',
  'prop_ncp_tire_sign':         'large-neon-sign',
  'prop_ncp_book_sign':         'small-neon-sign',
  'prop_ncp_plug_sign':         'small-neon-sign',
});

// What the Builder placed for every charged object before this order. An
// unknown new prop keeps today's behaviour instead of silently becoming 0;
// 3.9 rule 4 says a new kind gets its tier from Chief, not from code.
export const AKI27_UNKNOWN_KIND_CHARGE = 4;

// The ONE place the Builder answers "what charge does a new <thing> get?".
export function defaultChargeFor(paletteKey) {
  const shared    = RUNTIME_CONSTANTS.CHARGE_TABLE || null;
  const canonical = AKI27_CHARGE_KEY_BY_PALETTE[paletteKey] || paletteKey;
  for (const key of [paletteKey, canonical]) {
    const v = shared?.[key];
    if (Number.isFinite(v)) return v;
  }
  const v = AKI27_INTERIM_CHARGE_TABLE[canonical];
  return Number.isFinite(v) ? v : AKI27_UNKNOWN_KIND_CHARGE;
}

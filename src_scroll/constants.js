// Game-wide constants — change here, reflects everywhere
export const W = 800;
export const H = 450;
export const TILE = 32;
export const COLS = 25;   // W / TILE
export const ROWS = 14;   // H / TILE (floor)

// Physics
export const GRAVITY      = 900;
export const PLAYER_SPEED = 185;
export const JUMP_FORCE   = -430;
export const PLAYER_W     = 20;
export const PLAYER_H     = 30;

// Electricity
export const MAX_CHARGE      = 10;
export const ABSORB_RATE     = 3;     // units per second while holding E near source
export const DISCHARGE_RATE  = 3;     // units per second while holding SPACE near device
export const ABSORB_RADIUS   = 56;    // px from source center
export const INTERACT_RADIUS = 50;    // px from device center
export const PICKUP_LIFETIME = 6;     // seconds before pickup vanishes
export const PICKUP_GRAVITY  = 300;

// Colors
export const C = {
  BG:             '#07090f',
  GROUND:         '#131d2a',
  GROUND_EDGE:    '#1f3550',
  PLATFORM:       '#122030',
  PLATFORM_EDGE:  '#2a506e',
  PLAYER:         '#dce8ff',
  PLAYER_GLOW:    '#7ab4ff',
  SOURCE:         '#ffe040',
  SOURCE_GLOW:    '#ffcc00',
  SOURCE_DARK:    '#2a2a1a',
  GATE:           '#cc44ff',
  GATE_GLOW:      '#9910dd',
  SWITCH_OFF:     '#ff8800',
  SWITCH_ON:      '#44ff88',
  PICKUP:         '#40e0ff',
  CHARGE_LOW:     '#ff4444',
  CHARGE_MED:     '#ffcc00',
  CHARGE_HIGH:    '#44ddff',
  DRAIN_ENEMY:    '#ff3355',
  PATROL_ENEMY:   '#ff7733',
  UI_BG:          'rgba(5,8,15,0.85)',
  TEXT:           '#c8d8f0',
};

// Movement multipliers
export const RUN_MULTIPLIER = 1.7;  // Shift held — sprint speed factor
export const WALK_FPS       = 4;    // idle/walk animation fps
export const RUN_FPS        = 11;   // run animation fps


// Enemy contact
export const STUN_DURATION    = 0.75; // seconds player input is frozen on enemy hit
export const STUN_COOLDOWN    = 1.2;  // minimum time between hits from same enemy

// Banked charge pips
export const MAX_BANKED_PIPS = 5;  // max pips player can hold

// Player attack
export const ATTACK_RADIUS   = 65;   // px — melee swing reach
export const ATTACK_COOLDOWN = 0.35; // seconds between attacks

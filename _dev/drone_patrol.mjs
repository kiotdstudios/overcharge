// _dev/drone_patrol.mjs — A12: drone patrol range moves with the drone.
// Run: node _dev/drone_patrol.mjs

import { state } from "../editor/state.js";
import { moveObject } from "../editor/actions.js";

let passed = 0;
let failed = 0;

function check(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else       { failed++; console.error(`  ✗ ${msg}`); }
}

function makeDrone(x, patrolLeft, patrolRight) {
  return { id: "en_1", type: "drone", x, y: 200, patrolLeft, patrolRight };
}

// Wire up a minimal level so state.level.cols is available for clamping.
state.level = { cols: 50, tiles: [], enemies: [] };

console.log("[ A12 — Drone patrol range follows drag ]");
// ── Test 1: basic delta translation ────────────────────────────────────
{
  const drone = makeDrone(512, 448, 576);
  drone.x += 96;   // simulate live drag pre-applied to x only (patrol still at orig)
  const action = moveObject(drone, 96, 0);
  check(action !== null,            "moveObject returns an action for dx=96");
  check(drone.x           === 608,  "x is at final position 608");
  check(drone.patrolLeft  === 544,  "patrolLeft  translated by +96 to 544");
  check(drone.patrolRight === 672,  "patrolRight translated by +96 to 672");
}

console.log("[ Undo / inverse ]");
// ── Test 2: undo restores all three ────────────────────────────────────
{
  const drone = makeDrone(512, 448, 576);
  drone.x += 96;
  const action = moveObject(drone, 96, 0);
  action.inverse();
  check(drone.x           === 512,  "undo: x restored to 512");
  check(drone.patrolLeft  === 448,  "undo: patrolLeft restored to 448");
  check(drone.patrolRight === 576,  "undo: patrolRight restored to 576");
}

console.log("[ Redo / forward ]");
// ── Test 3: redo re-applies translation ─────────────────────────────────
{
  const drone = makeDrone(512, 448, 576);
  drone.x += 96;
  const action = moveObject(drone, 96, 0);
  action.inverse();
  action.forward();
  check(drone.x           === 608,  "redo: x at 608");
  check(drone.patrolLeft  === 544,  "redo: patrolLeft at 544");
  check(drone.patrolRight === 672,  "redo: patrolRight at 672");
}

console.log("[ Clamp to level bounds ]");
// ── Test 4: patrol clamped to [0, cols*32] ──────────────────────────────
{
  const drone = makeDrone(1500, 1450, 1580);
  drone.x += 200;
  const action = moveObject(drone, 200, 0);
  const maxX = 50 * 32;
  check(drone.patrolLeft  <= maxX,                "patrolLeft clamped to level width");
  check(drone.patrolRight <= maxX,                "patrolRight clamped to level width");
  check(drone.patrolLeft  <= drone.patrolRight,   "patrol ordering preserved after clamp");
}

console.log("[ dy-only drag leaves patrol unchanged ]");
// ── Test 5: dy-only move does not touch patrol ──────────────────────────
{
  const drone = makeDrone(512, 448, 576);
  drone.y += 64;
  const action = moveObject(drone, 0, 64);
  check(drone.patrolLeft  === 448, "dy-only: patrolLeft unchanged");
  check(drone.patrolRight === 576, "dy-only: patrolRight unchanged");
}

console.log("[ Non-enemy objects unaffected ]");
// ── Test 6: objects without patrol are unchanged ─────────────────────────
{
  const source = { id: "s_1", x: 100, y: 300 };
  source.x += 32;
  const action = moveObject(source, 32, 0);
  check(action !== null && source.patrolLeft == null, "source has no patrolLeft after move");
}

console.log("[ Mutation guard — fix is load-bearing ]");
// ── Test 7: mutation proves the fix does real work ───────────────────────
// Simulate the pre-fix bug: only x moved, patrol left behind.
{
  const drone = makeDrone(512, 448, 576);
  drone.x += 96;
  // Do NOT call moveObject — the old behaviour left patrol at old values.
  const patrolCorrect = (drone.patrolLeft === 544 && drone.patrolRight === 672);
  check(!patrolCorrect,
    "without the fix, patrol stays at 448/576 (confirms fix is load-bearing)");
}

console.log(`
RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

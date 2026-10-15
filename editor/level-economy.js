// AKI_26 Part 1, item 1.2 — Level total readout.
// Pure, DOM-free so it is unit-testable without a browser. main.js/workspace.js
// own rendering; this module owns the arithmetic.
//
// "Mandatory spend" is a Builder-side heuristic, not full reachability
// analysis (that is completability.mjs's job, and per CODEX 01 C1 it does
// not yet understand moving platforms either — a known, documented gap, not
// hidden). It assumes:
//   - every isExit gate must be paid in full, at the gate
//   - every blockOnly (barrier) gate is paid at its linked SWITCH, not the
//     gate itself — so its cost lives in switches, not gates, to avoid
//     double-counting
//   - a gate that is neither isExit nor blockOnly is paid at the gate
// This is a WARNING only. Per the order it must never block placement.
export function levelChargeSummary(level) {
  const L = level || {};
  const sources  = Array.isArray(L.sources)  ? L.sources  : [];
  const gates    = Array.isArray(L.gates)    ? L.gates    : [];
  const switches = Array.isArray(L.switches) ? L.switches : [];

  // AKI_26 1.1: an `uncharged` source starts at 0 and must be charged by the
  // player before it can be absorbed back — it contributes nothing to the
  // level's available total until someone puts charge into it.
  const totalCharge = sources.reduce(
    (sum, s) => sum + (s && s.uncharged ? 0 : (Number(s && s.charge) || 0)), 0);

  const exitCost = gates
    .filter(g => g && g.isExit)
    .reduce((sum, g) => sum + (Number(g.required) || 0), 0);

  const switchCost = switches
    .reduce((sum, sw) => sum + (Number(sw && sw.required) || 0), 0);

  const plainGateCost = gates
    .filter(g => g && !g.isExit && !g.blockOnly)
    .reduce((sum, g) => sum + (Number(g.required) || 0), 0);

  const mandatoryCost = exitCost + switchCost + plainGateCost;
  const deficit = Math.max(0, mandatoryCost - totalCharge);

  return {
    totalCharge,
    exitCost,
    switchCost,
    plainGateCost,
    mandatoryCost,
    short: deficit > 0,
    deficit,
  };
}

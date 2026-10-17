// OVERCHARGE Level 1 charge economy model (Kiro). Mirrors GAME_DESIGN_V2 sections 3.1 to 3.3 and 3.9 (round 15 values).
// Bar 10, pip 10, pip slots (start 1), exit 8, Q = pip pays 8 and 2 returns to the bar,
// transfer speed = 3 * (0.4 + 0.6 * bar/10) units per second, for absorbing AND charging.
// Sources: lamps 3 each, market vending machine 2, optional extra prop (fuse box 4). AC unit 4, two-way.
var EconomySim = (function () {
  var BAR = 10, PIP = 10, EXIT = 8, DT = 1 / 60, EPS = 1e-9;
  function rate(bar) { return 3 * (0.4 + 0.6 * Math.min(1, Math.max(0, bar / BAR))); }
  function fresh(opts) {
    opts = opts || {};
    var src = { lamp1: 3, lamp2: 3, lamp3: 3, vend: (opts.vend === undefined ? 2 : opts.vend) };   // the vending machine holds 2 (charge table)
    if (opts.fuse) src.fuse = 4;
    return {
      bar: 0, pips: 0, slots: opts.slots || 1, t: 0, src: src, max: JSON.parse(JSON.stringify(src)),
      ac: 0, acMax: 4, gate: 0, done: false, log: [],
      tenant: 'hot', achievement: false     // hot -> relieved (achievement) -> hot again (achievement stays)
    };
  }
  function usable(s) { return s.bar + PIP * s.pips; }
  function total(s) { var n = 0; for (var k in s.max) n += s.max[k]; return n; }
  function say(s, text) { s.log.push({ t: s.t, text: text, bar: s.bar, pips: s.pips }); }
  function tenantUpdate(s) {
    if (s.ac >= s.acMax - 1e-6) {
      if (s.tenant !== 'relieved') {
        s.tenant = 'relieved';
        if (!s.achievement) { s.achievement = true; say(s, 'The AC is on. The tenant is relieved. ACHIEVEMENT: GOOD NEIGHBOR'); }
        else say(s, 'The AC is on again. The tenant is relieved again.');
      }
    } else if (s.tenant === 'relieved') {
      s.tenant = 'hot again';
      say(s, 'The AC is off. The tenant is hot again (the achievement stays).');
    }
  }
  function intake(s, amt) {
    s.bar += amt;
    if (s.bar >= BAR - EPS) {
      if (s.pips < s.slots) { s.pips += 1; s.bar -= BAR; if (s.bar < EPS) s.bar = 0; }
      else s.bar = BAR;
    }
  }
  function full(s) { return s.bar >= BAR - EPS && s.pips >= s.slots; }
  function absorb(s, name, get, set) {
    var t0 = s.t, moved = 0;
    if (get() <= EPS) { say(s, name + ' is already empty'); return false; }
    while (get() > EPS) {
      if (full(s)) { say(s, 'Absorb ' + name + ': refused, bar and pip slots are full (' + get().toFixed(2) + ' stays in the source)'); return false; }
      var amt = Math.min(rate(s.bar) * DT, get());
      set(get() - amt); intake(s, amt); moved += amt; s.t += DT;
      if (name === 'the AC unit') tenantUpdate(s);
    }
    set(0);
    say(s, 'Absorbed ' + name + ' (' + moved.toFixed(1) + ' units in ' + (s.t - t0).toFixed(2) + ' s)');
    if (name === 'the AC unit') tenantUpdate(s);
    return true;
  }
  function give(s, name, need, get, set) {
    var t0 = s.t, moved = 0;
    while (get() < need - EPS) {
      if (s.bar <= EPS) { if (s.pips > 0) { s.pips -= 1; s.bar = BAR; } else { say(s, 'Charge ' + name + ': out of charge at ' + get().toFixed(2) + ' / ' + need); if (name === 'the AC unit') tenantUpdate(s); return false; } }
      var amt = Math.min(rate(s.bar) * DT, need - get(), s.bar);
      s.bar -= amt; set(get() + amt); moved += amt; s.t += DT;
    }
    set(need);
    say(s, 'Charged ' + name + ' (' + moved.toFixed(1) + ' units in ' + (s.t - t0).toFixed(2) + ' s)');
    if (name === 'the AC unit') tenantUpdate(s);
    return true;
  }
  var NAMES = { lamp1: 'lamp 1', lamp2: 'lamp 2', lamp3: 'lamp 3', vend: 'the vending machine', fuse: 'the fuse box' };
  var actions = {
    absorb: function (s, id) {
      if (!(id in s.src)) { say(s, NAMES[id] + ' is not in the level'); return false; }
      return absorb(s, NAMES[id], function () { return s.src[id]; }, function (v) { s.src[id] = v; });
    },
    chargeAC: function (s, amt) { var target = amt ? Math.min(s.acMax, s.ac + amt) : s.acMax; return give(s, 'the AC unit', target, function () { return s.ac; }, function (v) { s.ac = v; }); },
    zapAC: function (s) { return absorb(s, 'the AC unit', function () { return s.ac; }, function (v) { s.ac = v; }); },
    payExit: function (s) {
      var ok = give(s, 'the exit gate', EXIT, function () { return s.gate; }, function (v) { s.gate = v; });
      if (ok) { s.done = true; say(s, 'Exit open. Level complete.'); }
      return ok;
    },
    pipExit: function (s) {
      if (s.pips < 1) { say(s, 'Q does nothing: no pip banked'); return false; }
      var need = EXIT - s.gate;
      s.pips -= 1; s.gate = EXIT; s.bar = Math.min(BAR, s.bar + (PIP - need));
      say(s, 'Q: a pip paid ' + need.toFixed(0) + ' to the exit, ' + (PIP - need).toFixed(0) + ' returned to the bar');
      s.done = true; say(s, 'Exit open. Level complete.');
      return true;
    }
  };
  function runRoute(steps, opts) {
    var s = fresh(opts);
    steps.forEach(function (st) { actions[st[0]](s, st[1]); });
    return s;
  }
  return { BAR: BAR, PIP: PIP, EXIT: EXIT, rate: rate, fresh: fresh, usable: usable, total: total, actions: actions, runRoute: runRoute, full: full };
})();
if (typeof module !== 'undefined') module.exports = EconomySim;

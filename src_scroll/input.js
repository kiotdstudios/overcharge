// Two-frame input snapshot: supports held(), pressed(), released()
const cur  = {};
const prev = {};

window.addEventListener('keydown', e => {
  cur[e.code] = true;
  // Prevent arrow keys from scrolling the page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyF','KeyP'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { cur[e.code] = false; });

// Clear all held keys on focus loss — prevents stuck sprint/jump when keyup
// events are dropped because the window was not focused when the key was released.
function _clearAll() { for (const k in cur) cur[k] = false; }
window.addEventListener('blur', _clearAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) _clearAll(); });

export function update() {
  Object.assign(prev, cur);
}

export function held(code)     { return !!cur[code]; }
export function pressed(code)  { return !!cur[code] && !prev[code]; }
export function released(code) { return !cur[code] && !!prev[code]; }
export function heldAny(...cc) { return cc.some(c => held(c)); }
export function pressedAny(...cc) { return cc.some(c => pressed(c)); }

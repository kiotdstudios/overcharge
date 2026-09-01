// Two-frame input snapshot: supports held(), pressed(), released()
const cur  = {};
const prev = {};

window.addEventListener('keydown', e => {
  cur[e.code] = true;
  // Prevent arrow keys from scrolling the page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', e => { cur[e.code] = false; });

export function update() {
  Object.assign(prev, cur);
}

export function held(code)     { return !!cur[code]; }
export function pressed(code)  { return !!cur[code] && !prev[code]; }
export function released(code) { return !cur[code] && !!prev[code]; }
export function heldAny(...cc) { return cc.some(c => held(c)); }
export function pressedAny(...cc) { return cc.some(c => pressed(c)); }

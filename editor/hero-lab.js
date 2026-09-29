import { PlayerSprites, HERO_STATES } from '../src_scroll/hero-sprites.js';
import { drawHeroFrame } from '../src_scroll/hero-render.js';

const groups = {
  Movement: ['idle', 'walk', 'run', 'jump', 'hurt', 'stunned', 'death'],
  Combat: ['energy-strike', 'projectile-cast', 'absorb', 'discharge'],
  Traversal: ['ladder-up', 'ladder-down', 'ledge-climb', 'wall-slide', 'grapple'],
};
const names = { idle:'Idle', walk:'Walk', run:'Run', jump:'Jump', hurt:'Hurt', stunned:'Stunned', death:'Death', 'energy-strike':'Energy strike', 'projectile-cast':'Projectile cast', absorb:'Absorb', discharge:'Discharge', 'ladder-up':'Ladder up', 'ladder-down':'Ladder down', 'ledge-climb':'Ledge climb', 'wall-slide':'Wall slide', grapple:'Grapple' };
const revisedGait = new URLSearchParams(location.search).get('gait') === '4';
const sprite = new PlayerSprites({gaitRoot: revisedGait ? 'assets/sprites/hero-gait-v4' : null});
if (revisedGait) {
  document.querySelector('header span').textContent = 'OVERCHARGE / Revised gait candidate';
  document.querySelector('.source').textContent = 'Revised walk/run review candidate. Originals remain available without ?gait=4. Production player is unchanged.';
}
const canvas = document.getElementById('hero-preview');
const ctx = canvas.getContext('2d');
function fitPreview() {
  canvas.width = Math.max(160, Math.round(canvas.getBoundingClientRect().width));
  canvas.height = 330;
}
new ResizeObserver(fitPreview).observe(canvas);
fitPreview();
const facing = document.getElementById('facing');
const size = document.getElementById('display-size');
const scrub = document.getElementById('frame-scrub');
const toggle = document.getElementById('play-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let playing = !reduced;
let selected = 'idle';
let lastTime = null;
let lastFrame = '';
const buttons = [];
for (const [group, states] of Object.entries(groups)) {
  const section = document.createElement('section');
  section.className = 'state-group';
  const heading = document.createElement('h2');
  heading.textContent = group;
  section.append(heading);
  const grid = document.createElement('div');
  grid.className = 'state-buttons';
  section.append(grid);
  for (const state of states) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = names[state];
    button.dataset.state = state;
    button.addEventListener('click', () => selectState(state));
    grid.append(button);
    buttons.push(button);
  }
  document.getElementById('animation-groups').append(section);
}

function updateToggle() { toggle.textContent = playing ? 'Pause' : 'Play'; }
function selectState(state) {
  selected = state;
  sprite.setState(state, facing.value === 'east');
  sprite._current.reset();
  scrub.value = '0';
  document.getElementById('state-title').textContent = names[state];
  const pending = groups.Traversal.includes(state);
  const badge = document.getElementById('state-badge');
  badge.textContent = pending ? 'Assets only · mechanic pending' : 'Animation preview';
  badge.classList.toggle('pending', pending);
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === state)));
  const strip = document.getElementById('frame-strip');
  scrub.max = String(sprite._current.frames.length - 1);
  strip.replaceChildren();
  sprite.get(state, facing.value).frames.forEach((image, index) => {
    const button = document.createElement('button');
    button.className = 'frame';
    button.type = 'button';
    button.setAttribute('aria-label', `Show frame ${index + 1}`);
    button.dataset.frame = String(index);
    const thumb = document.createElement('img');
    thumb.src = image.src;
    thumb.alt = '';
    const label = document.createElement('span');
    label.textContent = String(index + 1).padStart(2, '0');
    button.append(thumb, label);
    button.addEventListener('click', () => selectFrame(index));
    strip.append(button);
  });
  lastFrame = '';
  document.getElementById('playback-note').textContent = HERO_STATES[state][1] ? 'Looping animation.' : 'One-shot animation holds its final pose. Use Replay to restart.';
}
function selectFrame(index) {
  playing = false;
  sprite._current._frame = index;
  sprite._current._t = 0;
  sprite._current.done = false;
  scrub.value = String(index);
  updateToggle();
}
facing.addEventListener('change', () => selectState(selected));
size.addEventListener('change', () => { lastFrame = ''; });
toggle.addEventListener('click', () => { playing = !playing; updateToggle(); });
document.getElementById('replay').addEventListener('click', () => { sprite._current.reset(); playing = true; updateToggle(); });
scrub.addEventListener('input', () => selectFrame(Number(scrub.value)));
window.addEventListener('keydown', event => {
  if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); playing = !playing; updateToggle(); }
  if (event.key.toLowerCase() === 'r') { sprite._current.reset(); playing = true; updateToggle(); }
});

function frame(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, .1);
  lastTime = time;
  if (playing) sprite._current.update(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const footY = 255, footX = canvas.width / 2;
  ctx.strokeStyle = '#1c2a3e';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 31; y < canvas.height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  ctx.fillStyle = '#1b2940'; ctx.fillRect(0, footY, canvas.width, canvas.height - footY);
  ctx.strokeStyle = '#64d8ff'; ctx.beginPath(); ctx.moveTo(0, footY); ctx.lineTo(canvas.width, footY); ctx.stroke();
  const image = sprite.currentFrame;
  drawHeroFrame(ctx, image, footX, footY, Number(size.value));
  ctx.fillStyle = '#a2bcd8'; ctx.font = '12px Segoe UI';
  ctx.fillText('Feet anchor', 18, footY + 25);
  const current = `${selected}/${facing.value}/${sprite._current._frame}/${image.naturalWidth}/${size.value}`;
  if (current !== lastFrame) {
    lastFrame = current;
    scrub.value = String(sprite._current._frame);
    document.getElementById('frame-info').textContent = `${names[selected]} · ${facing.value === 'east' ? 'Right' : 'Left'} · frame ${sprite._current._frame + 1}/${sprite._current.frames.length} · ${HERO_STATES[selected][0]} fps · source ${image.naturalWidth || 'loading'} × ${image.naturalHeight || 'loading'} · display ${size.value} px`;
    document.querySelectorAll('.frame').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.frame) === sprite._current._frame)));
  }
  const frames = sprite._current.frames;
  const loaded = frames.filter(image => image.complete && image.naturalWidth).length;
  const failed = frames.filter(image => image.complete && !image.naturalWidth).length;
  const loadMessage = failed ? `${failed} frame(s) failed to load. Reload this page or check the asset paths.` : `${loaded}/${frames.length} frames loaded`;
  const loadStatus = document.getElementById('load-status');
  if (loadStatus.textContent !== loadMessage) loadStatus.textContent = loadMessage;
  requestAnimationFrame(frame);
}
selectState('idle');
updateToggle();
if (reduced) document.getElementById('playback-note').textContent += ' Playback starts paused for reduced motion.';
requestAnimationFrame(frame);

import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.Image=class{complete=true;naturalWidth=512;};
const {PlayerSprites}=await import('../src_scroll/hero-sprites.js');
const p=new PlayerSprites({gaitRoot:'assets/sprites/hero-gait-v4'});
assert.equal(p.get('walk','east').frames.length,7);
assert.equal(p.get('run','east').frames.length,8);
p.setState('run');p._current._frame=7;p.setState('walk');
assert.equal(p._current._frame,6,'unequal gait lengths preserve phase without invalid index');
p.setState('walk',false);assert.equal(p._current._frame,6);
p._current.update(1);assert.ok(p._current._frame<7);
assert.ok(p.get('idle','east').frames[0].src.includes('hero-v3/idle'));
for(const state of ['walk','run'])for(const dir of ['east','west']){
 for(const image of p.get(state,dir).frames)assert.ok(fs.existsSync(image.src));
}
console.log('PASS: revised gait lengths, valid phase transition, both facings and original non-gait states');

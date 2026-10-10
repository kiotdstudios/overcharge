const listeners={};
globalThis.window={addEventListener(n,f){(listeners[n]??=[]).push(f);},removeEventListener(){},innerWidth:960,innerHeight:578,location:{search:''}};
globalThis.document={addEventListener(){},getElementById(){return null;},createElement(){return{style:{},getContext(){return new Proxy({},{get:()=>()=>{}});}};},body:{style:{}}};
globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=64;this.naturalHeight=64;}addEventListener(){}};
export const {Player}=await import('../../src_scroll/player.js');
export const {Level}=await import('../../src_scroll/level.js');
export const Input=await import('../../src_scroll/input.js');
const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','KeyE','Space','KeyK','KeyG'];
export function held(on=[]){for(const code of keys)for(const f of listeners[on.includes(code)?'keydown':'keyup']||[])f({code,preventDefault(){}});}
export function step(p,l,dt=1/60){p.update(dt,l);l.update(dt,p);Input.update();}
export function flat(cols=40){return new Level({cols,tiles:Array.from({length:cols*18},(_,i)=>Math.floor(i/cols)>=14?16:0),playerStart:{x:64,y:418}});}

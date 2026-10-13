import { TILE } from './constants.js';

// Ambient scenery only: a loose receipt, newspaper scrap, paper cup, or crushed can
// skims across an exposed rooftop. It never changes collisions or the saved level.
export function exposedRoof(level, tx, ty){
  return tx>=0&&tx<level.cols&&ty>0&&ty<level.rows&&
    (level.solidAt(tx,ty)||level.tileAt(tx,ty)===2)&&level.tileAt(tx,ty-1)===0;
}

// Real PixelLab art (Night City Props palette, 32x32 canvas each) replaces the
// hand-coded pixel-grid silhouettes this module used to draw. Loaded once at module
// scope and cached as plain Image objects, same pattern as CHARGE_PLATFORM_ART in
// entities.js: set .src once, guard every draw with .complete && naturalWidth > 0 so
// an in-flight load never throws or draws a blank frame.
//
// originX/originY (in on-screen drawn pixels, after DRAW_SCALE) are the point within
// the sprite that lands exactly on the piece's (x,y) ground anchor, matching how the
// old hand-coded sprites anchored themselves, so spawn/move/despawn physics is
// unchanged.
const LITTER_ASSET_ROOT = 'assets/objects/night-city-props/street-litter';
const DRAW_SCALE = 10 / 32; // 32px source art drawn at ~10px on-screen, matching the old sprites' footprint

function litterImg(name){
  const img = new Image();
  img.src = `${LITTER_ASSET_ROOT}/${name}.png`;
  return img;
}

const LITTER_SPRITES = [
  { img: litterImg('newspaper'), originX: 5, originY: 9 }, // kind 0: folded newspaper scrap
  { img: litterImg('receipt'),   originX: 5, originY: 9 }, // kind 1: pale curled receipt
  { img: litterImg('cup'),       originX: 5, originY: 9 }, // kind 2: tipped takeaway cup
  { img: litterImg('can'),       originX: 5, originY: 9 }, // kind 3: crushed soda can
];

function drawLitterSprite(ctx, def, baseX, baseY, flip){
  const img = def.img;
  if(!(img.complete && img.naturalWidth > 0)) return;
  const w = img.naturalWidth * DRAW_SCALE, h = img.naturalHeight * DRAW_SCALE;
  ctx.save();
  if(flip){
    ctx.translate(baseX - def.originX, baseY - def.originY);
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
  } else {
    ctx.drawImage(img, baseX - def.originX, baseY - def.originY, w, h);
  }
  ctx.restore();
}

export class StreetLitter {
  constructor(){this.pieces=[];this.nextSpawn=4+Math.random()*5;}
  update(dt,level,player,viewWidth){
    this.nextSpawn-=dt;
    if(this.nextSpawn<=0){
      this.nextSpawn=7+Math.random()*9;
      if(this.pieces.length<2)this.spawn(level,player.x,viewWidth);
    }
    for(const p of this.pieces){
      p.age+=dt;
      const ahead=p.x+p.direction*(p.speed*dt+5);
      if(!exposedRoof(level,Math.floor(ahead/TILE),p.row))p.done=true;
      if(!p.done)p.x+=p.direction*p.speed*dt;
      if(p.age>13||p.x<0||p.x>=level.pxW)p.done=true;
    }
    this.pieces=this.pieces.filter(p=>!p.done);
  }
  spawn(level,playerX,viewWidth){
    const direction=Math.random()<0.5?-1:1;
    const nearEdge=Math.min(viewWidth*0.38,280);
    const x=playerX-direction*nearEdge;
    const tx=Math.floor(x/TILE);
    // Highest visible solid rooftop at this column, with open sky directly above.
    for(let ty=1;ty<level.rows;ty++){
      if(!exposedRoof(level,tx,ty))continue;
      const span=direction>0?1:-1;
      if(!exposedRoof(level,tx+span,ty))continue;
      this.pieces.push({x,y:ty*TILE,row:ty,direction,speed:17+Math.random()*13,
        age:0,kind:Math.floor(Math.random()*4),phase:Math.random()*6.28,done:false});
      break;
    }
  }
  draw(ctx){
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const p of this.pieces){
      const x=Math.round(p.x),y=Math.round(p.y);
      const flip=Math.sin(p.age*10+p.phase)>0;
      // A one-pixel ground shadow keeps the scrap visually attached to the roof.
      ctx.fillStyle='#080e1d';ctx.fillRect(x-4,y-1,9,1);
      const def=LITTER_SPRITES[p.kind];
      drawLitterSprite(ctx,def,x,y,flip);
    }
    ctx.restore();
  }
}

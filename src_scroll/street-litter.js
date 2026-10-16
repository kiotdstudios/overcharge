import { TILE } from './constants.js';

// Ambient scenery only: loose street litter gusts, lifts and tumbles across
// exposed rooftops. It never changes collisions or the saved level.
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
const DRAW_SCALE = 20 / 32; // Keep the PixelLab art readable beside 32px rooftop tiles.

function litterImg(name){
  const img = new Image();
  img.src = `${LITTER_ASSET_ROOT}/${name}.png`;
  return img;
}

const LITTER_SPRITES = [
  { img: litterImg('newspaper'), originX: 10, originY: 18 }, // kind 0: folded newspaper scrap
  { img: litterImg('receipt'),   originX: 10, originY: 18 }, // kind 1: pale curled receipt
  { img: litterImg('cup'),       originX: 10, originY: 17 }, // kind 2: tipped takeaway cup
  { img: litterImg('can'),       originX: 10, originY: 17 }, // kind 3: crushed soda can
];

function drawLitterSprite(ctx, def, piece){
  const img = def.img;
  if(!(img.complete && img.naturalWidth > 0)) return;
  const w = img.naturalWidth * DRAW_SCALE, h = img.naturalHeight * DRAW_SCALE;
  ctx.save();
  ctx.translate(Math.round(piece.x), Math.round(piece.y - (piece.lift || 0)));
  ctx.rotate(piece.angle || 0);
  // Paper folds edge-on as it tumbles; cups and cans roll without mirroring.
  if(piece.kind < 2) ctx.scale(Math.cos(piece.angle || 0) * 0.45 + 0.55, 1);
  ctx.drawImage(img, -def.originX, -def.originY, w, h);
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
      // A gust builds and fades instead of applying constant conveyor-belt speed.
      // Light paper rises higher; the heavier cup and can mostly roll.
      const gust=Math.max(0,Math.sin(p.age*2.2+p.phase))**2;
      const velocity=p.speed*(0.22+2.6*gust);
      const ahead=p.x+p.direction*(velocity*dt+5);
      if(!exposedRoof(level,Math.floor(ahead/TILE),p.row))p.done=true;
      if(!p.done){
        p.x+=p.direction*velocity*dt;
        const paper=p.kind<2;
        p.lift=(paper?10:3)*gust*Math.max(0,Math.sin(p.age*(paper?7:4)+p.phase));
        p.angle=(p.angle||0)+p.direction*(paper?5:1.8)*(0.18+gust)*dt;
      }
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
        age:0,kind:Math.floor(Math.random()*4),phase:Math.random()*6.28,
        angle:0,lift:0,done:false});
      break;
    }
  }
  draw(ctx){
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const p of this.pieces){
      const x=Math.round(p.x),y=Math.round(p.y);
      // The shadow stays on the ground while the paper lifts away from it.
      ctx.fillStyle='#080e1d';ctx.globalAlpha=1-Math.min(0.65,(p.lift||0)/18);
      ctx.fillRect(x-8,y-1,17,1);ctx.globalAlpha=1;
      const def=LITTER_SPRITES[p.kind];
      if(def)drawLitterSprite(ctx,def,p);
    }
    ctx.restore();
  }
}


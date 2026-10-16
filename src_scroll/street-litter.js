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

// Opaque pixel bounds of a sprite, in source pixels, found once from its alpha channel. In a
// headless harness (no canvas) it falls back to the full image, which is only more cautious.
function opaqueBounds(img){
  if(img._opaque) return img._opaque;
  let b = { x0: 0, y0: 0, x1: img.naturalWidth, y1: img.naturalHeight };
  try{
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(img.naturalWidth, img.naturalHeight)
      : (typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight }) : null);
    if(c){
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for(let y = 0; y < img.naturalHeight; y++) for(let x = 0; x < img.naturalWidth; x++){
        if(d[(y * img.naturalWidth + x) * 4 + 3] > 16){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
      }
      if(x1 >= 0) b = { x0, y0, x1: x1 + 1, y1: y1 + 1 };
    }
  }catch(e){ /* tainted or unsupported canvas: keep the full-image bounds */ }
  img._opaque = b;
  return b;
}

// Lowest point (positive = below the anchor) of the sprite's opaque box after the horizontal fold
// and the rotation, in drawn pixels. Used to keep a tumbling piece ON the rooftop instead of
// swinging its corners through the tile (Chief: "sometimes it goes through the floor").
export function litterLowestPoint(def, angle, foldX){
  const img = def.img;
  const b = opaqueBounds(img);
  const x0 = b.x0 * DRAW_SCALE - def.originX, x1 = b.x1 * DRAW_SCALE - def.originX;
  const y0 = b.y0 * DRAW_SCALE - def.originY, y1 = b.y1 * DRAW_SCALE - def.originY;
  const s = Math.sin(angle), c = Math.cos(angle);
  let low = -1e9;
  for(const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]){
    const y = px * foldX * s + py * c;     // scale(foldX, 1) first, then rotate, as drawn below
    if(y > low) low = y;
  }
  return low;
}

function drawLitterSprite(ctx, def, piece){
  const img = def.img;
  if(!(img.complete && img.naturalWidth > 0)) return;
  const w = img.naturalWidth * DRAW_SCALE, h = img.naturalHeight * DRAW_SCALE;
  const angle = piece.angle || 0;
  // Paper folds edge-on as it tumbles; cups and cans roll without mirroring.
  const foldX = piece.kind < 2 ? Math.cos(angle) * 0.45 + 0.55 : 1;
  // Raise the piece so its lowest opaque point rests exactly on the rooftop (plus any gust lift).
  const rest = litterLowestPoint(def, angle, foldX);
  ctx.save();
  ctx.translate(Math.round(piece.x), Math.floor(piece.y - (piece.lift || 0) - rest));   // floor: never round DOWN into the tile
  ctx.rotate(angle);
  if(foldX !== 1) ctx.scale(foldX, 1);
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


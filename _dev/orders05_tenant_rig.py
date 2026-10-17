"""Second hot-tenant art attempt: animate only the generated paper fan layer."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import math

OUT = Path('assets/sprites/npc-window-tenant-v2/review/hot_rig')
OUT.mkdir(parents=True, exist_ok=True)
src = Image.open('assets/sprites/npc-window-tenant-v2/review/hot/processed/idle-1.png').convert('RGBA')
small = src.resize((57,57), Image.Resampling.NEAREST)
base = Image.new('RGBA',(64,64))
base.alpha_composite(small,(3,6))

# The mask is cut from generated pixels; no new sprite pixels are painted.
mask = Image.new('L',(64,64))
d = ImageDraw.Draw(mask)
d.polygon([(42,27),(48,26),(53,31),(50,37),(43,39),(40,34)], fill=255)
fan = Image.new('RGBA',(64,64))
fan_px, base_px, mask_px = fan.load(), base.load(), mask.load()
for y in range(64):
    for x in range(64):
        if mask_px[x,y] and base_px[x,y][3]:
            fan_px[x,y] = base_px[x,y]
            base_px[x,y] = (0,0,0,0)

frames=[]
for n in range(216):
    # Three deliberately unhurried six-second sweeps over 18 seconds.
    phase = 2*math.pi*n/72
    angle = 42*math.sin(phase)
    pose = base.copy()
    spun = fan.rotate(angle, resample=Image.Resampling.NEAREST, center=(41,39))
    pose.alpha_composite(spun)
    frames.append(pose)

clip = OUT/'clip'
clip.mkdir(exist_ok=True)
for n,frame in enumerate(frames):
    frame.save(clip/f'{n:03d}.png')
frames[0].save(OUT/'animation.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,disposal=2,optimize=False)
for ground,color in [('dark',(7,10,24,255)),('light',(215,220,227,255))]:
    sheet=Image.new('RGBA',(768,768),color)
    for i,frame_n in enumerate([0,9,18,27,36,45,54,63,71]):
        sheet.alpha_composite(frames[frame_n].resize((256,256),Image.Resampling.NEAREST),((i%3)*256,(i//3)*256))
    sheet.save(OUT/f'contact-{ground}-4x.png')

steps=[]
for a,b in zip(frames,frames[1:]+frames[:1]):
    pa,pb=list(a.getdata()),list(b.getdata())
    area=sum(bool(x[3] or y[3]) for x,y in zip(pa,pb))
    steps.append(round(100*sum(x!=y and bool(x[3] or y[3]) for x,y in zip(pa,pb))/max(1,area),1))
boxes=[f.getchannel('A').getbbox() for f in frames]
report={'frames':216,'fps':12,'duration_s':18,'method':'generated-body-plus-generated-fan-layer',
        'max_step_pct':max(steps),'seam_pct':steps[-1],
        'visible_width_max':max(b[2]-b[0] for b in boxes),
        'visible_height_max':max(b[3]-b[1] for b in boxes),
        'footYByFrame':sorted(set(b[3] for b in boxes))}
(OUT/'metrics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(report)

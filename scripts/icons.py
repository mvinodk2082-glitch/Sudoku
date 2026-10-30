# Renders the Pixel-style icon: 3x3 grid glyph in soft white, one sage accent cell, on charcoal.
from PIL import Image, ImageDraw
import os, sys
CHAR=(30,31,33,255); WHITE=(236,236,234,255); SAGE=(143,168,154,255)
def glyph(size, scale, fg=WHITE, accent=SAGE, bg=None, radius_bg=0):
    S=size*4
    im=Image.new('RGBA',(S,S),bg if bg and not radius_bg else (0,0,0,0)); d=ImageDraw.Draw(im)
    if bg and radius_bg: d.rounded_rectangle([0,0,S-1,S-1],radius=int(S*radius_bg),fill=bg)
    g=S*scale; cell=g/3*0.78; gap=g/3*0.22; x0=(S-g)/2+gap/2
    for r in range(3):
        for c in range(3):
            x=x0+c*(cell+gap); y=x0+r*(cell+gap)
            d.rounded_rectangle([x,y,x+cell,y+cell],radius=cell*0.24,fill=accent if (r,c)==(1,2) else fg)
    return im.resize((size,size),Image.LANCZOS)
out=sys.argv[1]
os.makedirs(out,exist_ok=True)
glyph(192,0.56,bg=CHAR,radius_bg=0.22).save(f'{out}/icon-192.png')
glyph(512,0.56,bg=CHAR,radius_bg=0.22).save(f'{out}/icon-512.png')
glyph(512,0.44,bg=CHAR).save(f'{out}/maskable-512.png')
# Android adaptive layers (108dp canvas; safe zone 66dp → glyph ~40% of canvas)
res=sys.argv[2] if len(sys.argv)>2 else None
if res:
    dens={'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}
    for k,m in dens.items():
        dd=f'{res}/mipmap-{k}'; os.makedirs(dd,exist_ok=True)
        n=int(108*m)
        glyph(n,0.40).save(f'{dd}/ic_launcher_foreground.png')
        glyph(n,0.40,fg=WHITE,accent=WHITE).save(f'{dd}/ic_launcher_monochrome.png')
        l=int(48*m)
        glyph(l,0.56,bg=CHAR,radius_bg=0.22).save(f'{dd}/ic_launcher.png')
        circ=glyph(l,0.50,bg=CHAR,radius_bg=0.5); circ.save(f'{dd}/ic_launcher_round.png')

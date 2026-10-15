"""AKI_26 Part 2 items 4, 5 and 6: relay pylon, light cable, beacon top.

Art is PixelLab Pro Flash, palette-locked with a style_image cut from existing
night-city-props art (BUILDING_FAMILY_ASSET_SPEC section 3: a text-only palette
prompt drifts, the image reference is what holds it). Each piece keeps its
generated master under its own `source/` folder, same provenance habit as the
ATM and the gatehouse.

The cable is the one piece a generator cannot be trusted with: a tile has to be
column-identical across the seam to the pixel, and the generated run came back
with transparent padding at both ends. So the straight tile is rebuilt from the
generated art's own measured cross-section, the vertical tile is an exact 90
degree transpose of it, and the corner is a 45 degree mitre built from that same
cross-section -- every joining edge is then identical by construction, not by
eyeball. See build_corner for why a union of two arms does not work.

Run:  python _dev/aki26_part2_pylon_cable_beacon.py
It writes the three asset folders and the QA sheets inside them, then prints the
QA report. It rebuilds from the generated masters committed under each asset's
`source/`, so it needs nothing outside the repo; a fresh PixelLab download in the
scratch folder is picked up if one happens to be there, but is never required.
Nothing outside those three folders is touched: no manifest, no code, no level JSON.
"""

from collections import Counter
from pathlib import Path
import colorsys
import shutil

from PIL import Image, ImageDraw, ImageFilter, ImageColor

ROOT = Path(__file__).resolve().parents[1]
PROPS = ROOT / "assets/objects/night-city-props"
PYLON, CABLE, BEACON = PROPS / "relay-pylon", PROPS / "light-cable", PROPS / "beacon-top"
GEN = Path.home() / ".aki/tmp/aki26p2"          # optional fresh PixelLab downloads

NIGHT_CITY = {
    "void": "#03010c", "dark": "#0b091e", "navy": "#171932", "steel": "#232450",
    "rim": "#3d3d6d", "blue": "#5e8baa", "lav": "#868fc8", "cyan": "#72bdce",
    "ice": "#b0e1e5",
}
RGB = {k: ImageColor.getrgb(v) for k, v in NIGHT_CITY.items()}

TILE = 32
report = []


def say(line):
    report.append(line)


# --------------------------------------------------------------------- helpers
def master(dest_dir, name, downloads):
    """Resolve a generated master, preferring a fresh PixelLab download.

    `downloads` are candidate filenames in the scratch folder, best first. When
    none is present -- a clone, another machine, or just a cleared temp dir -- the
    copy already committed under the asset's own `source/` is used instead, so the
    rebuild works from committed source alone and stays byte-identical either way.
    Downloading only ever refreshes `source/`; it is never required.
    """
    keep = dest_dir / "source" / f"{name}.png"
    keep.parent.mkdir(parents=True, exist_ok=True)
    for candidate in downloads:
        fresh = GEN / candidate
        if fresh.exists():
            shutil.copyfile(fresh, keep)
            break
    if not keep.exists():
        raise SystemExit(
            f"No generated master for {dest_dir.name}: neither a download in {GEN} "
            f"({', '.join(downloads)}) nor the committed {keep.relative_to(ROOT)}."
        )
    return Image.open(keep).convert("RGBA")


def normalize_transparent(im):
    """Zero the RGB of fully transparent pixels.

    Compositing a coloured halo layer leaves its hue sitting under alpha 0. It is
    invisible when blended, but a filtered/mipmapped texture sample averages that
    RGB into neighbouring opaque pixels and fringes the sprite, and it makes two
    visually identical tile edges compare unequal. Normalise it away at save time.
    """
    im = im.copy()
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    return im


def clear_border(im, width=2):
    """Guarantee a fully transparent border on a free-standing prop.

    A soft glow's Gaussian tail is low alpha, not no alpha, and the transparent
    border guard measures alpha -- so the ring is zeroed outright rather than
    trusted to be empty.
    """
    im = im.copy()
    a = im.getchannel("A")
    d = ImageDraw.Draw(a)
    d.rectangle((0, 0, im.width - 1, width - 1), fill=0)
    d.rectangle((0, im.height - width, im.width - 1, im.height - 1), fill=0)
    d.rectangle((0, 0, width - 1, im.height - 1), fill=0)
    d.rectangle((im.width - width, 0, im.width - 1, im.height - 1), fill=0)
    im.putalpha(a)
    return im


def recentre(im, border=2):
    """Trim to content and re-centre with a known margin, keeping the canvas size."""
    bbox = im.getchannel("A").point(lambda v: 255 if v > 0 else 0).getbbox()
    art = im.crop(bbox)
    out = Image.new("RGBA", im.size)
    out.alpha_composite(art, ((im.width - art.width) // 2,
                              max(border, im.height - border - art.height)))
    return out


# ----------------------------------------------- item 5: the tileable light cable
def measure_profile(gen):
    """Take the generated cable's own vertical cross-section at its brightest column.

    Picking the brightest column rather than the mean keeps the lit core instead
    of averaging it away into the sheath.
    """
    bbox = gen.getchannel("A").point(lambda v: 255 if v > 0 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    best, best_lum = None, -1
    for x in range(x0 + 4, x1 - 4):                     # skip the model's end caps
        col = [gen.getpixel((x, y)) for y in range(y0, y1)]
        if any(p[3] == 0 for p in col):
            continue
        lum = max(p[0] + p[1] + p[2] for p in col)
        if lum > best_lum:
            best, best_lum = col, lum
    if best is None:                                    # generated run was not solid
        return None
    return best


def snap(rgb):
    """Nearest Night City colour -- the generated art is already locked to the
    palette by style_image, this only removes the few in-between dither tones so
    a tile stays a clean, repeating pixel pattern."""
    r, g, b = rgb[:3]
    return min(RGB.values(), key=lambda c: (c[0]-r)**2 + (c[1]-g)**2 + (c[2]-b)**2)


THICKNESS = 12          # cable thickness in a 32 px tile


def resample_profile(profile, thickness=THICKNESS):
    """Squeeze the generated close-up's cross-section down to tile scale.

    The master is an extreme close-up, 28 px of cable, which would leave a 32 px
    tile almost solid and no room between the art and the canvas edge. Nearest
    resampling keeps the real generated colours rather than inventing blends.
    """
    strip = Image.new("RGBA", (1, len(profile)))
    for i, p in enumerate(profile):
        strip.putpixel((0, i), p)
    strip = strip.resize((1, thickness), Image.Resampling.NEAREST)
    # snapped here, once: the straight and the corner must read the same list or
    # their shared edges differ by a dither tone and the seam check fails
    return [snap(strip.getpixel((0, i))) + (255,) for i in range(thickness)]


def build_cable(profile):
    """Straight tile: one measured cross-section repeated across all 32 columns.

    Every column is identical, so column 0 equals column 31 exactly and a run of
    tiles cannot show a seam. The pips and the hanger sit at x 8, 16 and 24, and
    the glow radius is small enough that no blur tail reaches a canvas edge --
    which is what makes the corner's sliced edges match the straights exactly.
    """
    profile = resample_profile(profile)
    h = Image.new("RGBA", (TILE, TILE))
    top = (TILE - len(profile)) // 2
    core = max(range(len(profile)), key=lambda i: sum(profile[i][:3]))
    for x in range(TILE):
        for i, p in enumerate(profile):
            h.putpixel((x, top + i), p)
    for x in (8, 24):                                   # lit pips, evenly spaced
        for dx in (-1, 0, 1):
            h.putpixel((x + dx, top + core), RGB["ice"] + (255,))
    for x in (15, 16, 17):                              # suspension hanger
        for y in range(top - 4, top):
            h.putpixel((x, y), RGB["steel"] + (255,))
    for x in range(13, 20):
        h.putpixel((x, top - 5), RGB["rim"] + (255,))

    h = glow(h)

    v = h.transpose(Image.Transpose.ROTATE_90)
    return h, v, build_corner(h, v, profile, top, core)


def band(im, line, kind):
    """Indices along one edge line where the tile has opaque art."""
    if kind == "col":
        return [y for y in range(TILE) if im.getpixel((line, y))[3] == 255]
    return [x for x in range(TILE) if im.getpixel((x, line))[3] == 255]


def build_corner(h, v, profile, top, core):
    """A run entering the left edge and leaving the top edge, mitred at 45 degrees.

    Unioning two thick arms does not work: this cable is a stack of stripes, and a
    union leaves the stripes crossing instead of turning, so the lit core does not
    carry through the bend. Instead every pixel is assigned its stripe by which
    side of the pivot's 45 degree diagonal it falls on, which routes each stripe
    around the corner and keeps the stack order. The diagonal also *is* the outer
    shoulder, so no separate shoulder fill is needed.

    The two arm centres and the stripe direction are measured off the finished
    straights rather than derived from PIL's rotation convention, so the joining
    edges stay identical to the straights even if that convention changes.
    """
    T = len(profile)
    ci = T // 2
    hband = band(h, 0, "col")                    # rows of the straight's cross-section
    vband = band(v, 0, "row")                    # columns of the vertical's cross-section
    cy = hband[0] + ci
    cx = vband[0] + ci
    # which end of the vertical band carries profile[0]
    forward = v.getpixel((vband[0], 0)) == profile[0]

    c = Image.new("RGBA", (TILE, TILE))
    for y in range(TILE):
        for x in range(TILE):
            if (x - cx) - (y - cy) < 0:          # horizontal side of the mitre
                i = ci + (y - cy)
            else:                                # vertical side of the mitre
                i = ci + (x - cx if forward else cx - x)
            if 0 <= i < T:
                c.putpixel((x, y), profile[i])

    for dx in (-1, 0):                            # lit junction on the bend itself
        for dy in (-1, 0):
            c.putpixel((cx + dx, cy + dy), RGB["ice"] + (255,))
    return glow(c)


def glow(im, radius=1.5, strength=0.5, col="cyan"):
    """Soft cyan halo under the art, mask-blurred so the RGB stays one palette hue.

    The radius is deliberately small: a wider tail would reach a tile edge, and a
    tile edge has to stay identical to its neighbour's.
    """
    mask = im.getchannel("A").point(lambda v: 255 if v else 0)
    mask = mask.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: int(v * strength))
    halo = Image.new("RGBA", im.size, RGB[col] + (0,))
    halo.putalpha(mask)
    return Image.alpha_composite(halo, im)


# ------------------------------------------------------------------- QA checks
def check_dims(name, im, want):
    ok = im.size == want
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} dimensions {im.size} (want {want})")
    return ok


def check_border(name, im, width=2):
    a = im.getchannel("A")
    w, h = im.size
    ring = [a.getpixel((x, y)) for x in range(w) for y in range(width)]
    ring += [a.getpixel((x, h - 1 - y)) for x in range(w) for y in range(width)]
    ring += [a.getpixel((x, y)) for y in range(h) for x in range(width)]
    ring += [a.getpixel((w - 1 - x, y)) for y in range(h) for x in range(width)]
    ok = max(ring) == 0
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} transparent {width}px border, max alpha {max(ring)}")
    return ok


def check_bleed(name, im, axis):
    """A tile must reach the canvas edge, the opposite of the prop border rule."""
    a = im.getchannel("A")
    w, h = im.size
    if axis == "x":
        e = [max(a.getpixel((0, y)) for y in range(h)), max(a.getpixel((w - 1, y)) for y in range(h))]
    else:
        e = [max(a.getpixel((x, 0)) for x in range(w)), max(a.getpixel((x, h - 1)) for x in range(w))]
    ok = min(e) > 0
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} art bleeds to both {axis} edges (alpha {e})")
    return ok


def check_palette(name, im):
    """No magenta or pink, and report how far the art sits from the locked set."""
    bad, worst, n = 0, 0, 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a < 16:
                continue
            n += 1
            hue, _, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.75 <= hue <= 0.96 and s > 0.25 and v > 0.15:
                bad += 1
            c = snap((r, g, b))
            worst = max(worst, max(abs(c[0]-r), abs(c[1]-g), abs(c[2]-b)))
    ok = bad == 0
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} palette: {bad}/{n} magenta-or-pink px, "
        f"max channel distance to nearest locked colour {worst}")
    return ok


def check_seam(name, a, b, axis):
    """Column 0 of one tile against column 31 of the tile that precedes it."""
    if axis == "x":
        left = [a.getpixel((a.width - 1, y)) for y in range(a.height)]
        right = [b.getpixel((0, y)) for y in range(b.height)]
    else:
        left = [a.getpixel((x, a.height - 1)) for x in range(a.width)]
        right = [b.getpixel((x, 0)) for x in range(b.width)]
    # a seam is continuous when the two touching lines carry the same cross-section
    diff = sum(1 for p, q in zip(left, right) if p != q)
    ok = diff == 0
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} seam continuous, {diff} mismatched lines")
    return ok


def lit_colour(im, top_frac=0.04):
    """The dominant colour of an asset's brightest pixels -- its lit colour.

    Taking the single brightest pixel would latch onto one stray highlight, so
    this takes the mode of the brightest few percent instead.
    """
    px = [im.getpixel((x, y)) for y in range(im.height) for x in range(im.width)
          if im.getpixel((x, y))[3] == 255]
    px.sort(key=lambda c: c[0] + c[1] + c[2], reverse=True)
    top = px[:max(1, int(len(px) * top_frac))]
    return Counter(c[:3] for c in top).most_common(1)[0][0]


def check_lit_hue(name, im, reference, tol=0.05):
    """Order AKI_26 item 6: the beacon must be the same colour as the cable, and
    4.3a wants the pylon reading as the same powered line.

    Compared by hue, not by exact RGB. The cable tile is deliberately snapped to
    the locked palette -- a repeating tile needs a clean, flat pattern -- while the
    pylon and the beacon keep their generated shading, which is what the existing
    props do (vending-machine carries far more than nine colours). Demanding byte
    equality between a snapped tile and unsnapped prop art would only be testing
    that pipeline difference, not whether the three read as one powered line.
    """
    a, b = lit_colour(im), reference
    ha = colorsys.rgb_to_hsv(*[v / 255 for v in a])[0]
    hb = colorsys.rgb_to_hsv(*[v / 255 for v in b])[0]
    d = abs(ha - hb)
    near = [k for k, v in RGB.items() if v == snap(a)][0]
    ok = d <= tol
    say(f"  [{'PASS' if ok else 'FAIL'}] {name} lit colour {a} (nearest locked: {near}) "
        f"hue {ha:.3f} vs cable hue {hb:.3f}, delta {d:.3f} (tol {tol})")
    return ok


# ------------------------------------------------------------- QA contact sheets
def checker(size, cell=8):
    im = Image.new("RGBA", size, (34, 36, 50, 255))
    d = ImageDraw.Draw(im)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                d.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(22, 24, 34, 255))
    return im


def contact_sheet(items, out, scale=3, pad=12):
    """QA reference only, never a game asset."""
    shots = [(n, im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST))
             for n, im in items]
    w = sum(s.width for _, s in shots) + pad * (len(shots) + 1)
    h = max(s.height for _, s in shots) + pad * 2 + 14
    sheet = checker((w, h))
    d = ImageDraw.Draw(sheet)
    x = pad
    for n, s in shots:
        sheet.alpha_composite(s, (x, pad))
        d.text((x, pad + s.height + 2), n, fill=(220, 236, 240, 255))
        x += s.width + pad
    sheet.save(out)
    return out


def tiling_sheet(h, v, c, out, scale=4):
    """Four straights in a row, a corner, then three verticals climbing: if the
    tiles were not seamless the joins would read as stripes at this zoom."""
    cols, rows = 6, 5
    im = Image.new("RGBA", (TILE * cols, TILE * rows))
    for i in range(4):
        im.alpha_composite(h, (TILE * i, TILE * 4))
    im.alpha_composite(c, (TILE * 4, TILE * 4))
    for i in range(4):
        im.alpha_composite(v, (TILE * 4, TILE * i))
    big = im.resize((im.width * scale, im.height * scale), Image.Resampling.NEAREST)
    sheet = checker(big.size)
    sheet.alpha_composite(big)
    sheet.save(out)
    return out


# ------------------------------------------------------------------------- main
def main():
    for d in (PYLON, CABLE, BEACON):
        d.mkdir(parents=True, exist_ok=True)
    ok = True

    say("AKI 26 PART 2 -- items 4, 5, 6 QA")
    say("")

    # built first: its lit core is the reference colour for the pylon head and
    # the beacon crown, which the order requires to match it
    say("Item 5 light cable  assets/objects/night-city-props/light-cable/")
    gen = master(CABLE, "cable_pixellab_v2",
                 ["gen_cable_v2.png", "gen_cable_v1.png"])
    raw = measure_profile(gen)
    if raw is None:
        say("  [FAIL] no solid cross-section in the generated run -- cannot derive a tile")
        return False, False
    say(f"  cross-section taken from the generated master: {len(raw)} px thick, "
        f"resampled to {THICKNESS} px for a {TILE} px tile")
    h, v, c = build_cable(raw)
    h, v, c = (normalize_transparent(i) for i in (h, v, c))
    h.save(CABLE / "cable_straight_h.png")
    v.save(CABLE / "cable_straight_v.png")
    c.save(CABLE / "cable_corner.png")
    for n, im, axis in (("cable_straight_h.png", h, "x"), ("cable_straight_v.png", v, "y")):
        ok &= check_dims(n, im, (TILE, TILE))
        ok &= check_bleed(n, im, axis)
        ok &= check_palette(n, im)
    ok &= check_dims("cable_corner.png", c, (TILE, TILE))
    ok &= check_palette("cable_corner.png", c)
    ok &= check_seam("straight_h to straight_h", h, h, "x")
    ok &= check_seam("straight_v to straight_v", v, v, "y")
    ok &= check_seam("straight_h to corner (left edge)", h, c, "x")
    ok &= check_seam("corner to straight_v (top edge)", v, c, "y")
    cable_lit = lit_colour(h)
    say(f"  cable lit colour {cable_lit}")
    say(f"  sheet {contact_sheet([('straight_h', h), ('straight_v', v), ('corner', c)], CABLE / 'qa_contact_sheet.png', 4).name}")
    say(f"  sheet {tiling_sheet(h, v, c, CABLE / 'qa_tiling_proof.png').name}")

    say("")
    say("Item 4 relay pylon  assets/objects/night-city-props/relay-pylon/pylon.png")
    gen = master(PYLON, "pylon_pixellab_v1", ["gen_pylon_v1.png"])
    pylon = normalize_transparent(clear_border(recentre(gen), 2))
    pylon.save(PYLON / "pylon.png")
    ok &= check_dims("pylon.png", pylon, (96, 256))
    ok &= check_border("pylon.png", pylon, 2)
    ok &= check_palette("pylon.png", pylon)
    ok &= check_lit_hue("pylon.png", pylon, cable_lit)
    say(f"  sheet {contact_sheet([('pylon.png', pylon)], PYLON / 'qa_contact_sheet.png', 2).name}")

    say("")
    say("Item 6 beacon top   assets/objects/night-city-props/beacon-top/beacon_top.png")
    gen = master(BEACON, "beacon_top_pixellab_v1", ["gen_beacon_v1.png"])
    beacon = normalize_transparent(clear_border(recentre(gen), 2))
    beacon.save(BEACON / "beacon_top.png")
    ok &= check_dims("beacon_top.png", beacon, (128, 96))
    ok &= check_border("beacon_top.png", beacon, 2)
    ok &= check_palette("beacon_top.png", beacon)
    ok &= check_lit_hue("beacon_top.png", beacon, cable_lit)
    say(f"  sheet {contact_sheet([('beacon_top.png', beacon)], BEACON / 'qa_contact_sheet.png', 3).name}")

    say("")
    say(f"RESULT: {'all checks PASS' if ok else 'at least one check FAILED'}")
    return ok, True


if __name__ == "__main__":
    ok, _ = main()
    print("\n".join(report))

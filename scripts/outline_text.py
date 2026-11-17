"""Convert the Michroma <text> in the brand SVGs into outlined <path>s, so the logo renders
correctly as an <img> and in the PNG app icons (images can't load web fonts).
Usage: python3 scripts/outline_text.py src/assets/brand/*.svg"""
import re, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font = TTFont("node_modules/@fontsource/michroma/files/michroma-latin-400-normal.woff")
cmap, gs = font.getBestCmap(), font.getGlyphSet()
upm = font["head"].unitsPerEm
hmtx = font["hmtx"]

def outline(m):
    attrs, text = m.group(1), m.group(2)
    a = dict(re.findall(r'([\w-]+)="([^"]*)"', attrs))
    size = float(a["font-size"]); ls = float(a.get("letter-spacing", 0)); s = size / upm
    x, y = float(a["x"]), float(a["y"])
    names = [cmap[ord(c)] for c in text]
    widths = [hmtx[n][0] * s for n in names]
    total = sum(widths) + ls * (len(names) - 1)
    anchor = a.get("text-anchor", "start")
    x0 = x - total / 2 if anchor == "middle" else x - total if anchor == "end" else x
    pen = SVGPathPen(gs)
    for n, w in zip(names, widths):
        gs[n].draw(TransformPen(pen, (s, 0, 0, -s, x0, y)))
        x0 += w + ls
    keep = " ".join(f'{k}="{v}"' for k, v in a.items() if k in ("fill", "opacity", "stroke"))
    return f'<path {keep} d="{pen.getCommands()}"/>'

for path in sys.argv[1:]:
    svg = open(path).read()
    new = re.sub(r"<text([^>]*)>([^<]*)</text>", outline, svg)
    open(path, "w").write(new)
    print(path, "texts left:", new.count("<text"))

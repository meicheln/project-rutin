#!/usr/bin/env python3
"""Bikin ikon peluncur, ikon notifikasi, dan splash buat Rutin."""
from PIL import Image, ImageDraw, ImageFont
import os, sys, math, glob, urllib.request

# Folder res-nya dikasih tahu dari luar, bukan dipatok di kode — dulu ini kepatok
# ke mesin tempat APK pertama dibikin, jadi nggak bisa jalan di mana-mana lagi.
#   python3 tools/buat-ikon.py <folder-res>
RES = (sys.argv[1] if len(sys.argv) > 1
       else os.environ.get("RUTIN_RES")
       or os.path.join("..", "rutin-android", "android", "app", "src", "main", "res"))

PJS = ("https://github.com/google/fonts/raw/main/ofl/plusjakartasans/"
       "PlusJakartaSans%5Bwght%5D.ttf")


def cari_font():
    """Plus Jakarta Sans kalau bisa; kalau nggak, font sistem apa pun.
    Glifnya cuma huruf R — font cadangan bikin beda tipis, bukan gagal."""
    lokal = os.environ.get("RUTIN_FONT") or "/tmp/PJS.ttf"
    if os.path.exists(lokal):
        return lokal
    try:
        urllib.request.urlretrieve(PJS, lokal)
        return lokal
    except Exception as e:
        print("  font Plus Jakarta Sans nggak keunduh (%s), pakai font sistem" % e)
    for pola in ("/usr/share/fonts/**/DejaVuSans-Bold.ttf",
                 "/usr/share/fonts/**/LiberationSans-Bold.ttf",
                 "/usr/share/fonts/**/*Bold.ttf",
                 "C:/Windows/Fonts/arialbd.ttf"):
        ada = glob.glob(pola, recursive=True)
        if ada:
            return ada[0]
    raise SystemExit("nggak ada font sama sekali — pasang fonts-dejavu atau set RUTIN_FONT")


FONT = cari_font()
print("  res  :", RES)
print("  font :", FONT)
BG = (14, 15, 17, 255)        # --bg gelap
FG = (237, 239, 242, 255)     # --text terang
ACCENT = (62, 207, 149, 255)  # --c-ok

SS = 8  # supersample


def r_glyph(size, color=FG, weight=1.0):
    """Huruf R terpusat optik, digambar besar lalu dikecilkan."""
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fs = int(size * SS * 0.78 * weight)
    f = ImageFont.truetype(FONT, fs)
    box = d.textbbox((0, 0), "R", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    x = (size * SS - w) / 2 - box[0]
    y = (size * SS - h) / 2 - box[1]
    d.text((x, y), "R", font=f, fill=color)
    return img.resize((size, size), Image.LANCZOS)


def rounded(size, radius_ratio=0.225, color=BG):
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * SS * radius_ratio)
    d.rounded_rectangle([0, 0, size * SS - 1, size * SS - 1], radius=r, fill=color)
    return img.resize((size, size), Image.LANCZOS)


def ring(size, pct=0.72, stroke_ratio=0.115, color=FG, pad_ratio=0.12):
    """Cincin progres — dipakai buat ikon notifikasi."""
    img = Image.new("RGBA", (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    S = size * SS
    sw = int(S * stroke_ratio)
    pad = int(S * pad_ratio) + sw // 2
    box = [pad, pad, S - pad, S - pad]
    d.arc(box, start=-90, end=-90 + 360 * pct, fill=color, width=sw)
    # bulatkan ujung awal
    cx, cy = S / 2, S / 2
    rad = (S - 2 * pad) / 2
    for ang in (-90, -90 + 360 * pct):
        a = math.radians(ang)
        px, py = cx + rad * math.cos(a), cy + rad * math.sin(a)
        d.ellipse([px - sw / 2, py - sw / 2, px + sw / 2, py + sw / 2], fill=color)
    return img.resize((size, size), Image.LANCZOS)


def circle_mask(img):
    size = img.size[0]
    m = Image.new("L", (size * SS, size * SS), 0)
    ImageDraw.Draw(m).ellipse([0, 0, size * SS - 1, size * SS - 1], fill=255)
    m = m.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")


# ---------- ikon peluncur ----------
DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

for d, s in DENS.items():
    # legacy 48dp
    n = int(48 * s)
    base = rounded(n)
    base.alpha_composite(r_glyph(n).resize((n, n), Image.LANCZOS))
    save(base, f"{RES}/mipmap-{d}/ic_launcher.png")
    save(circle_mask(base), f"{RES}/mipmap-{d}/ic_launcher_round.png")

    # adaptive foreground 108dp — glyph harus muat di zona aman 66dp
    n2 = int(108 * s)
    fg = Image.new("RGBA", (n2, n2), (0, 0, 0, 0))
    g = r_glyph(int(n2 * 0.52))
    fg.alpha_composite(g, ((n2 - g.size[0]) // 2, (n2 - g.size[1]) // 2))
    save(fg, f"{RES}/mipmap-{d}/ic_launcher_foreground.png")

# ---------- ikon notifikasi (siluet putih) ----------
for d, s in DENS.items():
    n = int(24 * s)
    save(ring(n), f"{RES}/drawable-{d}/ic_stat_rutin.png")
save(ring(96), f"{RES}/drawable/ic_stat_rutin.png")

# ---------- splash ----------
def splash(w, h):
    img = Image.new("RGBA", (w, h), BG)
    m = min(w, h)
    mark = rounded(int(m * 0.17))
    mark.alpha_composite(r_glyph(int(m * 0.17)))
    img.alpha_composite(mark, ((w - mark.size[0]) // 2, (h - mark.size[1]) // 2))
    return img.convert("RGB")

PORT = {"mdpi": (320, 480), "hdpi": (480, 800), "xhdpi": (720, 1280),
        "xxhdpi": (960, 1600), "xxxhdpi": (1280, 1920)}
for d, (w, h) in PORT.items():
    save(splash(w, h), f"{RES}/drawable-port-{d}/splash.png")
    save(splash(h, w), f"{RES}/drawable-land-{d}/splash.png")
save(splash(960, 1600), f"{RES}/drawable/splash.png")

# ---------- warna latar ikon adaptif ----------
os.makedirs(f"{RES}/values", exist_ok=True)
with open(f"{RES}/values/ic_launcher_background.xml", "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#0E0F11</color>\n</resources>\n')

# ---------- ikon buat web/PWA ----------
for n in (192, 512):
    b = rounded(n)
    b.alpha_composite(r_glyph(n))
    save(b, f"/home/claude/build/icon-{n}.png")

print("ikon & splash selesai")

#!/usr/bin/env python3
"""Projects reference/isaac/isaac_01.webp onto the game's head UV layout (equirect, front = u 0.25).
Run:  python3 -I tools/make_face.py [isaac|zekariah|nigerte|nebs]   ->  public/char/<name>_face.png  (and prints the average skin colour)
Landmarks were measured by hand on the photo: pupils (340,692) and (487,690), lip seam y=862, chin y=965."""
import math, sys
from PIL import Image, ImageFilter
import numpy as np
W, H = 1024, 512
RX, RY, CY = 0.068, 0.118, 0.118          # must match headGeometry() in src/char/human.ts
PXM = 147 / 0.063                          # photo pixels per metre (interpupillary distance 63 mm)
CX_PX, EYE_PY = 413.5, 691.0
WHO = sys.argv[1] if len(sys.argv) > 1 else 'isaac'
CFG = {'isaac': ('reference/isaac/isaac_01.webp', 147, 413.5, 691.0, [(730, 790, 290, 350), (730, 790, 480, 540), (570, 610, 360, 470)]),
       'zekariah': ('reference/zekariah/zek_3057.jpg', 200, 515.0, 655.0, [(760, 820, 340, 400), (760, 820, 640, 700), (520, 560, 450, 580)]),
       'nigerte': ('reference/deacons/nigerte_front.jpg', 360, 755.0, 930.0, [(1080, 1160, 480, 560), (1080, 1160, 950, 1030), (730, 790, 650, 850)]),
       'nebs': ('reference/deacons/nebs_front.jpg', 315, 748.0, 1102.0, [(1330, 1400, 520, 600), (1330, 1400, 900, 980), (935, 975, 650, 850)])}[WHO]
PXM = CFG[1] / 0.063; CX_PX, EYE_PY = CFG[2], CFG[3]
src = np.asarray(Image.open(CFG[0]).convert('RGB')).astype(np.float32)
sh, sw = src.shape[:2]
def sample(px, py):
    x0 = np.clip(np.floor(px).astype(int), 0, sw - 2); y0 = np.clip(np.floor(py).astype(int), 0, sh - 2); fx = np.clip(px - x0, 0, 1)[..., None]; fy = np.clip(py - y0, 0, 1)[..., None]
    return (src[y0, x0] * (1 - fx) + src[y0, x0 + 1] * fx) * (1 - fy) + (src[y0 + 1, x0] * (1 - fx) + src[y0 + 1, x0 + 1] * fx) * fy
u = (np.arange(W) + 0.5) / W; v = (np.arange(H) + 0.5) / H; U, V = np.meshgrid(u, v)
ny = np.cos(V * math.pi); sn = np.sin(V * math.pi); ph = U * 2 * math.pi; dx = -np.cos(ph) * sn; dz = np.sin(ph) * sn
x = dx * RX; y = ny * RY + CY
px = CX_PX + x * PXM; py = EYE_PY - (y - CY) * PXM
col = sample(px, py)
# average skin tone from the cheeks and forehead
skin = np.concatenate([src[a:b, c:d].reshape(-1, 3) for a, b, c, d in CFG[4]]).mean(0)
ss = lambda a, b, t: np.clip((t - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((t - a) / (b - a), 0, 1))
alpha = ss(0.30, 0.62, dz)                              # front of the head only
alpha *= 1 - ss(0.46, 0.56, ny)                         # stop below the hairline (hair is painted by the game)
alpha *= ss(-0.985, -0.9, ny)                           # stop at the chin
alpha *= 1 - ss(0.80, 0.97, np.abs(dx) / np.maximum(sn, 1e-4))   # fade toward the ears
# gentle de-flash: pull highlights toward the mean so the game's own lighting can do the shading
lum = col.mean(-1, keepdims=True); col = col - np.clip(lum - 205, 0, 60) * 0.55
# the sides, neck and scalp use the average tone with a little shading and grain
rng = np.random.default_rng(3); base = np.broadcast_to(skin * 0.93, col.shape).copy(); base *= (0.9 + 0.1 * ss(-0.2, 0.9, dz))[..., None]; base += rng.normal(0, 2.2, base.shape[:2])[..., None]
out = base * (1 - alpha[..., None]) + col * alpha[..., None]
out = out * 0.9   # flash-lit photo -> albedo: the game lights it again
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); img.save(f'public/char/{WHO}_face.png', optimize=True)
print('skin sRGB', [int(round(c)) for c in skin * 0.93], '#%02x%02x%02x' % tuple(int(round(c)) for c in skin * 0.93))

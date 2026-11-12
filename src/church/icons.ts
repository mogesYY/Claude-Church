// Original, code-painted icons in the Ethiopian tradition (bold outlines, large almond eyes, flat jewel colours).
// These are generated artwork, not copies of any existing icon.
import * as THREE from 'three/webgpu';

type Ctx = CanvasRenderingContext2D;
const SKIN = '#b9783f', SKIN_SH = '#9a5f2e', INK = '#1d120a', GOLD = '#e2b33c';

function frame(c: Ctx, w: number, h: number, bg: string, border = '#b3261e') {
  c.fillStyle = border; c.fillRect(0, 0, w, h);
  c.fillStyle = GOLD; c.fillRect(10, 10, w - 20, h - 20);
  // woven border pattern
  for (let i = 0; i < 60; i++) { c.fillStyle = i % 2 ? '#1f6b3a' : '#b3261e'; const t = i / 60; c.fillRect(14 + t * (w - 36), 14, 6, 8); c.fillRect(14 + t * (w - 36), h - 22, 6, 8); c.fillRect(14, 14 + t * (h - 36), 8, 6); c.fillRect(w - 22, 14 + t * (h - 36), 8, 6); }
  c.fillStyle = bg; c.fillRect(28, 28, w - 56, h - 56);
}
function halo(c: Ctx, x: number, y: number, r: number, cross = false) {
  c.fillStyle = GOLD; c.strokeStyle = '#a3241c'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = '#f6dc8a'; c.lineWidth = 2; for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); c.lineTo(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93); c.stroke(); }
  if (cross) { c.strokeStyle = '#a3241c'; c.lineWidth = 7; c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r * 0.2); c.stroke(); }
}
function head(c: Ctx, x: number, y: number, r: number, o: { hair?: string; beard?: string; veil?: string; tilt?: number; crown?: boolean } = {}) {
  c.save(); c.translate(x, y); c.rotate(o.tilt ?? 0);
  if (o.veil) { c.fillStyle = o.veil; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -r * 0.05, r * 1.22, r * 1.32, 0, 0, 7); c.fill(); c.stroke(); }
  if (o.hair) { c.fillStyle = o.hair; c.beginPath(); c.ellipse(0, -r * 0.18, r * 1.06, r * 1.08, 0, 0, 7); c.fill(); }
  c.fillStyle = SKIN; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, r * 0.82, r, 0, 0, 7); c.fill(); c.stroke();
  if (o.beard) { c.fillStyle = o.beard; c.beginPath(); c.moveTo(-r * 0.72, r * 0.25); c.quadraticCurveTo(0, r * 1.75, r * 0.72, r * 0.25); c.quadraticCurveTo(0, r * 0.75, -r * 0.72, r * 0.25); c.fill(); }
  // large almond eyes
  for (const s of [-1, 1]) {
    c.fillStyle = '#fbf6ea'; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.moveTo(s * r * 0.12, -r * 0.1); c.quadraticCurveTo(s * r * 0.38, -r * 0.34, s * r * 0.66, -r * 0.1); c.quadraticCurveTo(s * r * 0.38, r * 0.08, s * r * 0.12, -r * 0.1); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(s * r * 0.38, -r * 0.11, r * 0.1, 0, 7); c.fill();
    c.lineWidth = 3.5; c.beginPath(); c.moveTo(s * r * 0.1, -r * 0.36); c.quadraticCurveTo(s * r * 0.4, -r * 0.52, s * r * 0.7, -r * 0.34); c.stroke();
  }
  c.strokeStyle = SKIN_SH; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -r * 0.12); c.lineTo(-r * 0.04, r * 0.3); c.lineTo(r * 0.1, r * 0.32); c.stroke();
  c.strokeStyle = '#7a2a22'; c.lineWidth = 3; c.beginPath(); c.moveTo(-r * 0.2, r * 0.56); c.quadraticCurveTo(0, r * 0.66, r * 0.2, r * 0.56); c.stroke();
  if (o.crown) { c.fillStyle = GOLD; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(-r * 0.8, -r * 0.8); c.lineTo(-r * 0.85, -r * 1.5); c.lineTo(-r * 0.4, -r * 1.15); c.lineTo(0, -r * 1.65); c.lineTo(r * 0.4, -r * 1.15); c.lineTo(r * 0.85, -r * 1.5); c.lineTo(r * 0.8, -r * 0.8); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#b3261e'; for (const dx of [-0.45, 0, 0.45]) { c.beginPath(); c.arc(dx * r, -r * 1.02, r * 0.07, 0, 7); c.fill(); } }
  c.restore();
}
function robe(c: Ctx, x: number, y: number, w: number, h: number, col: string, trim = GOLD, pattern = false) {
  c.fillStyle = col; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(x - w * 0.28, y); c.quadraticCurveTo(x - w * 0.62, y + h * 0.3, x - w * 0.5, y + h); c.lineTo(x + w * 0.5, y + h); c.quadraticCurveTo(x + w * 0.62, y + h * 0.3, x + w * 0.28, y); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = trim; c.lineWidth = 5; c.beginPath(); c.moveTo(x - w * 0.24, y + 6); c.quadraticCurveTo(x, y + h * 0.16, x + w * 0.24, y + 6); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x + i * w * 0.1, y + h * 0.2); c.quadraticCurveTo(x + i * w * 0.14, y + h * 0.6, x + i * w * 0.17, y + h); c.stroke(); }
  if (pattern) { c.fillStyle = trim; for (let i = 0; i < 26; i++) { const px = x + ((i * 37) % 100 / 100 - 0.5) * w * 0.8, py = y + h * 0.15 + (((i * 53) % 100) / 100) * h * 0.8; c.beginPath(); c.arc(px, py, 3, 0, 7); c.fill(); } }
}
function hand(c: Ctx, x: number, y: number, r: number, blessing = false) {
  c.fillStyle = SKIN; c.strokeStyle = INK; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y, r * 0.7, r, 0, 0, 7); c.fill(); c.stroke();
  if (blessing) { for (const dx of [-0.25, 0.2]) { c.beginPath(); c.roundRect(x + dx * r - r * 0.16, y - r * 2.1, r * 0.32, r * 1.5, r * 0.15); c.fill(); c.stroke(); } }
}
function angel(c: Ctx, x: number, y: number, s: number, flip = 1, robeCol = '#b3261e') {
  c.fillStyle = '#f2ead2'; c.strokeStyle = INK; c.lineWidth = 2.5;
  for (const k of [-1, 1]) { c.beginPath(); c.moveTo(x, y + s * 0.6); c.quadraticCurveTo(x + k * s * 1.9, y - s * 0.6, x + k * s * 1.5, y + s * 2.0); c.quadraticCurveTo(x + k * s * 0.8, y + s * 1.4, x, y + s * 1.2); c.fill(); c.stroke(); }
  robe(c, x, y + s * 0.8, s * 1.7, s * 1.6, robeCol);
  halo(c, x, y, s * 0.78); head(c, x, y, s * 0.55, { hair: INK, tilt: 0.12 * flip });
}
function sun(c: Ctx, x: number, y: number, r: number) { c.fillStyle = '#f0c040'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }

export type IconKind = 'mary' | 'medhaneAlem' | 'michael' | 'george' | 'trinity' | 'crucifixion' | 'gabriel' | 'thorns' | 'grace' | 'gethsemane';

function paint(kind: IconKind, c: Ctx, w: number, h: number) {
  const cx = w / 2;
  if (kind === 'thorns') { // Christ crowned with thorns (dark, devotional print style)
    frame(c, w, h, '#1a1410', '#2a1c12');
    robe(c, cx, 420, 360, 300, '#7a1a1e', '#3a2a1a'); halo(c, cx, 290, 120); head(c, cx, 300, 96, { hair: '#2a160c', beard: '#2a160c', tilt: 0.14 });
    c.strokeStyle = '#4a3a22'; c.lineWidth = 9; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(cx + 8, 228 + i * 9, 100, 26, 0.14, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); }
    c.strokeStyle = '#6a5632'; c.lineWidth = 3; for (let i = 0; i < 16; i++) { const a2 = Math.PI * (1.05 + i * 0.058); const x = cx + 8 + Math.cos(a2) * 100, y = 236 + Math.sin(a2) * 26; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a2) * 16, y + Math.sin(a2) * 22 - 6); c.stroke(); }
  } else if (kind === 'grace') { // St Mary in white and blue, hands open
    frame(c, w, h, '#7fb0de', '#e9e4d2');
    c.fillStyle = '#eaf2fb'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(70 + i * 76, 640 + (i % 2) * 16, 52, 0, 7); c.fill(); }
    robe(c, cx, 250, 300, 420, '#f6f6f2', '#9fb8dc'); c.fillStyle = '#3f6fb8'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 60, 250); c.quadraticCurveTo(cx - 210, 400, cx - 170, 670); c.lineTo(cx - 100, 670); c.quadraticCurveTo(cx - 120, 420, cx - 30, 300); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(cx + 60, 250); c.quadraticCurveTo(cx + 210, 400, cx + 170, 670); c.lineTo(cx + 100, 670); c.quadraticCurveTo(cx + 120, 420, cx + 30, 300); c.closePath(); c.fill(); c.stroke();
    halo(c, cx, 180, 92); head(c, cx, 186, 64, { veil: '#f6f6f2', tilt: -0.05 }); hand(c, cx - 150, 470, 20); hand(c, cx + 150, 470, 20);
  } else if (kind === 'gethsemane') { // Christ at prayer
    frame(c, w, h, '#3a2630', '#5a3a22');
    sun(c, w - 110, 110, 34); c.fillStyle = '#4a3a30'; c.beginPath(); c.moveTo(28, 692); c.lineTo(28, 560); c.quadraticCurveTo(200, 470, 330, 560); c.lineTo(484, 600); c.lineTo(484, 692); c.fill();
    robe(c, cx - 30, 300, 320, 380, '#b3261e', GOLD); halo(c, cx + 10, 215, 96); head(c, cx + 10, 222, 70, { hair: '#2a160c', beard: '#2a160c', tilt: 0.3 }); hand(c, cx + 96, 392, 22); hand(c, cx + 128, 388, 22);
  } else if (kind === 'mary') {
    frame(c, w, h, '#1f4f8f');
    angel(c, 96, 120, 46, 1); angel(c, w - 96, 120, 46, -1, '#1f6b3a');
    robe(c, cx, 280, 380, 420, '#3a2a7a', GOLD, true);
    halo(c, cx, 215, 104); head(c, cx, 220, 76, { veil: '#3a2a7a', tilt: -0.08, crown: true });
    // the Child
    robe(c, cx + 62, 400, 170, 230, '#c9302a', GOLD);
    halo(c, cx + 62, 372, 58, true); head(c, cx + 62, 376, 40, { hair: INK, tilt: 0.1 });
    hand(c, cx - 70, 520, 24); hand(c, cx + 126, 470, 15, true);
    c.fillStyle = '#f4e6b0'; c.fillRect(cx + 10, 500, 44, 56); c.strokeStyle = INK; c.strokeRect(cx + 10, 500, 44, 56);
  } else if (kind === 'medhaneAlem') {
    frame(c, w, h, '#8f1f24');
    sun(c, 90, 96, 26); c.fillStyle = '#dfe6f0'; c.beginPath(); c.arc(w - 90, 96, 24, 0.6, 5.2); c.fill();
    robe(c, cx, 300, 400, 400, '#c9302a', GOLD); // red tunic
    c.fillStyle = '#1f4f8f'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 40, 300); c.quadraticCurveTo(cx - 250, 420, cx - 200, 700); c.lineTo(cx - 40, 700); c.quadraticCurveTo(cx - 110, 480, cx + 30, 310); c.closePath(); c.fill(); c.stroke(); // blue mantle
    halo(c, cx, 215, 112, true); head(c, cx, 222, 80, { hair: '#2a160c', beard: '#2a160c' });
    hand(c, cx + 118, 470, 26, true);
    c.fillStyle = '#f4e6b0'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(cx - 150, 440, 120, 150); c.strokeRect(cx - 150, 440, 120, 150); c.strokeStyle = '#a3241c'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - 90, 465); c.lineTo(cx - 90, 565); c.moveTo(cx - 125, 500); c.lineTo(cx - 55, 500); c.stroke();
  } else if (kind === 'michael' || kind === 'gabriel') {
    frame(c, w, h, kind === 'michael' ? '#1f6b3a' : '#2a6a8f');
    c.fillStyle = '#f2ead2'; c.strokeStyle = INK; c.lineWidth = 3;
    for (const k of [-1, 1]) { c.beginPath(); c.moveTo(cx, 300); c.quadraticCurveTo(cx + k * 300, 120, cx + k * 215, 610); c.quadraticCurveTo(cx + k * 120, 470, cx, 430); c.fill(); c.stroke(); for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(cx + k * 30 * i, 330 + i * 8); c.quadraticCurveTo(cx + k * (60 + 34 * i), 380, cx + k * (50 + 30 * i), 520 + i * 10); c.stroke(); } }
    robe(c, cx, 300, 300, 400, kind === 'michael' ? '#c9302a' : '#e8e2d0', GOLD, true);
    c.fillStyle = kind === 'michael' ? '#1f4f8f' : '#b3261e'; c.strokeStyle = INK; c.beginPath(); c.moveTo(cx - 70, 310); c.lineTo(cx + 110, 700); c.lineTo(cx + 40, 700); c.lineTo(cx - 110, 360); c.closePath(); c.fill(); c.stroke();
    halo(c, cx, 210, 104); head(c, cx, 216, 74, { hair: INK });
    hand(c, cx + 128, 430, 22);
    if (kind === 'michael') { c.strokeStyle = '#dfe6f0'; c.lineWidth = 12; c.beginPath(); c.moveTo(cx + 128, 430); c.lineTo(cx + 190, 110); c.stroke(); c.strokeStyle = GOLD; c.lineWidth = 8; c.beginPath(); c.moveTo(cx + 96, 410); c.lineTo(cx + 162, 424); c.stroke(); hand(c, cx - 128, 470, 22); c.strokeStyle = GOLD; c.lineWidth = 4; c.beginPath(); c.arc(cx - 128, 540, 44, 0, 7); c.stroke(); c.beginPath(); c.moveTo(cx - 128, 496); c.lineTo(cx - 128, 584); c.moveTo(cx - 172, 540); c.lineTo(cx - 84, 540); c.stroke(); }
    else { c.strokeStyle = GOLD; c.lineWidth = 7; c.beginPath(); c.moveTo(cx + 128, 660); c.lineTo(cx + 128, 150); c.moveTo(cx + 100, 190); c.lineTo(cx + 156, 190); c.stroke(); hand(c, cx - 120, 460, 22, true); }
  } else if (kind === 'george') {
    frame(c, w, h, '#e9c45a', '#1f4f8f');
    // dragon
    c.fillStyle = '#2c6a3a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(70, 640); c.quadraticCurveTo(200, 560, 330, 640); c.quadraticCurveTo(420, 690, 440, 620); c.lineTo(455, 665); c.quadraticCurveTo(380, 705, 250, 690); c.quadraticCurveTo(140, 700, 70, 640); c.fill(); c.stroke(); c.fillStyle = '#b3261e'; c.beginPath(); c.arc(100, 632, 6, 0, 7); c.fill();
    // white horse
    c.fillStyle = '#f7f4ec'; c.beginPath(); c.ellipse(cx, 440, 150, 78, -0.08, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(cx - 120, 410); c.quadraticCurveTo(cx - 200, 300, cx - 150, 250); c.quadraticCurveTo(cx - 215, 262, cx - 232, 310); c.quadraticCurveTo(cx - 190, 330, cx - 150, 470); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.arc(cx - 178, 282, 5, 0, 7); c.fill();
    c.fillStyle = '#f7f4ec'; for (const [dx, a] of [[-110, 0.35], [-60, -0.2], [70, 0.25], [118, -0.3]] as const) { c.save(); c.translate(cx + dx, 490); c.rotate(a); c.fillRect(-11, 0, 22, 120); c.strokeRect(-11, 0, 22, 120); c.restore(); }
    c.strokeStyle = '#b3261e'; c.lineWidth = 6; c.beginPath(); c.moveTo(cx + 140, 420); c.quadraticCurveTo(cx + 215, 440, cx + 190, 540); c.stroke();
    // rider
    robe(c, cx + 10, 250, 190, 190, '#c9302a', GOLD); c.fillStyle = '#1f6b3a'; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 40, 262); c.quadraticCurveTo(cx + 200, 240, cx + 170, 400); c.quadraticCurveTo(cx + 110, 330, cx + 40, 320); c.closePath(); c.fill(); c.stroke();
    halo(c, cx + 10, 190, 70); head(c, cx + 10, 194, 50, { hair: INK });
    c.strokeStyle = '#5a3a1a'; c.lineWidth = 8; c.beginPath(); c.moveTo(cx + 150, 90); c.lineTo(110, 628); c.stroke(); hand(c, cx + 62, 330, 18);
  } else if (kind === 'trinity') {
    frame(c, w, h, '#b3261e', '#1f4f8f');
    c.fillStyle = '#f0c040'; c.fillRect(28, 28, w - 56, 150);
    for (let i = 0; i < 3; i++) { const x = cx + (i - 1) * 150; robe(c, x, 250, 190, 380, ['#1f4f8f', '#e8e2d0', '#1f6b3a'][i], GOLD, true); halo(c, x, 185, 66); head(c, x, 190, 48, { hair: '#e9e4d8', beard: '#e9e4d8' }); hand(c, x + 34, 340, 15, true); c.fillStyle = '#2a6a8f'; c.strokeStyle = INK; c.beginPath(); c.arc(x - 30, 372, 22, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = '#dfe6f0'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(60 + i * 66, 640 + (i % 2) * 14, 44, 0, 7); c.fill(); }
  } else {
    frame(c, w, h, '#2a3f6a');
    sun(c, 96, 100, 26); c.fillStyle = '#dfe6f0'; c.beginPath(); c.arc(w - 96, 100, 24, 0, 7); c.fill();
    c.fillStyle = '#5a3a1a'; c.strokeStyle = INK; c.lineWidth = 3; c.fillRect(cx - 14, 90, 28, 580); c.strokeRect(cx - 14, 90, 28, 580); c.fillRect(cx - 170, 190, 340, 26); c.strokeRect(cx - 170, 190, 340, 26);
    c.strokeStyle = SKIN; c.lineWidth = 20; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 155, 204); c.quadraticCurveTo(cx - 60, 235, cx, 250); c.quadraticCurveTo(cx + 60, 235, cx + 155, 204); c.stroke();
    c.fillStyle = SKIN; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 34, 240); c.lineTo(cx + 34, 240); c.lineTo(cx + 24, 410); c.lineTo(cx - 24, 410); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#f4f0e4'; c.beginPath(); c.moveTo(cx - 34, 392); c.lineTo(cx + 34, 392); c.lineTo(cx + 40, 470); c.lineTo(cx - 40, 470); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = SKIN; c.lineWidth = 18; c.beginPath(); c.moveTo(cx - 10, 470); c.lineTo(cx - 4, 610); c.moveTo(cx + 10, 470); c.lineTo(cx + 4, 610); c.stroke(); c.lineCap = 'butt';
    halo(c, cx, 196, 54, true); head(c, cx, 200, 38, { hair: '#2a160c', beard: '#2a160c', tilt: -0.22 });
    robe(c, cx - 150, 430, 120, 250, '#3a2a7a'); halo(c, cx - 150, 392, 46); head(c, cx - 150, 396, 32, { veil: '#3a2a7a' });
    robe(c, cx + 150, 430, 120, 250, '#c9302a'); halo(c, cx + 150, 392, 46); head(c, cx + 150, 396, 32, { hair: INK });
  }
  // soft varnish
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
}

const cache = new Map<IconKind, THREE.CanvasTexture>();
export function iconTexture(kind: IconKind): THREE.CanvasTexture {
  let t = cache.get(kind); if (t) return t;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 720;
  paint(kind, cv.getContext('2d')!, 512, 720);
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; cache.set(kind, t); return t;
}
export function iconCanvas(kind: IconKind, w = 256, h = 360): HTMLCanvasElement {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 720; paint(kind, cv.getContext('2d')!, 512, 720);
  const out = document.createElement('canvas'); out.width = w; out.height = h; out.getContext('2d')!.drawImage(cv, 0, 0, w, h); return out;
}

// Procedural rigged human: skinned body + sculpted head with painted face + clothing layers (netela, robes, vestments).
// Isaac's proportions/colours come from reference/isaac/*; NPCs are varied but generic (no real people).
import * as THREE from 'three/webgpu';
import { canvasTex, mulberry, smooth } from '../core/geo';

export type Outfit = 'netela' | 'netelaPuffer' | 'deacon' | 'casual' | 'winter' | 'priest' | 'elder' | 'woman' | 'neighbour' | 'kid';
export type HairStyle = 'fade' | 'short' | 'grey' | 'bald' | 'afro' | 'covered';
export interface HumanOpts {
  seed?: number; height?: number; build?: number; skin?: number; outfit?: Outfit; hair?: HairStyle; moustache?: boolean; beard?: number | null;
  female?: boolean; robeColor?: number; shirt?: number; pants?: number; headScale?: number; turban?: boolean; cap?: number | null; toque?: number | null; lod?: boolean;
}

const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'upperArmL', 'foreArmL', 'handL', 'shoulderR', 'upperArmR', 'foreArmR', 'handR', 'upLegL', 'legL', 'footL', 'upLegR', 'legR', 'footR', 'clothB', 'clothL', 'clothR'] as const;
export type BoneName = (typeof BONES)[number];
const PARENT: Record<BoneName, BoneName | null> = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', shoulderL: 'chest', upperArmL: 'shoulderL', foreArmL: 'upperArmL', handL: 'foreArmL', shoulderR: 'chest', upperArmR: 'shoulderR', foreArmR: 'upperArmR', handR: 'foreArmR', upLegL: 'hips', legL: 'upLegL', footL: 'legL', upLegR: 'hips', legR: 'upLegR', footR: 'legR', clothB: 'chest', clothL: 'chest', clothR: 'chest' };
const REST: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.97, 0], spine: [0, 1.08, 0], chest: [0, 1.25, 0], neck: [0, 1.49, 0], head: [0, 1.565, 0.008],
  shoulderL: [0.07, 1.44, 0], upperArmL: [0.19, 1.435, 0], foreArmL: [0.203, 1.15, 0], handL: [0.212, 0.895, 0.01],
  shoulderR: [-0.07, 1.44, 0], upperArmR: [-0.19, 1.435, 0], foreArmR: [-0.203, 1.15, 0], handR: [-0.212, 0.895, 0.01],
  upLegL: [0.09, 0.93, 0], legL: [0.09, 0.51, 0], footL: [0.09, 0.085, 0], upLegR: [-0.09, 0.93, 0], legR: [-0.09, 0.51, 0], footR: [-0.09, 0.085, 0],
  clothB: [0, 1.32, -0.13], clothL: [0.1, 1.22, 0.13], clothR: [-0.1, 1.22, 0.13],
};
const BI = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;
type W = [BoneName, number][];

class SkinGeo {
  pos: number[] = []; col: number[] = []; uv: number[] = []; si: number[] = []; sw: number[] = []; idx: number[] = [];
  vert(x: number, y: number, z: number, c: THREE.Color, w: W, u = 0, v = 0) {
    this.pos.push(x, y, z); this.col.push(c.r, c.g, c.b); this.uv.push(u, v);
    const ws = w.slice(0, 4); const t = ws.reduce((s, e) => s + e[1], 0) || 1;
    for (let i = 0; i < 4; i++) { this.si.push(ws[i] ? BI[ws[i][0]] : 0); this.sw.push(ws[i] ? ws[i][1] / t : 0); }
    return this.pos.length / 3 - 1;
  }
  /** loft elliptical rings (vertical axis). ring: [cx, y, cz, rx, rz, color, weights] */
  tube(rings: { c: [number, number, number]; rx: number; rz: number; col: THREE.Color; w: W | ((ang: number, x: number, z: number) => W); u?: number }[], segs = 12, capTop = false, capBottom = false, shape?: (ang: number, i: number) => number) {
    const base = this.pos.length / 3;
    rings.forEach((r, i) => { for (let s = 0; s <= segs; s++) { const a = (s / segs) * Math.PI * 2; const k = shape ? shape(a, i) : 1; const x = r.c[0] + Math.sin(a) * r.rx * k, z = r.c[2] + Math.cos(a) * r.rz * k; this.vert(x, r.c[1], z, r.col, typeof r.w === 'function' ? r.w(a, x, z) : r.w, s / segs, r.u ?? i / (rings.length - 1)); } });
    for (let i = 0; i < rings.length - 1; i++) for (let s = 0; s < segs; s++) { const a = base + i * (segs + 1) + s, b = a + 1, c = a + segs + 1, d = c + 1; this.idx.push(a, c, b, b, c, d); }
    const cap = (ri: number, flip: boolean) => { const r = rings[ri]; const ci = this.vert(r.c[0], r.c[1] + (flip ? -0.012 : 0.012), r.c[2], r.col, typeof r.w === 'function' ? r.w(0, r.c[0], r.c[2]) : r.w, 0.5, 0.5); const o = base + ri * (segs + 1); for (let s = 0; s < segs; s++) flip ? this.idx.push(ci, o + s + 1, o + s) : this.idx.push(ci, o + s, o + s + 1); };
    if (capTop) cap(0, false); if (capBottom) cap(rings.length - 1, true);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx); g.computeVertexNormals(); g.computeBoundingSphere(); g.boundingSphere!.radius = 1.4; g.boundingSphere!.center.set(0, 0.9, 0);
    return g;
  }
}

/** direction on the head sphere -> equirect pixel (front = +z) */
function faceP(nx: number, ny: number, W: number, H: number): [number, number] { const s = Math.sqrt(Math.max(1e-6, 1 - ny * ny)); return [(0.25 + Math.asin(Math.max(-1, Math.min(1, nx / s))) / (2 * Math.PI)) * W, (Math.acos(ny) / Math.PI) * H]; }

function faceTexture(o: Required<Pick<HumanOpts, 'skin' | 'hair' | 'moustache' | 'female' | 'seed'>> & { beard: number | null }) {
  const W = 1024, H = 512; const skin = new THREE.Color(o.skin); const css = (c: THREE.Color, m = 1) => `rgb(${Math.round(Math.min(1, c.r * m) * 255)},${Math.round(Math.min(1, c.g * m) * 255)},${Math.round(Math.min(1, c.b * m) * 255)})`;
  const sk = new THREE.Color().copy(skin).convertLinearToSRGB();
  return canvasTex(W, H, (c) => {
    c.fillStyle = css(sk); c.fillRect(0, 0, W, H);
    const r = mulberry(o.seed + 5);
    // soft modelling: warm highlight on forehead/cheeks/nose, cooler shadow under jaw and at the sides
    const glow = (nx: number, ny: number, rad: number, col: string) => { const [x, y] = faceP(nx, ny, W, H); const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    glow(0, 0.36, 70, 'rgba(255,200,150,0.16)'); glow(0.3, -0.12, 44, 'rgba(255,170,130,0.14)'); glow(-0.3, -0.12, 44, 'rgba(255,170,130,0.14)'); glow(0, -0.08, 22, 'rgba(255,210,170,0.2)');
    glow(0.62, -0.3, 60, 'rgba(40,15,5,0.2)'); glow(-0.62, -0.3, 60, 'rgba(40,15,5,0.2)'); glow(0, -0.9, 90, 'rgba(30,10,5,0.35)');
    for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,25,10' : '255,200,160'},${0.02 + r() * 0.03})`; c.fillRect(r() * W, r() * H, 2, 2); }
    const ink = '#150c08';
    // eyes
    for (const s of [-1, 1]) {
      const [ex, ey] = faceP(s * 0.39, 0.1, W, H); const ew = 27, eh = 10;
      glow(s * 0.39, 0.12, 36, 'rgba(40,15,8,0.22)');
      c.save(); c.translate(ex, ey); c.scale(s, 1);
      c.fillStyle = '#efe6dc'; c.beginPath(); c.moveTo(-ew, 1.5); c.quadraticCurveTo(-2, -eh * 1.5, ew, -1); c.quadraticCurveTo(0, eh * 1.25, -ew, 1.5); c.fill();
      c.save(); c.clip(); c.fillStyle = '#2a160c'; c.beginPath(); c.arc(1, 0, 9.8, 0, 7); c.fill(); c.fillStyle = '#080404'; c.beginPath(); c.arc(1, 0, 4.6, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(4.2, -3.2, 2.0, 0, 7); c.fill(); c.restore();
      c.strokeStyle = ink; c.lineWidth = o.female ? 3.4 : 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-ew - 1, 1.5); c.quadraticCurveTo(-2, -eh * 1.6, ew + 2, -1.5); c.stroke();
      c.strokeStyle = 'rgba(40,18,10,0.55)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-ew, 2); c.quadraticCurveTo(0, eh * 1.3, ew, -0.5); c.stroke();
      c.strokeStyle = 'rgba(30,12,6,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-ew + 2, -8); c.quadraticCurveTo(0, -15, ew, -8); c.stroke();
      c.restore();
      // brows: thick and fairly straight
      const [bx, by] = faceP(s * 0.4, 0.245, W, H); c.save(); c.translate(bx, by); c.scale(s * 1.3, 1.3); c.fillStyle = ink; c.beginPath(); c.moveTo(-25, 3); c.quadraticCurveTo(-4, -6.5, 28, -1.5); c.lineTo(29, 2.5); c.quadraticCurveTo(-2, 1.5, -24, 8.5); c.closePath(); c.fill(); c.restore();
    }
    // nose: bridge highlight, nostrils
    const [nx0, ny0] = faceP(0, -0.19, W, H);
    c.fillStyle = 'rgba(25,8,4,0.55)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(nx0 + s * 12, ny0 + 2, 7, 3.8, s * 0.3, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(40,15,8,0.3)'; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(nx0 + s * 20, ny0 - 10); c.quadraticCurveTo(nx0 + s * 27, ny0 + 2, nx0 + s * 17, ny0 + 9); c.stroke(); }
    // lips: full, lower lip lighter rose
    const [lx, ly] = faceP(0, -0.44, W, H); const lw = o.female ? 36 : 39;
    c.fillStyle = 'rgb(112,58,52)'; c.beginPath(); c.moveTo(lx - lw, ly); c.quadraticCurveTo(lx - 12, ly - 16, lx, ly - 9); c.quadraticCurveTo(lx + 12, ly - 16, lx + lw, ly); c.quadraticCurveTo(lx, ly + 3, lx - lw, ly); c.fill();
    c.fillStyle = 'rgb(168,96,92)'; c.beginPath(); c.moveTo(lx - lw, ly); c.quadraticCurveTo(lx, ly + 30, lx + lw, ly); c.quadraticCurveTo(lx, ly + 3, lx - lw, ly); c.fill();
    c.fillStyle = 'rgba(255,190,180,0.25)'; c.beginPath(); c.ellipse(lx, ly + 11, 16, 5, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(40,12,10,0.8)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(lx - lw, ly); c.quadraticCurveTo(lx, ly + 3, lx + lw, ly); c.stroke();
    if (o.moustache) { for (let i = 0; i < 420; i++) { const t = r() * 2 - 1; const x = lx + t * 44, y = ly - 19 - (1 - t * t) * 5 + (r() - 0.5) * 7 + Math.abs(t) * 7; c.fillStyle = `rgba(15,8,5,${0.25 + r() * 0.3})`; c.fillRect(x, y, 2, 2.4); } }
    if (o.beard !== null) { const bc = new THREE.Color(o.beard); for (let i = 0; i < 9000; i++) { const a = r() * 2 - 1, d = r(); const nxx = a * 0.72, nyy = -0.5 - d * 0.5 + Math.abs(a) * 0.42; if (nyy > -0.28 || Math.abs(nxx) < 0.3 && nyy > -0.56) continue; const [x, y] = faceP(nxx, Math.max(-0.99, nyy), W, H); c.fillStyle = `rgba(${Math.round(bc.r * 255)},${Math.round(bc.g * 255)},${Math.round(bc.b * 255)},${0.5 + r() * 0.4})`; c.fillRect(x, y, 3, 3); } }
    // hair: painted scalp (fade) — the volume on top is separate geometry
    if (o.hair !== 'bald' && o.hair !== 'covered') {
      const hc = o.hair === 'grey' ? [150, 150, 150] : [14, 11, 10];
      const img = c.getImageData(0, 0, W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = y / H, u = x / W; const ny = Math.cos(v * Math.PI), sn = Math.sin(v * Math.PI); const ph = u * 2 * Math.PI; const dx = -Math.cos(ph) * sn, dz = Math.sin(ph) * sn;
        const line = hairline(dx, ny, dz, o.hair);
        // tapered fade: full density above the line, stippled falloff below it at the sides/back
        const fadeLen = o.hair === 'fade' ? (dz > 0.35 ? 0.012 : 0.34) : 0.1; let a = smooth(line - fadeLen, line, ny);
        if (dz > 0.2 && o.hair === 'fade') a = ny > line ? 1 : 0; // sharp edge-up at the forehead and temples
        if (a <= 0) continue; const n = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1; const k = a >= 1 ? 0.96 : (Math.abs(n) < a * a ? 0.85 : 0) * a + a * 0.25;
        const i = (y * W + x) * 4; d[i] += (hc[0] - d[i]) * k; d[i + 1] += (hc[1] - d[i + 1]) * k; d[i + 2] += (hc[2] - d[i + 2]) * k;
      }
      c.putImageData(img, 0, 0);
    }
  }, { repeat: false });
}
/** hairline height (ny) as a function of direction */
function hairline(dx: number, ny: number, dz: number, style: HairStyle) {
  if (dz > 0.25) return 0.6 - smooth(0.42, 0.62, Math.abs(dx)) * 0.2 + (style === 'grey' ? 0.1 : 0);   // forehead: straight line-up
  if (dz > -0.2) return 0.36 - (0.25 - dz) * 0.6;                                    // temples, over the ear
  return -0.15;                                                                     // back, to the nape
}

function headGeometry(female: boolean) {
  const g = new THREE.SphereGeometry(1, 44, 32); const p = g.attributes.position; const v = new THREE.Vector3();
  const bump = (d: THREE.Vector3, cx: number, cy: number, cz: number, s: number) => Math.exp(-((d.x - cx) ** 2 + (d.y - cy) ** 2 + (d.z - cz) ** 2) / (2 * s * s));
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize(); const d = v.clone(); let rx = 0.076, ry = 0.118, rz = 0.097;
    // slim oval face: jaw tapers to a defined chin
    const jaw = smooth(-0.05, -0.95, d.y); rx *= 1 - 0.17 * smooth(-0.25, -0.95, d.y) * (d.z > -0.2 ? 1 : 0.5); ry *= 1 - 0.06 * smooth(-0.6, -1, d.y); rz *= 1 - 0.1 * jaw;
    if (d.z < 0) { rz *= 1 + 0.07 * smooth(0, -1, d.z) * smooth(-0.6, 0.5, d.y); }
    let x = d.x * rx, y = d.y * ry, z = d.z * rz;
    const front = smooth(0.2, 0.8, d.z);
    z *= 1 - 0.035 * front;                                                    // flatter facial plane
    z += 0.0045 * (bump(d, 0.52, -0.06, 0.78, 0.2) + bump(d, -0.52, -0.06, 0.78, 0.2)); // high cheekbones
    x += 0.004 * (bump(d, 0.62, -0.08, 0.7, 0.2) - bump(d, -0.62, -0.08, 0.7, 0.2));
    z += 0.0045 * bump(d, 0, 0.24, 0.95, 0.28) * (female ? 0.4 : 1);            // brow
    z -= 0.0065 * (bump(d, 0.36, 0.11, 0.92, 0.13) + bump(d, -0.36, 0.11, 0.92, 0.13)); // eye sockets
    // straight nose: ridge growing to the tip, flared base
    const ridge = Math.exp(-(d.x * d.x) / (2 * 0.07 * 0.07)) * smooth(0.22, -0.16, d.y) * smooth(-0.3, -0.19, d.y) * front;
    z += 0.024 * ridge; z += 0.007 * Math.exp(-(d.x * d.x) / (2 * 0.17 * 0.17)) * bump(d, 0, -0.2, 0.97, 0.09);
    // full lips
    z += 0.0085 * Math.exp(-(d.x * d.x) / (2 * 0.2 * 0.2)) * (Math.exp(-((d.y + 0.385) ** 2) / (2 * 0.035 ** 2)) + 1.15 * Math.exp(-((d.y + 0.49) ** 2) / (2 * 0.045 ** 2))) * front;
    z -= 0.003 * Math.exp(-(d.x * d.x) / (2 * 0.2 * 0.2)) * Math.exp(-((d.y + 0.435) ** 2) / (2 * 0.012 ** 2)) * front;
    z += 0.006 * bump(d, 0, -0.8, 0.6, 0.2); y -= 0.004 * bump(d, 0, -0.9, 0.4, 0.25);       // chin
    p.setXYZ(i, x, y + 0.118, z + 0.012);
  }
  g.computeVertexNormals(); return g;
}
function hairGeometry(style: HairStyle, seed: number) {
  const src = new THREE.SphereGeometry(1, 40, 28); const p = src.attributes.position; const v = new THREE.Vector3(); const r = mulberry(seed);
  const keep: boolean[] = []; const thick = style === 'afro' ? 0.045 : style === 'fade' ? 0.011 : 0.007;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize(); const line = hairline(v.x, v.y, v.z, style) + (style === 'fade' ? (v.z > 0.25 ? 0 : 0.2) : 0.04); keep.push(v.y > line - 0.02);
    const edge = smooth(line - 0.02, line + 0.2, v.y); const t = thick * (style === 'fade' ? edge : 1) * (0.8 + r() * 0.5);
    let rx = 0.0765, rz = 0.0975; if (v.z < 0) rz *= 1 + 0.07 * smooth(0, -1, v.z) * smooth(-0.6, 0.5, v.y);
    p.setXYZ(i, v.x * (rx + t), v.y * (0.118 + t) + 0.118, v.z * (rz + t) + 0.012);
  }
  const idx: number[] = []; const si = src.index!; for (let i = 0; i < si.count; i += 3) { const a = si.getX(i), b = si.getX(i + 1), c = si.getX(i + 2); if (keep[a] && keep[b] && keep[c]) idx.push(a, b, c); }
  src.setIndex(idx); src.computeVertexNormals(); return src;
}

function netelaTexture(border: number[], thick = false) {
  return canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = thick ? '#f1ede2' : '#fbfaf6'; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.09; c.strokeStyle = '#8a8a80'; c.lineWidth = 1; for (let i = 0; i < w; i += 3) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); } c.globalAlpha = 1;
    // soft fold shading
    for (let i = 0; i < 9; i++) { const x = (i / 9) * w + 20; const g = c.createLinearGradient(x - 16, 0, x + 16, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(120,120,130,0.13)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.save(); c.translate(0, 0); c.transform(1, 0, 0.25 * (i % 2 ? 1 : -1), 1, 0, 0); c.fillRect(x - 16, 0, 32, h); c.restore(); }
    // tibeb: narrow woven border along the hem and along the diagonal front edge
    const stripe = (draw: () => void) => { c.save(); draw(); c.restore(); };
    const cols = border.map((b) => '#' + new THREE.Color(b).getHexString());
    const bandH = thick ? 16 : 12;
    stripe(() => { cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, h - 26 + i * (bandH / cols.length), w, bandH / cols.length); }); c.fillStyle = cols[0]; for (let x = 0; x < w; x += 14) { c.beginPath(); c.moveTo(x, h - 30); c.lineTo(x + 5, h - 36); c.lineTo(x + 10, h - 30); c.fill(); } });
    stripe(() => { c.translate(w * 0.20, 0); c.transform(1, 0, 0.42, 1, 0, 0); cols.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * (bandH / cols.length), 0, bandH / cols.length, h); }); });
  }, { repeat: false });
}

export class Human {
  root = new THREE.Group();         // faces -z (game forward) — the model inside faces +z and is flipped
  model = new THREE.Group();
  bones = {} as Record<BoneName, THREE.Bone>;
  skeleton!: THREE.Skeleton;
  body!: THREE.SkinnedMesh; cloth: THREE.SkinnedMesh | null = null; head!: THREE.Mesh;
  opts: Required<Omit<HumanOpts, 'beard' | 'cap' | 'toque' | 'robeColor'>> & { beard: number | null; cap: number | null; toque: number | null; robeColor: number | null };
  // animation state
  phase = 0; speed = 0; action = ''; actionT = 0; actionDur = 1; actionHold = false; private actW = 0; private prevAction = '';
  private clothVel = new THREE.Vector3(); private clothAng = new THREE.Vector2(); private clothAngV = new THREE.Vector2(); private lastPos = new THREE.Vector3(); private lastYaw = 0;
  held: Partial<Record<'L' | 'R', THREE.Object3D>> = {};
  time = 0; blink = 0; seated = false; wind = 0;
  height: number;

  constructor(o: HumanOpts = {}) {
    const seed = o.seed ?? 1; const r = mulberry(seed * 7 + 3);
    const outfit = o.outfit ?? 'casual';
    this.opts = {
      seed, height: o.height ?? 1.8, build: o.build ?? 1, skin: o.skin ?? 0x5a3420, outfit, hair: o.hair ?? 'short', moustache: o.moustache ?? false, beard: o.beard ?? null,
      female: o.female ?? false, robeColor: o.robeColor ?? null, shirt: o.shirt ?? [0x2a2f38, 0x5a6a78, 0x7a3a34, 0x3a5a48, 0xd8d4c8, 0x444a66][Math.floor(r() * 6)], pants: o.pants ?? [0x23262c, 0x2a3348, 0x3a3a3c, 0x4a4234][Math.floor(r() * 4)],
      headScale: o.headScale ?? 1, turban: o.turban ?? false, cap: o.cap ?? null, toque: o.toque ?? null, lod: o.lod ?? false,
    };
    this.height = this.opts.height;
    this.build();
    this.model.rotation.y = Math.PI; this.root.add(this.model);
    this.model.scale.setScalar(this.opts.height / 1.8);
  }

  private build() {
    const o = this.opts; const B = o.build;
    for (const n of BONES) { const b = new THREE.Bone(); b.name = n; this.bones[n] = b; }
    for (const n of BONES) { const par = PARENT[n]; const p = REST[n]; if (par) { const q = REST[par]; this.bones[n].position.set(p[0] - q[0], p[1] - q[1], p[2] - q[2]); this.bones[par].add(this.bones[n]); } else this.bones[n].position.set(p[0], p[1], p[2]); }
    this.model.add(this.bones.hips);
    this.skeleton = new THREE.Skeleton(BONES.map((n) => this.bones[n]));
    this.model.updateMatrixWorld(true); this.skeleton.calculateInverses();

    const skin = new THREE.Color(o.skin); const shirt = new THREE.Color(o.shirt), pants = new THREE.Color(o.pants);
    const puffer = o.outfit === 'netelaPuffer' || o.outfit === 'winter' || o.outfit === 'neighbour';
    const longRobe = o.outfit === 'deacon' || o.outfit === 'priest' || o.outfit === 'woman';
    const robeCol = new THREE.Color(o.robeColor ?? (o.outfit === 'woman' ? 0xf6f4ee : o.outfit === 'priest' ? 0x7f9a86 : 0xf4f1e8));
    const top = longRobe ? robeCol : puffer ? new THREE.Color(o.outfit === 'netelaPuffer' ? 0x121316 : o.shirt) : o.outfit === 'netela' ? new THREE.Color(0xf4f2ec) : o.outfit === 'elder' ? new THREE.Color(0x3a3d44) : shirt;
    const sleeveLong = o.outfit !== 'casual';
    const g = new SkinGeo(); const pf = puffer ? 1.22 : longRobe ? 1.08 : 1;
    const band = (y: number) => (puffer ? 1 - 0.1 * Math.abs(Math.sin(y * 34)) : 1);
    // ---- torso ----
    const T: [number, number, number, W][] = [[0.9, 0.132, 0.1, [['hips', 1]]], [0.97, 0.158, 0.112, [['hips', 1]]], [1.03, 0.148, 0.104, [['hips', 0.6], ['spine', 0.4]]], [1.09, 0.138, 0.098, [['spine', 1]]], [1.17, 0.146, 0.102, [['spine', 0.5], ['chest', 0.5]]], [1.26, 0.163, 0.11, [['chest', 1]]], [1.34, 0.178, 0.114, [['chest', 1]]], [1.41, 0.182, 0.108, [['chest', 1]]], [1.455, 0.14, 0.092, [['chest', 1]]], [1.485, 0.07, 0.066, [['chest', 0.6], ['neck', 0.4]]]];
    g.tube(T.map(([y, rx, rz, w]) => { const isTop = y > 1.0; const c = (isTop ? top : longRobe ? robeCol : pants).clone().multiplyScalar(band(y)); const k = isTop ? pf : 1; return { c: [0, y, 0.005] as [number, number, number], rx: rx * B * k, rz: rz * (0.5 + 0.5 * B) * k, col: y > 1.47 && !puffer && !longRobe ? skin : c, w }; }), 14, false, true);
    // neck
    g.tube([[1.47, 0.05], [1.52, 0.044], [1.59, 0.046]].map(([y, rr], i) => ({ c: [0, y, 0.004 + i * 0.004] as [number, number, number], rx: rr, rz: rr * 1.05, col: skin, w: (i === 0 ? [['chest', 0.5], ['neck', 0.5]] : i === 1 ? [['neck', 1]] : [['neck', 0.4], ['head', 0.6]]) as W })), 10);
    // ---- arms ----
    for (const s of [1, -1]) {
      const S = s > 0 ? 'L' : 'R'; const ua = `upperArm${S}` as BoneName, fa = `foreArm${S}` as BoneName;
      const A: [number, number, number, W][] = [[1.475, 0.185, 0.03, [['chest', 0.5], [ua, 0.5]]], [1.45, 0.19, 0.052, [['chest', 0.25], [ua, 0.75]]], [1.4, 0.194, 0.054, [[ua, 1]]], [1.3, 0.198, 0.046, [[ua, 1]]], [1.2, 0.201, 0.041, [[ua, 0.8], [fa, 0.2]]], [1.15, 0.203, 0.04, [[ua, 0.5], [fa, 0.5]]], [1.1, 0.205, 0.042, [[fa, 0.85], [ua, 0.15]]], [1.0, 0.208, 0.036, [[fa, 1]]], [0.915, 0.211, 0.029, [[fa, 1]]]];
      g.tube(A.map(([y, x, rr, w]) => { const sleeve = sleeveLong ? y > 0.93 : y > 1.28; const k = sleeve ? pf * (puffer ? 1.18 : 1) : 1; return { c: [s * x * (0.6 + 0.4 * B), y, 0] as [number, number, number], rx: rr * k * (0.7 + 0.3 * B), rz: rr * k * 1.05 * (0.7 + 0.3 * B), col: sleeve ? top.clone().multiplyScalar(band(y)) : skin, w }; }), 9, true, true);
      // hand (rigid on the hand bone)
      const hb = `hand${S}` as BoneName;
      g.tube([[0.91, 0.022, 0.016], [0.87, 0.04, 0.02], [0.815, 0.04, 0.018], [0.765, 0.03, 0.014], [0.74, 0.016, 0.01]].map(([y, rx, rz]) => ({ c: [s * 0.212, y, 0.008] as [number, number, number], rx: rz, rz: rx, col: skin, w: [[hb, 1]] as W })), 8, false, true);
      g.tube([[0.87, 0.012], [0.83, 0.012], [0.8, 0.006]].map(([y, rr], i) => ({ c: [s * 0.212, y, 0.05 + i * 0.008] as [number, number, number], rx: rr, rz: rr, col: skin, w: [[hb, 1]] as W })), 6, false, true);
      // ---- legs ----
      const ul = `upLeg${S}` as BoneName, lg = `leg${S}` as BoneName, ft = `foot${S}` as BoneName;
      const L: [number, number, W][] = [[0.95, 0.086, [['hips', 0.6], [ul, 0.4]]], [0.88, 0.09, [[ul, 0.85], ['hips', 0.15]]], [0.76, 0.082, [[ul, 1]]], [0.62, 0.068, [[ul, 1]]], [0.55, 0.06, [[ul, 0.7], [lg, 0.3]]], [0.51, 0.055, [[ul, 0.5], [lg, 0.5]]], [0.46, 0.054, [[lg, 0.8], [ul, 0.2]]], [0.36, 0.056, [[lg, 1]]], [0.22, 0.043, [[lg, 1]]], [0.1, 0.04, [[lg, 0.7], [ft, 0.3]]]];
      g.tube(L.map(([y, rr, w]) => ({ c: [s * 0.09 * (0.75 + 0.25 * B), y, 0] as [number, number, number], rx: rr * (0.75 + 0.25 * B), rz: rr * 1.06 * (0.75 + 0.25 * B), col: pants, w })), 10, false, true);
      // shoe
      const boot = o.outfit === 'winter' || o.outfit === 'netelaPuffer' || o.outfit === 'neighbour'; const shoeC = new THREE.Color(o.outfit === 'woman' ? 0xe8e4da : boot ? 0x2a211c : 0x18181a);
      const base = g.pos.length / 3; const seg = 10, st = 6;
      for (let j = 0; j <= st; j++) for (let k = 0; k <= seg; k++) { const a = (k / seg) * Math.PI * 2, t = j / st; const zz = -0.085 + t * 0.29; const wv = 0.05 * Math.sin(Math.min(1, t * 1.4 + 0.25) * Math.PI) ** 0.6 + 0.004; const hh = (boot ? 0.075 : 0.058) * (1 - t * 0.55); const yy = Math.max(0, 0.045 + Math.cos(a) * hh * (Math.cos(a) > 0 ? 1.1 : 0.9)); g.vert(s * 0.09 * (0.75 + 0.25 * B) + Math.sin(a) * wv, yy, zz + 0.0, shoeC, [[ft, 1]]); }
      for (let j = 0; j < st; j++) for (let k = 0; k < seg; k++) { const a = base + j * (seg + 1) + k, b = a + 1, c = a + seg + 1, d = c + 1; g.idx.push(a, c, b, b, c, d); }
    }
    // ---- long robe / dress skirt ----
    if (longRobe) {
      const hem = o.outfit === 'woman' ? 0.1 : 0.14;
      const R: [number, number, number][] = [[1.05, 0.15, 0.108], [0.95, 0.172, 0.125], [0.75, 0.19, 0.145], [0.5, 0.215, 0.17], [0.3, 0.235, 0.19], [hem, 0.25, 0.205]];
      g.tube(R.map(([y, rx, rz]) => ({ c: [0, y, 0.004] as [number, number, number], rx: rx * B * 1.02, rz: rz * 1.02, col: (y < hem + 0.07 && o.outfit === 'woman' ? new THREE.Color(0xc8a23a) : robeCol).clone(), w: ((a: number, x: number) => { const t = smooth(1.0, 0.3, y); const side = x > 0 ? 'upLegL' : 'upLegR', low = x > 0 ? 'legL' : 'legR'; return [['hips', 1 - t * 0.75], [side, t * 0.45], [low, t * 0.3]] as W; }) })), 16);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 });
    this.body = new THREE.SkinnedMesh(g.build(), mat); this.body.bind(this.skeleton); this.body.castShadow = true; this.body.receiveShadow = true; this.body.frustumCulled = false; this.model.add(this.body);

    // ---- head ----
    const hs = o.headScale;
    this.head = new THREE.Mesh(headGeometry(o.female), new THREE.MeshStandardMaterial({ map: faceTexture({ skin: o.skin, hair: o.hair, moustache: o.moustache, female: o.female, seed: o.seed, beard: o.beard }), roughness: 0.62 }));
    this.head.castShadow = true; this.head.scale.setScalar(hs); this.bones.head.add(this.head);
    const earM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 });
    for (const s of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), earM); e.scale.set(0.45, 1.25, 0.8); e.position.set(s * 0.077 * hs, 0.11 * hs, 0.0); e.rotation.y = s * 0.35; this.bones.head.add(e); }
    if (o.hair !== 'bald' && o.hair !== 'covered' && !o.turban) { const hm = new THREE.Mesh(hairGeometry(o.hair, o.seed), new THREE.MeshStandardMaterial({ color: o.hair === 'grey' ? 0x9a9a9a : 0x0c0a09, roughness: 1 })); hm.scale.setScalar(hs); hm.castShadow = true; this.bones.head.add(hm); }
    if (o.turban) { // white wrapped turban (temtem) worn by priests
      const tm = new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.9 });
      const t1 = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.036, 8, 18), tm); t1.rotation.x = Math.PI / 2; t1.position.set(0, 0.185, 0.008); t1.scale.set(1, 1.18, 1.25);
      const t2 = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 10, 0, 6.3, 0, Math.PI / 2), tm); t2.position.set(0, 0.19, 0.008); t2.scale.set(1, 0.75, 1.16); this.bones.head.add(t1, t2);
    }
    if (o.cap !== null) { const cm = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.08, 0.1, 18), new THREE.MeshStandardMaterial({ color: o.cap, roughness: 0.8 })); cm.position.set(0, 0.215, 0.006); cm.scale.z = 1.18; this.bones.head.add(cm); }
    if (o.toque !== null) { const tq = new THREE.Mesh(new THREE.SphereGeometry(0.086, 14, 10, 0, 6.3, 0, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: o.toque, roughness: 1 })); tq.position.set(0, 0.15, 0.008); tq.scale.set(1, 1.15, 1.2); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), tq.material); pom.position.set(0, 0.255, 0.008); this.bones.head.add(tq, pom); }

    // ---- cloth layer: netela / gabi / vestment cape / woman's head covering ----
    const wantsNetela = o.outfit === 'netela' || o.outfit === 'netelaPuffer' || o.outfit === 'elder' || o.outfit === 'woman' || o.outfit === 'deacon' || o.outfit === 'priest';
    if (wantsNetela) {
      const cg = new SkinGeo(); const thick = o.outfit === 'elder'; const k = (puffer ? 1.22 : 1) * (thick ? 1.08 : 1);
      const cape = o.outfit === 'deacon' || o.outfit === 'priest';
      const white = new THREE.Color(0xffffff);
      const hemY = cape ? 1.12 : thick ? 0.8 : 0.9;
      const N: [number, number, number][] = [[1.525, 0.074, 0.07], [1.49, 0.12, 0.092], [1.455, 0.19, 0.112], [1.4, 0.226, 0.128], [1.3, 0.234, 0.136], [1.18, 0.232, 0.14], [1.06, 0.226, 0.142], [0.97, 0.222, 0.143], [hemY, 0.22, 0.145]].filter((e, i, arr) => e[0] >= hemY - 1e-6 || i === arr.length - 1) as [number, number, number][];
      cg.tube(N.map(([y, rx, rz], i) => ({ c: [0, y, 0.004] as [number, number, number], rx: rx * k * (0.8 + 0.2 * B), rz: rz * k, col: white, u: 1 - i / (N.length - 1),
        w: ((a: number, x: number, z: number) => { const hang = smooth(1.34, hemY, y); const arm = Math.abs(x) > 0.15 ? smooth(0.15, 0.24, Math.abs(x)) * (1 - hang * 0.4) : 0; const armB = x > 0 ? 'upperArmL' : 'upperArmR'; const cb: BoneName = z < 0 ? 'clothB' : x > 0 ? 'clothL' : 'clothR'; return [['chest', Math.max(0.05, (1 - hang) * (1 - arm * 0.6))], [armB, arm * 0.6], [cb, hang * 0.85], ['spine', hang * 0.15]] as W; }) })), 22, false, false,
        (a, i) => 1 + (0.012 + 0.05 * (i / N.length) ** 2) * Math.sin(a * 6 + i * 0.7) + (Math.cos(a) > 0 ? 0.02 * Math.sin(a * 2) * (i / N.length) : 0));
      if (o.outfit === 'woman') { // netela drawn up over the head
        const Hd: [number, number, number, number][] = [[1.5, 0.11, 0.09, 0], [1.56, 0.1, 0.1, -0.005], [1.64, 0.098, 0.118, -0.012], [1.72, 0.092, 0.118, -0.014], [1.775, 0.06, 0.085, -0.012], [1.795, 0.012, 0.02, -0.01]];
        cg.tube(Hd.map(([y, rx, rz, zo], i) => ({ c: [0, y, zo] as [number, number, number], rx: rx * o.headScale, rz: rz * o.headScale, col: white, u: 0.05, w: (i < 2 ? [['neck', 0.5], ['chest', 0.5]] : [['head', 1]]) as W })), 22, false, false, (a) => (Math.cos(a) > 0.55 ? 0.0 : 1));
      }
      const border = cape ? [0xc8a23a, 0x8a1f2a, 0xc8a23a] : o.outfit === 'woman' ? [[0x1f6b3a, 0xe2b33c, 0xb3261e], [0x2a3f8a, 0xe2b33c], [0x8a1f5a, 0xe2b33c, 0x1f6b3a]][o.seed % 3] : [0x1f6b3a, 0xe2b33c, 0xb3261e];
      let tex: THREE.Texture;
      if (cape) tex = canvasTex(256, 256, (c, w, h) => { c.fillStyle = o.outfit === 'priest' ? '#e9dfc0' : '#8a1f2a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9b03a'; for (let y = 20; y < h; y += 44) for (let x = 16 + ((y / 44) % 2) * 22; x < w; x += 44) { c.fillRect(x - 2, y - 11, 4, 22); c.fillRect(x - 8, y - 5, 16, 4); } c.fillRect(0, h - 16, w, 16); c.fillStyle = '#8a1f2a'; for (let x = 0; x < w; x += 12) c.fillRect(x, h - 12, 6, 8); }, { repeat: false });
      else tex = netelaTexture(border, thick);
      const cm = new THREE.MeshStandardMaterial({ map: tex, roughness: cape ? 0.55 : 0.9, metalness: cape ? 0.25 : 0, side: THREE.DoubleSide, });
      this.cloth = new THREE.SkinnedMesh(cg.build(), cm); this.cloth.bind(this.skeleton); this.cloth.castShadow = true; this.cloth.frustumCulled = false; this.model.add(this.cloth);
    }
  }

  /** attach a prop to a hand (null to release) */
  hold(side: 'L' | 'R', obj: THREE.Object3D | null, offset: [number, number, number] = [0, -0.12, 0.03], rot: [number, number, number] = [0, 0, 0]) {
    const b = this.bones[`hand${side}` as BoneName]; const old = this.held[side]; if (old) b.remove(old); delete this.held[side];
    if (obj) { obj.position.set(...offset); obj.rotation.set(...rot); b.add(obj); this.held[side] = obj; }
  }
  play(action: string, dur = 1.6, hold = false) { if (this.action !== action) { this.prevAction = this.action; this.action = action; this.actionT = 0; } this.actionDur = dur; this.actionHold = hold; }
  stop() { this.action = ''; }

  /** drive the skeleton. speed in m/s (horizontal), grounded for jump pose. */
  update(dt: number, speed: number, grounded = true) {
    this.time += dt; const t = this.time; const b = this.bones; const sc = this.height / 1.8;
    this.speed += (speed - this.speed) * Math.min(1, dt * 10);
    const sp = this.speed / sc; const w = smooth(0.15, 1.2, sp), run = smooth(3.2, 5.6, sp);
    this.phase += dt * (sp < 0.12 ? 0 : 4.6 + sp * 1.25);
    const ph = this.phase;
    for (const n of BONES) b[n].rotation.set(0, 0, 0);
    b.hips.position.y = REST.hips[1];
    // idle
    const br = Math.sin(t * 1.5 + this.opts.seed);
    b.chest.rotation.x = 0.012 * br; b.head.rotation.x = -0.01 * br + 0.02 * Math.sin(t * 0.37 + this.opts.seed); b.head.rotation.y = 0.05 * Math.sin(t * 0.23 + this.opts.seed * 2) * (1 - w);
    b.upperArmL.rotation.z = 0.07; b.upperArmR.rotation.z = -0.07; b.foreArmL.rotation.x = -0.14; b.foreArmR.rotation.x = -0.14;
    // locomotion
    if (w > 0.001 && !this.seated) {
      const A = (0.42 + 0.42 * run) * w, K = (0.75 + 0.75 * run) * w;
      for (const [S, o] of [['L', 0], ['R', Math.PI]] as const) {
        const th = ph + o; const hip = Math.sin(th) * A; b[`upLeg${S}` as BoneName].rotation.x = -hip + 0.08 * run;
        b[`leg${S}` as BoneName].rotation.x = Math.max(0, Math.sin(th - 1.05)) * K + 0.06 * w; b[`foot${S}` as BoneName].rotation.x = -Math.max(0, Math.sin(th + 0.3)) * 0.25 * w + Math.max(0, Math.sin(th - 1.6)) * 0.4 * w;
        b[`upperArm${S}` as BoneName].rotation.x = Math.sin(th) * (0.34 + 0.4 * run) * w; b[`foreArm${S}` as BoneName].rotation.x = -(0.2 + 1.1 * run) * w - Math.max(0, -Math.sin(th)) * 0.25 * w;
      }
      b.hips.position.y -= (0.012 + 0.02 * run) * w * (1 - Math.abs(Math.sin(ph)) ) + 0.01 * w;
      b.hips.rotation.y = Math.sin(ph) * 0.07 * w; b.chest.rotation.y = -Math.sin(ph) * 0.12 * w; b.spine.rotation.x = 0.03 * w + 0.16 * run; b.hips.rotation.z = Math.cos(ph) * 0.025 * w;
    }
    if (!grounded && !this.seated) { b.upLegL.rotation.x = -0.5; b.legL.rotation.x = 0.9; b.upLegR.rotation.x = 0.15; b.legR.rotation.x = 0.4; b.upperArmL.rotation.z = 0.5; b.upperArmR.rotation.z = -0.5; }
    // one-shot / held actions
    const target = this.action ? 1 : 0; this.actW += (target - this.actW) * Math.min(1, dt * 7);
    if (this.action) { this.actionT += dt; if (!this.actionHold && this.actionT >= this.actionDur) { this.prevAction = this.action; this.action = ''; } }
    const name = this.action || this.prevAction;
    if (name && this.actW > 0.002) this.applyAction(name, this.actionHold ? this.actionT : Math.min(1, this.actionT / this.actionDur), this.actW);
    // cloth spring bones (netela sway from motion + wind)
    if (this.cloth) {
      const wp = this.root.getWorldPosition(new THREE.Vector3()); const v = wp.clone().sub(this.lastPos).divideScalar(Math.max(dt, 1e-3)); this.lastPos.copy(wp);
      const yaw = this.root.rotation.y + (this.root.parent ? this.root.parent.rotation.y : 0);
      const fwd = v.x * -Math.sin(yaw) + v.z * -Math.cos(yaw), sideV = v.x * Math.cos(yaw) - v.z * Math.sin(yaw);
      const tx = THREE.MathUtils.clamp(fwd * 0.07 + this.wind * (0.06 + 0.05 * Math.sin(t * 2.3)), -0.5, 0.5), tz = THREE.MathUtils.clamp(sideV * 0.06 + this.wind * 0.04 * Math.sin(t * 1.7), -0.4, 0.4);
      this.clothAngV.x += ((tx - this.clothAng.x) * 60 - this.clothAngV.x * 7) * dt; this.clothAngV.y += ((tz - this.clothAng.y) * 60 - this.clothAngV.y * 7) * dt;
      this.clothAng.x += this.clothAngV.x * dt; this.clothAng.y += this.clothAngV.y * dt;
      const sw = Math.sin(ph * 1) * 0.05 * w;
      b.clothB.rotation.set(-this.clothAng.x * 0.9 - 0.02, 0, this.clothAng.y + sw); b.clothL.rotation.set(-this.clothAng.x * 0.45 + sw * 0.6, 0, this.clothAng.y * 0.7); b.clothR.rotation.set(-this.clothAng.x * 0.45 - sw * 0.6, 0, this.clothAng.y * 0.7);
    }
  }

  private applyAction(name: string, u: number, w: number) {
    const b = this.bones; const t = this.time;
    const set = (n: BoneName, x: number, y = 0, z = 0) => { const r = b[n].rotation; r.x += (x - r.x) * w; r.y += (y - r.y) * w; r.z += (z - r.z) * w; };
    const ease = (a: number, c: number, v: number) => smooth(a, c, v);
    const bell = (v: number) => Math.sin(Math.min(1, Math.max(0, v)) * Math.PI);
    switch (name) {
      case 'cross': { // sign of the cross: forehead, chest, left shoulder, right shoulder
        const k = [[-1.05, 0.5, -2.2], [-0.55, 0.45, -1.75], [-0.75, 0.75, -1.7], [-0.75, 0.05, -1.9]]; const seg = Math.min(3.999, u * 4.6); const i = Math.floor(seg), f = smooth(0, 1, seg - i); const a = k[Math.min(3, i)], c = k[Math.min(3, i + 1)]; const fade = bell(u * 0.999) > 0.15 ? 1 : bell(u) / 0.15;
        set('upperArmR', (a[0] + (c[0] - a[0]) * f) * fade, 0, (a[1] + (c[1] - a[1]) * f) * fade); set('foreArmR', (a[2] + (c[2] - a[2]) * f) * fade); set('head', 0.12 * fade); break;
      }
      case 'bow': { const d = bell(u); set('spine', 0.75 * d); set('chest', 0.45 * d); set('head', 0.3 * d); set('upperArmL', -0.3 * d, 0, 0.1); set('upperArmR', -0.3 * d, 0, -0.1); set('upLegL', -0.12 * d); set('upLegR', -0.12 * d); break; }
      case 'sigdet': { // prostration: kneel and bow to the floor
        const d = bell(u); b.hips.position.y = REST.hips[1] - 0.52 * d; set('upLegL', -1.5 * d); set('upLegR', -1.5 * d); set('legL', 2.3 * d); set('legR', 2.3 * d); set('spine', 0.95 * d); set('chest', 0.5 * d); set('head', 0.2 * d);
        set('upperArmL', -1.9 * d, 0, 0.15); set('upperArmR', -1.9 * d, 0, -0.15); set('foreArmL', -0.5 * d); set('foreArmR', -0.5 * d); break;
      }
      case 'kiss': { const d = bell(u); set('spine', 0.28 * d); set('chest', 0.2 * d); set('head', 0.22 * d); set('upperArmR', -1.0 * d, 0, 0.1); set('foreArmR', -0.8 * d); break; }
      case 'shoes': { const d = bell(u); b.hips.position.y = REST.hips[1] - 0.3 * d; set('upLegL', -1.3 * d); set('legL', 1.5 * d); set('upLegR', -0.7 * d); set('legR', 1.5 * d); set('spine', 0.6 * d); set('chest', 0.3 * d); set('upperArmR', -1.3 * d); set('upperArmL', -1.1 * d); set('foreArmR', -0.4 * d); break; }
      case 'holdCross': set('upperArmR', -0.55, 0, 0.12); set('foreArmR', -1.75); break;
      case 'bless': { const d = Math.sin(t * 2.2); set('upperArmR', -1.15 + 0.12 * d, 0, 0.1 + 0.25 * Math.cos(t * 2.2)); set('foreArmR', -1.2); break; }
      case 'candle': set('upperArmR', -0.5, 0, 0.05); set('foreArmR', -1.55); break;
      case 'staff': set('upperArmR', -0.62, 0, 0.42); set('foreArmR', -1.85); set('upperArmL', -0.5, 0, -0.45); set('foreArmL', -1.9); set('head', 0.05 + 0.03 * Math.sin(t * 1.3)); set('spine', 0.02 * Math.sin(t * 1.1)); break;
      case 'chant': { const s = Math.sin(t * 2.1); set('upperArmR', -0.62, 0, 0.42); set('foreArmR', -1.85); set('spine', 0.05 * s); set('hips', 0, 0.06 * s); b.hips.position.y -= 0.015 * Math.abs(s); break; }
      case 'drum': { const s = Math.sin(t * 6.2), c = Math.sin(t * 3.1 + 1); set('upperArmL', -0.75 + 0.25 * Math.max(0, s), 0, 0.35); set('foreArmL', -1.1 - 0.5 * Math.max(0, s)); set('upperArmR', -0.7 + 0.3 * Math.max(0, c), 0, -0.35); set('foreArmR', -1.0 - 0.55 * Math.max(0, c)); set('spine', 0.06 + 0.03 * s); b.hips.position.y -= 0.02 * Math.abs(Math.sin(t * 3.1)); break; }
      case 'censer': { const s = Math.sin(t * 2.6); set('upperArmR', -0.55 - 0.35 * s, 0, -0.08); set('foreArmR', -0.55 - 0.2 * s); set('chest', 0, 0.08 * s); break; }
      case 'clap': { const s = Math.max(0, Math.sin(t * 6.5)); set('upperArmL', -0.95, 0, -0.25 - 0.18 * s); set('upperArmR', -0.95, 0, 0.25 + 0.18 * s); set('foreArmL', -1.25); set('foreArmR', -1.25); b.hips.position.y -= 0.012 * s; break; }
      case 'pray': set('upperArmL', -0.75, 0, 0.3); set('upperArmR', -0.75, 0, -0.3); set('foreArmL', -1.35, 0, 0); set('foreArmR', -1.35); set('head', 0.18); break;
      case 'talk': { const s = Math.sin(t * 3.1), c = Math.sin(t * 2.3 + 1); set('upperArmR', -0.35 - 0.12 * s, 0, -0.1); set('foreArmR', -1.0 - 0.3 * c); set('head', 0.03 * s, 0.06 * c); break; }
      case 'wave': { const s = Math.sin(t * 7); set('upperArmR', -0.2, 0, -2.3); set('foreArmR', -0.5 + 0.35 * s, 0, 0); break; }
      case 'carry': set('upperArmL', -0.75, 0, -0.12); set('upperArmR', -0.75, 0, 0.12); set('foreArmL', -1.0); set('foreArmR', -1.0); set('spine', -0.05); break;
      case 'umbrella': set('upperArmR', -1.25, 0, -0.1); set('foreArmR', -1.3); break;
      case 'shovel': { const s = Math.sin(t * 3.4); set('spine', 0.4 + 0.25 * s); set('chest', 0.15, 0.25 * s); set('upperArmL', -0.9 - 0.3 * s, 0, -0.2); set('upperArmR', -0.6 - 0.3 * s, 0, 0.3); set('foreArmL', -0.6); set('foreArmR', -0.9); set('upLegL', -0.25); set('legL', 0.4); set('upLegR', 0.15); set('legR', 0.25); break; }
      case 'reach': { const d = bell(u); set('upperArmR', -1.35 * d, 0, 0.05); set('foreArmR', -0.35 * d); set('spine', 0.1 * d); break; }
      case 'sit': b.hips.position.y = REST.hips[1] - 0.42; set('upLegL', -1.45, 0, 0.06); set('upLegR', -1.45, 0, -0.06); set('legL', 1.35); set('legR', 1.35); set('spine', -0.08); break;
      case 'drive': { const st = (this as any).steer ?? 0; b.hips.position.y = REST.hips[1] - 0.42; set('upLegL', -1.4, 0, 0.08); set('upLegR', -1.35, 0, -0.08); set('legL', 1.1); set('legR', 1.0); set('spine', -0.12); set('upperArmL', -1.05 - st * 0.25, 0, -0.12); set('upperArmR', -1.05 + st * 0.25, 0, 0.12); set('foreArmL', -0.75); set('foreArmR', -0.75); break; }
      case 'ululate': { const s = Math.sin(t * 9); set('upperArmR', -1.3, 0, 0.45); set('foreArmR', -2.2 + 0.06 * s); set('head', -0.15); break; }
    }
  }

  dispose() { this.body.geometry.dispose(); (this.body.material as THREE.Material).dispose(); this.cloth?.geometry.dispose(); this.head.geometry.dispose(); ((this.head.material as THREE.MeshStandardMaterial).map as THREE.Texture | null)?.dispose(); }
}

/** Isaac — the player. Proportions and palette from reference/isaac/*. */
export function makeIsaac(outfit: Outfit = 'netela', moustache = true): Human {
  return new Human({ seed: 11, height: 1.84, build: 0.9, skin: 0x7a4a30, outfit, hair: 'fade', moustache, shirt: 0x1d1e22, pants: 0x1f232b, toque: outfit === 'winter' ? 0x1c1c20 : null });
}

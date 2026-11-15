// Medhane Alem Church, 1260 5th St — exterior (three historical variants) and enterable interior.
// Local frame: front door faces -z, sanctuary (Meqdes) at +z, floor level F above grade. Metres.
import * as THREE from 'three/webgpu';
import { Geo, canvasTex, speckle } from '../core/geo';
import type { Physics } from '../core/physics';
import type { Engine } from '../core/engine';
import { buildInterior, InteriorRefs } from './interior';

export type ChurchVariant = 'current' | 'blueFlag' | 'brownTower';
export const CH = {
  // F = nave floor; FL = lobby floor / front-door threshold. You enter at FL and climb five steps to the nave.
  F: 2.1, FL: 1.25, HW: 5.25, NZ0: -5.5, NZ1: 9.9, T: 0.2, EAVE: 5.9, PITCH: 0.6,
  TW: 1.42, TZ0: -9.9, MZ0: -8.6, TY: 10.4, WINGX: 2.35, WINGZ: -9.9, PZ: 6.9,   // footprint 10.5 m x 18.5 m, as surveyed in the Manitoba Lands Initiative / OSM building outline
  WIN_Z: [-4.1, -1.5, 1.1, 3.7, 6.3], WIN_W: 0.8, WY0: 1.15, WY1: 2.4, WPK: 3.0,   // window sill / spring / peak above the nave floor
};
const VARIANTS: Record<ChurchVariant, { tower: number; vertical: boolean; nave: number; skirt: number; steps: number; stepsWood: boolean; door: number; dome: number; cross: number; banner: boolean; roof: number; rail: number }> = {
  current: { tower: 0x6f7f98, vertical: false, nave: 0xe9e2c0, skirt: 0x3b5a60, steps: 0xc4c1b8, stepsWood: false, door: 0x9a9ea6, dome: 0xd9a927, cross: 0xf4f4f0, banner: false, roof: 0x5c5148, rail: 0x9c9e9c },
  blueFlag: { tower: 0x2c50b4, vertical: false, nave: 0xe9e3a6, skirt: 0x27332d, steps: 0x4a3a2c, stepsWood: true, door: 0xf2f2ee, dome: 0xd9a927, cross: 0x9db8e8, banner: true, roof: 0x4a4640, rail: 0x2a2420 },
  brownTower: { tower: 0x4b3628, vertical: true, nave: 0xe2d9b4, skirt: 0x3a4a3e, steps: 0x2f6a46, stepsWood: true, door: 0x6a4a34, dome: 0xf0f0ea, cross: 0xf4f4f0, banner: false, roof: 0x4a4640, rail: 0x2f6a46 },
};

export interface Hole { at: number; w: number; y0: number; y1: number; peak?: number }

/** wall face between two plan points, facing `n`; holes positioned by coordinate along the wall's main axis */
export function wall(g: Geo, ax: number, az: number, bx: number, bz: number, n: [number, number], y0: number, y1: number, holes: Hole[], color: THREE.Color | number, uvS = 1, gableRise = 0) {
  let dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz); dx /= L; dz /= L;
  if (-dz * n[0] + dx * n[1] < 0) { [ax, bx] = [bx, ax]; [az, bz] = [bz, az]; dx = -dx; dz = -dz; }
  const alongX = Math.abs(dx) > Math.abs(dz);
  const P = (s: number, y: number) => [ax + dx * s, y, az + dz * s];
  const toS = (c: number) => (alongX ? (c - ax) * dx : (c - az) * dz);
  const hs = holes.map((h) => ({ ...h, s: toS(h.at) })).sort((a, b) => a.s - b.s);
  const rect = (sA: number, yA: number, sB: number, yB: number) => { if (sB - sA < 1e-4 || yB - yA < 1e-4) return; g.quad(P(sA, yA), P(sB, yA), P(sB, yB), P(sA, yB), color, [sA / uvS, yA / uvS, sB / uvS, yB / uvS]); };
  const tri = (a: number[], b: number[], c: number[]) => g.tri(P(a[0], a[1]), P(b[0], b[1]), P(c[0], c[1]), color, [a[0] / uvS, a[1] / uvS, b[0] / uvS, b[1] / uvS, c[0] / uvS, c[1] / uvS]);
  let s = 0;
  for (const h of hs) {
    const s0 = h.s - h.w / 2, s1 = h.s + h.w / 2;
    rect(s, y0, s0, y1); rect(s0, y0, s1, h.y0);
    if (h.peak && h.peak > h.y1) { tri([s0, h.y1], [h.s, h.peak], [s0, y1]); tri([h.s, h.peak], [s1, y1], [s0, y1]); tri([h.s, h.peak], [s1, h.y1], [s1, y1]); }
    else rect(s0, h.y1, s1, y1);
    s = s1;
  }
  rect(s, y0, L, y1);
  if (gableRise > 0) tri([0, y1], [L, y1], [L / 2, y1 + gableRise]);
}
/** flat ribbon following an outline on a wall plane (window/door trim) */
export function trimOutline(g: Geo, P: (s: number, y: number) => number[], pts: number[][], width: number, color: THREE.Color | number, closed = false) {
  const n = pts.length; const lim = closed ? n : n - 1;
  for (let i = 0; i < lim; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const nx = (-dy / l) * width / 2, ny = (dx / l) * width / 2; const ex = (dx / l) * width / 2, ey = (dy / l) * width / 2;
    const q = [[a[0] - ex - nx, a[1] - ey - ny], [b[0] + ex - nx, b[1] + ey - ny], [b[0] + ex + nx, b[1] + ey + ny], [a[0] - ex + nx, a[1] - ey + ny]].map((p) => P(p[0], p[1]));
    g.quad(q[0], q[1], q[2], q[3], color);
  }
}

function signTexture(): THREE.CanvasTexture {
  // half-oval board, white with green lettering and a small flag at each end — as on the building
  return canvasTex(1024, 352, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fbfbf6'; c.strokeStyle = '#2f9a4a'; c.lineWidth = 7;
    c.beginPath(); c.moveTo(8, h - 8); c.ellipse(w / 2, h - 8, w / 2 - 8, h - 16, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#2f9a4a'; c.textAlign = 'center';
    // Amharic line follows the curve of the board
    const text = 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ መድኃኔዓለም'; c.font = "700 50px 'Noto Sans Ethiopic', sans-serif"; const chars = [...text]; const total = chars.reduce((a, ch) => a + c.measureText(ch).width, 0);
    const rx = w / 2 - 78, ry = h - 86; let acc = 0; for (const ch of chars) { const cw = c.measureText(ch).width; const t = (acc + cw / 2) / total; const a = Math.PI * (1.0 - (0.13 + t * 0.74)); const x = w / 2 + Math.cos(a) * rx, y = h - 8 - Math.sin(a) * ry; c.save(); c.translate(x, y); c.rotate(Math.atan2(Math.cos(a) * ry, Math.sin(a) * rx)); c.fillText(ch, 0, 16); c.restore(); acc += cw; }
    c.font = "700 46px 'Noto Sans Ethiopic', sans-serif"; c.fillText('ቤተ ክርስቲያን', w / 2, 196);
    c.font = "800 30px 'Noto Sans', Arial, sans-serif"; c.fillText('ETHIOPIAN ORTHODOX', w / 2, 240); c.fillText('TEWAHDO MEDHANE ALEM CHURCH', w / 2, 276); c.fillText('BRANDON', w / 2, 312);
    for (const sx of [-1, 1]) { const fx = w / 2 + sx * 440 - 22, fy = h - 62; c.save(); c.translate(fx + 22, fy + 16); c.rotate(sx * 0.5); for (const [k, col] of ['#12893f', '#f7d417', '#d8232a'].entries()) { c.fillStyle = col; c.fillRect(-22, -16 + k * 10.6, 44, 10.6); } c.restore(); }
  }, { repeat: false });
}
function flagTexture(kind: 'ethiopia' | 'canada') {
  return canvasTex(256, 128, (c, w, h) => {
    if (kind === 'ethiopia') { c.fillStyle = '#12893f'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#f7d417'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#d8232a'; c.fillRect(0, (2 * h) / 3, w, h / 3 + 1); }
    else { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8232a'; c.fillRect(0, 0, w / 4, h); c.fillRect((w * 3) / 4, 0, w / 4, h);
      const L = [[0, -44], [8, -26], [22, -32], [16, -8], [34, -16], [30, -2], [42, 4], [20, 22], [24, 34], [3, 30], [3, 46], [-3, 46], [-3, 30], [-24, 34], [-20, 22], [-42, 4], [-30, -2], [-34, -16], [-16, -8], [-22, -32], [-8, -26]];
      c.beginPath(); L.forEach((p, i) => (i ? c.lineTo(w / 2 + p[0], h / 2 + p[1]) : c.moveTo(w / 2 + p[0], h / 2 + p[1]))); c.closePath(); c.fill(); }
  }, { repeat: false });
}

export class Church {
  group = new THREE.Group();          // positioned + rotated in the world
  exterior = new THREE.Group();
  interior = new THREE.Group();
  variant: ChurchVariant = 'current';
  festival = false;
  refs!: InteriorRefs;
  door!: THREE.Group; doorOpen = 0; doorWant = 0;
  private bodies: any[] = [];
  mats: Record<string, THREE.Material> = {};
  private yaw = 0; private pos = new THREE.Vector3();
  private snow = false;
  flags: THREE.Mesh[] = [];

  constructor(private engine: Engine, private phys: Physics) {
    const vs = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [238, 238, 238], 7, 4); for (let i = 0; i < 4; i++) { const x = (i * w) / 4; c.fillStyle = 'rgba(0,0,0,0.30)'; c.fillRect(x, 0, 2.5, h); c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(x + 2.5, 0, 2, h); } });
    const hs = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [238, 238, 238], 7, 4); for (let i = 0; i < 6; i++) { const y = (i * h) / 6; c.fillStyle = 'rgba(0,0,0,0.30)'; c.fillRect(0, y, w, 2.5); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(0, y + 2.5, w, 2); } });
    const st = canvasTex(128, 128, (c, w, h) => speckle(c, w, h, [232, 232, 232], 22, 5, 0.5));
    const sh = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [205, 205, 205], 28, 7, 0.5); for (let r = 0; r < 8; r++) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, r * 16, w, 2); for (let x = 0; x < 6; x++) c.fillRect(((x + (r % 2) * 0.5) * w) / 6, r * 16, 1.5, 16); } });
    const M = THREE.MeshStandardMaterial;
    this.mats = {
      vsiding: new M({ map: vs, vertexColors: true, roughness: 0.8 }), hsiding: new M({ map: hs, vertexColors: true, roughness: 0.8 }),
      stucco: new M({ map: st, vertexColors: true, roughness: 0.95 }), roof: new M({ map: sh, vertexColors: true, roughness: 0.9 }),
      trim: new M({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }), concrete: new M({ vertexColors: true, roughness: 0.92 }),
      gold: new M({ color: 0xd9a927, metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }), white: new M({ color: 0xf4f4f0, roughness: 0.5 }),
      iron: new M({ vertexColors: true, roughness: 0.5, metalness: 0.6 }),
      glass: new M({ color: 0x9fb4c8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
      glassRed: new M({ color: 0xb8322c, roughness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: 0x551010, emissiveIntensity: 0.3 }),
      glassGreen: new M({ color: 0x1f7a44, roughness: 0.2, transparent: true, opacity: 0.8, side: THREE.DoubleSide, emissive: 0x0a3318, emissiveIntensity: 0.3 }),
      louvre: new M({ color: 0x56606a, roughness: 0.7, side: THREE.DoubleSide, vertexColors: true }), wood: new M({ vertexColors: true, roughness: 0.75 }),
      sign: new M({ map: signTexture(), transparent: true, alphaTest: 0.5, roughness: 0.7 }),
      flagE: new M({ map: flagTexture('ethiopia'), side: THREE.DoubleSide, roughness: 0.8 }), flagC: new M({ map: flagTexture('canada'), side: THREE.DoubleSide, roughness: 0.8 }),
    };
    this.group.add(this.exterior, this.interior);
  }

  /** place in the world and build everything */
  place(x: number, y: number, z: number, yaw: number) {
    this.pos.set(x, y, z); this.yaw = yaw; this.group.position.copy(this.pos); this.group.rotation.y = yaw;
    this.buildExterior(); this.refs = buildInterior(this, this.engine); this.buildColliders();
    this.engine.scene.add(this.group);
  }
  /** local -> world */
  toWorld(x: number, y: number, z: number, out = new THREE.Vector3()) { return out.set(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).add(this.pos); }
  toLocal(p: THREE.Vector3, out = new THREE.Vector3()) { return out.copy(p).sub(this.pos).applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw); }
  /** world yaw for a character that should face local direction (dx,dz) */
  faceYaw(dx: number, dz: number) { return Math.atan2(-dx, -dz) + this.yaw; }
  isInside(p: THREE.Vector3) { const l = this.toLocal(p); return l.y > CH.FL - 0.4 && l.y < CH.F + 4 && ((Math.abs(l.x) < CH.HW && l.z > CH.MZ0 && l.z < CH.NZ1) || (Math.abs(l.x) < CH.WINGX && l.z > CH.TZ0 + 0.1 && l.z <= CH.MZ0)); }
  /** lot outline in world space (for reserving ground) */
  lot(): number[][] { return [[-13, -17], [-7, -17], [-7, -33], [7, -33], [7, -17], [13, -17], [13, 13], [-13, 13]].map(([x, z]) => { const v = this.toWorld(x, 0, z); return [v.x, v.z]; }); }

  setVariant(v: ChurchVariant, festival = this.festival, snow = this.snow) {
    if (v === this.variant && festival === this.festival && snow === this.snow) return;
    this.variant = v; this.festival = festival; this.snow = snow; this.buildExterior();
  }

  private buildExterior() {
    const ex = this.exterior; for (const c of [...ex.children]) { ex.remove(c); (c as THREE.Mesh).geometry?.dispose?.(); }
    this.flags = [];
    // in this function F is the door-threshold level (the whole front is measured from it); FN is the nave floor
    const V = VARIANTS[this.variant], { F: FN, FL: F, HW, MZ0: NZ0, NZ1, EAVE, PITCH, TW, TZ0, TY, WINGX, WINGZ } = CH; const TB = TZ0 + 2 * TW;
    const tower = new Geo(), stucco = new Geo(), roof = new Geo(), trim = new Geo(), conc = new Geo(), iron = new Geo(), glass = new Geo(), gR = new Geo(), gG = new Geo(), louvre = new Geo(), wood = new Geo();
    const cT = new THREE.Color(V.tower), cN = new THREE.Color(V.nave), cS = new THREE.Color(V.skirt), W = new THREE.Color(0xf4f4f0), cRoof = new THREE.Color(this.snow ? 0xf2f5fa : V.roof);
    const sy = F - 0.12; // top of the dark skirt
    const win = (z: number): Hole => ({ at: z, w: CH.WIN_W, y0: FN + CH.WY0, y1: FN + CH.WY1, peak: FN + CH.WPK });
    const rise = HW * PITCH;
    // ---- nave ----
    for (const sx of [-1, 1]) {
      wall(stucco, sx * HW, NZ0, sx * HW, NZ1, [sx, 0], sy, EAVE, CH.WIN_Z.map(win), cN);
      wall(conc, sx * HW, NZ0, sx * HW, NZ1, [sx, 0], -0.4, sy, [], cS);
      trim.box(sx * (HW + 0.02), sy, (NZ0 + NZ1) / 2, 0.06, 0.1, NZ1 - NZ0, W);
      for (const z of CH.WIN_Z) {
        this.windowDress(trim, glass, CH.WIN_Z.indexOf(z) % 2 ? gG : gR, (s, y) => [sx * (HW + 0.025), y, s], (s, y) => [sx * (HW - 0.1), y, s], z, CH.WIN_W, FN + CH.WY0, FN + CH.WY1, FN + CH.WPK, W);
        // basement window (white louvre panel) in the skirt
        trim.box(sx * (HW + 0.03), 0.55, z, 0.05, 0.5, 0.8, W); louvre.box(sx * (HW + 0.05), 0.55, z, 0.03, 0.4, 0.7, 0xe8e8e4);
      }
    }
    const fw: Hole[] = [{ at: 0, w: 2 * (WINGX - 0.2), y0: -0.4, y1: F + 2.85 }];
    wall(stucco, -HW, NZ0, HW, NZ0, [0, -1], sy, EAVE, [{ at: -3.6, w: 0.5, y0: F + 1.15, y1: F + 2.3, peak: F + 2.55 }, { at: 3.6, w: 0.5, y0: F + 1.15, y1: F + 2.3, peak: F + 2.55 }, { ...fw[0], y0: sy }], cN, 1, rise);
    wall(conc, -HW, NZ0, -TW, NZ0, [0, -1], -0.4, sy, [], cS); wall(conc, TW, NZ0, HW, NZ0, [0, -1], -0.4, sy, [], cS);
    for (const x of [-3.6, 3.6]) this.windowDress(trim, glass, gR, (s, y) => [s, y, NZ0 - 0.025], (s, y) => [s, y, NZ0 + 0.1], x, 0.5, F + 1.15, F + 2.3, F + 2.55, W);
    wall(stucco, -HW, NZ1, HW, NZ1, [0, 1], sy, EAVE, [], cN, 1, rise); wall(conc, -HW, NZ1, HW, NZ1, [0, 1], -0.4, sy, [], cS);
    // roof (ridge along z)
    const o = 0.4, yo = EAVE - o * PITCH, ry = EAVE + rise;
    roof.quad([HW + o, yo, NZ1 + o], [HW + o, yo, NZ0 - o], [0, ry, NZ0 - o], [0, ry, NZ1 + o], cRoof, [0, 0, 7, 3]);
    roof.quad([-HW - o, yo, NZ0 - o], [-HW - o, yo, NZ1 + o], [0, ry, NZ1 + o], [0, ry, NZ0 - o], cRoof, [0, 0, 7, 3]);
    for (const sx of [-1, 1]) { trim.quad([sx * (HW + o), yo, NZ1 + o], [sx * HW, yo, NZ1 + o], [sx * HW, yo, NZ0 - o], [sx * (HW + o), yo, NZ0 - o], W); trim.box(sx * (HW + o), yo + 0.06, (NZ0 + NZ1) / 2, 0.04, 0.16, NZ1 - NZ0 + 2 * o, W); }
    // gable fascia boards
    for (const z of [NZ0 - o, NZ1 + o]) for (const sx of [-1, 1]) trimOutline(trim, (s, y) => [s, y, z], [[sx * (HW + o), yo + 0.02], [0, ry + 0.02]], 0.16, W);
    // ---- tower ----
    const tg = tower;
    const door: Hole = { at: 0, w: 1.15, y0: F, y1: F + 2.12 };
    const fwin = (sx: number): Hole => ({ at: sx * 1.46, w: 0.52, y0: F + 1.08, y1: F + 2.5, peak: F + 2.72 });
    wall(tg, -WINGX, TZ0, WINGX, TZ0, [0, -1], sy, F + 3.05, [door, fwin(-1), fwin(1)], cT); wall(tg, -TW, TZ0, TW, TZ0, [0, -1], F + 3.05, TY, [], cT);
    wall(tg, -TW, TZ0, -TW, TB, [-1, 0], F + 3.05, TY, [], cT); wall(tg, TW, TZ0, TW, TB, [1, 0], F + 3.05, TY, [], cT);   // the entry room below is as wide as the wings
    wall(tg, -TW, TB, TW, TB, [0, 1], EAVE, TY, [], cT);
    wall(conc, -TW, TZ0, TW, TZ0, [0, -1], -0.4, sy, [{ at: 0, w: 1.15, y0: F - 0.01, y1: sy + 1 }], cS);
    for (const sx of [-1, 1]) wall(conc, sx * TW, TZ0, sx * TW, WINGZ, [sx, 0], -0.4, sy, [], cS);
    // white corner boards + cornice
    for (const sx of [-1, 1]) { trim.box(sx * (TW + 0.015), (F + 3.45 + TY) / 2, TZ0 - 0.015, 0.14, TY - F - 3.45, 0.14, W); trim.box(sx * (TW + 0.015), (EAVE + 1 + TY) / 2, TB + 0.015, 0.14, TY - EAVE - 1, 0.14, W); }
    trim.box(0, TY + 0.06, (TZ0 + TB) / 2, TW * 2 + 0.5, 0.2, TB - TZ0 + 0.5, W);
    trim.box(0, sy, TZ0 - 0.02, TW * 2, 0.1, 0.06, W);
    // door surround with pointed head (white), grey door inside handled separately (animated)
    const PF = (s: number, y: number) => [s, y, TZ0 - 0.03];
    trimOutline(trim, PF, [[-0.72, F], [-0.72, F + 2.25], [0, F + 3.05], [0.72, F + 2.25], [0.72, F]], 0.16, W);
    trim.tri(PF(-0.64, F + 2.2), PF(0.64, F + 2.2), PF(0, F + 2.92), cT.clone().multiplyScalar(0.9));
    trim.box(0, F + 2.16, TZ0 - 0.03, 1.3, 0.1, 0.05, W);
    // arched sign above the door
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 0.98), this.mats.sign); sign.position.set(0, F + 3.78, TZ0 - 0.06); sign.rotation.y = Math.PI; ex.add(sign);
    // triple lancet group (front) and paired lancets (sides)
    const lanc = (P: (s: number, y: number) => number[], c: number, w2: number, y0: number, y1: number, pk: number, fill: Geo, col: number) => {
      fill.quad(P(c - w2 / 2, y0), P(c + w2 / 2, y0), P(c + w2 / 2, y1), P(c - w2 / 2, y1), col); fill.tri(P(c - w2 / 2, y1), P(c + w2 / 2, y1), P(c, pk), col);
      const Pf = (s: number, y: number) => { const p = P(s, y); return p; };
      trimOutline(trim, Pf, [[c - w2 / 2, y0], [c - w2 / 2, y1], [c, pk], [c + w2 / 2, y1], [c + w2 / 2, y0]], 0.09, W, true);
    };
    const PFr = (s: number, y: number) => [-s, y, TZ0 - 0.035];
    if (this.variant === 'blueFlag') {
      // Ethiopian tricolour banner across the lancet group (as in the older photo)
      const bands: [number, number, number][] = [[F + 6.25, F + 7.55, 0x12893f], [F + 5.2, F + 6.25, 0xf2c81a], [F + 4.15, F + 5.2, 0xc8232a]];
      for (const [a, b, col] of bands) for (const c of [-0.62, 0, 0.62]) trim.quad(PFr(c - 0.27, a), PFr(c + 0.27, a), PFr(c + 0.27, b), PFr(c - 0.27, b), col);
      for (const c of [-0.62, 0, 0.62]) { trim.tri(PFr(c - 0.27, F + 7.55), PFr(c + 0.27, F + 7.55), PFr(c, F + (c === 0 ? 8.1 : 7.95)), 0x12893f); trimOutline(trim, PFr, [[c - 0.27, F + 4.15], [c - 0.27, F + 7.55], [c, F + (c === 0 ? 8.1 : 7.95)], [c + 0.27, F + 7.55], [c + 0.27, F + 4.15]], 0.09, W, true); }
    } else {
      lanc(PFr, 0, 0.54, F + 4.3, F + 7.25, F + 7.95, louvre, 0x5d6973); lanc(PFr, -0.66, 0.5, F + 4.3, F + 6.55, F + 7.2, louvre, 0x5d6973); lanc(PFr, 0.66, 0.5, F + 4.3, F + 6.55, F + 7.2, louvre, 0x5d6973);
      for (const c of [-0.66, 0, 0.66]) trim.quad(PFr(c - 0.25, F + 5.5), PFr(c + 0.25, F + 5.5), PFr(c + 0.25, F + 5.58), PFr(c - 0.25, F + 5.58), W);
    }
    for (const sx of [-1, 1]) { const PS = (s: number, y: number) => [sx * (TW + 0.035), y, (TZ0 + TB) / 2 + sx * s]; lanc(PS, -0.42, 0.44, F + 6.0, F + 7.2, F + 7.75, louvre, 0x5d6973); lanc(PS, 0.42, 0.44, F + 6.0, F + 7.2, F + 7.75, louvre, 0x5d6973); }
    // tower roof: low flared pyramid, then drum, onion dome and cross
    const tcx = 0, tcz = (TZ0 + TB) / 2, e = 0.5, hx = TW + e, hz = (TB - TZ0) / 2 + e, py = TY + 0.16, pk = TY + 1.3;
    const cTR = new THREE.Color(this.snow ? 0xf2f5fa : 0x4a4f55);
    roof.tri([tcx - hx, py, tcz + hz], [tcx + hx, py, tcz + hz], [tcx, pk, tcz], cTR); roof.tri([tcx + hx, py, tcz - hz], [tcx - hx, py, tcz - hz], [tcx, pk, tcz], cTR);
    roof.tri([tcx + hx, py, tcz + hz], [tcx + hx, py, tcz - hz], [tcx, pk, tcz], cTR); roof.tri([tcx - hx, py, tcz - hz], [tcx - hx, py, tcz + hz], [tcx, pk, tcz], cTR);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.5, 20), new THREE.MeshStandardMaterial({ color: 0xc9c23a, roughness: 0.5, metalness: 0.2 })); drum.position.set(tcx, pk - 0.12, tcz); drum.castShadow = true; ex.add(drum);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x2f6a46, roughness: 0.5 })); band.position.set(tcx, pk - 0.02, tcz); ex.add(band);
    const prof = [[0.0, 0], [0.5, 0], [0.62, 0.12], [0.68, 0.3], [0.62, 0.52], [0.46, 0.72], [0.26, 0.9], [0.12, 1.06], [0.06, 1.22], [0, 1.25]].map((p) => new THREE.Vector2(p[0], p[1]));
    const domeMat = V.dome === 0xd9a927 ? this.mats.gold : this.mats.white;
    const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), domeMat); dome.position.set(tcx, pk + 0.12, tcz); dome.castShadow = true; ex.add(dome);
    const crossG = new Geo(); const cc = new THREE.Color(V.cross); const cy0 = pk + 1.3;
    crossG.box(tcx, cy0 + 0.75, tcz, 0.1, 1.5, 0.07, cc); crossG.box(tcx, cy0 + 0.95, tcz, 0.9, 0.1, 0.07, cc);
    // Ethiopian-style flourishes: flared ends + lattice diamond at the crossing + small bars
    for (const [dx, dy] of [[0.45, 0.95], [-0.45, 0.95], [0, 1.5], [0, 0.42]]) crossG.box(tcx + dx, cy0 + dy, tcz, dx ? 0.1 : 0.34, dx ? 0.34 : 0.1, 0.07, cc);
    const dm = new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(tcx, cy0 + 0.95, tcz); crossG.setMatrix(dm); crossG.box(0, 0, 0, 0.36, 0.36, 0.06, cc); crossG.setMatrix(null);
    for (const dy of [0.62, 1.28]) crossG.box(tcx, cy0 + dy, tcz, 0.3, 0.07, 0.07, cc);
    for (const dx of [-0.27, 0.27]) crossG.box(tcx + dx, cy0 + 0.95, tcz, 0.07, 0.3, 0.07, cc);
    const crossM = crossG.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.1 })); ex.add(crossM);
    // ---- vestibule wings beside the tower ----
    for (const sx of [-1, 1]) {
      const x0 = sx * TW, x1 = sx * WINGX, top = F + 3.05;
      // (the front wall of the wings is part of the flush lower front above)
      wall(tg, x1, WINGZ, x1, NZ0, [sx, 0], sy, top, [], cT);
      wall(conc, x0, WINGZ, x1, WINGZ, [0, -1], -0.4, sy, [], cS); wall(conc, x1, WINGZ, x1, NZ0, [sx, 0], -0.4, sy, [], cS);
      const cxw = sx * 1.46;
      glass.quad([cxw - 0.26, F + 1.08, WINGZ + 0.05], [cxw + 0.26, F + 1.08, WINGZ + 0.05], [cxw + 0.26, F + 2.5, WINGZ + 0.05], [cxw - 0.26, F + 2.5, WINGZ + 0.05], 0xffffff);
      trim.box(cxw, F + 1.85, WINGZ + 0.04, 0.52, 0.05, 0.03, W); trim.box(cxw, F + 2.5, WINGZ + 0.04, 0.52, 0.05, 0.03, W);
      // white downspout at the outer corner, with its kick-out at the bottom
      trim.box(sx * (WINGX + 0.07), (top + 0.3) / 2 + 0.1, WINGZ - 0.07, 0.07, top - 0.1, 0.07, W); trim.beam([sx * (WINGX + 0.07), 0.32, WINGZ - 0.07], [sx * (WINGX + 0.75), 0.12, WINGZ - 0.35], 0.07, W);
      glass.tri([cxw - 0.26, F + 2.5, WINGZ + 0.05], [cxw + 0.26, F + 2.5, WINGZ + 0.05], [cxw, F + 2.72, WINGZ + 0.05], 0xffffff);
      trimOutline(trim, (s, y) => [s, y, WINGZ - 0.03], [[cxw - 0.26, F + 1.08], [cxw - 0.26, F + 2.5], [cxw, F + 2.72], [cxw + 0.26, F + 2.5], [cxw + 0.26, F + 1.08]], 0.1, W, true);
      trim.box(sx * (WINGX + 0.015), (sy + top) / 2, WINGZ - 0.015, 0.12, top - sy, 0.12, W);
      // shed roof with white edge
      const ro = 0.3; const a = [x0, top + 0.75, WINGZ - ro], b = [x1 + sx * ro, top + 0.12, WINGZ - ro], c = [x1 + sx * ro, top + 0.12, NZ0], d = [x0, top + 0.75, NZ0];
      if (sx > 0) roof.quad(a, d, c, b, cRoof); else roof.quad(a, b, c, d, cRoof);
      trimOutline(trim, (s, y) => [s, y, WINGZ - ro - 0.01], [[x0, top + 0.72], [x1 + sx * ro, top + 0.09]], 0.14, W);
      trim.box(x1 + sx * ro, top + 0.08, (WINGZ - ro + NZ0) / 2, 0.05, 0.14, NZ0 - WINGZ + ro, W);
      tg.tri([x0, top, WINGZ], [x1, top, WINGZ], [x0, top + 0.7, WINGZ], cT);
    }
    // ---- stairs, landing, railings ----
    const nSteps = 8, run = 0.3, riseS = F / nSteps, landD = 1.3, sw = 2.2; const cSt = new THREE.Color(this.snow && !V.stepsWood ? 0xdfe4ea : V.steps);
    const stepGeo = V.stepsWood ? wood : conc;
    stepGeo.box(0, F / 2 - 0.2, TZ0 - landD / 2, sw, F + 0.4, landD, cSt);
    for (let i = 0; i < nSteps - 1; i++) { const h = F - (i + 1) * riseS; stepGeo.box(0, h / 2 - 0.2, TZ0 - landD - (i + 0.5) * run, sw, h + 0.4, run, cSt); }
    const cR = new THREE.Color(V.rail), zEnd = TZ0 - landD - (nSteps - 1) * run;
    for (const sx of [-1, 1]) {
      const x = sx * (sw / 2 - 0.05);
      // posts
      iron.box(x, F + 0.5, TZ0 - 0.1, 0.05, 1.0, 0.05, cR); iron.box(x, F + 0.5, TZ0 - landD, 0.05, 1.0, 0.05, cR); iron.box(x, 0.55, zEnd, 0.05, 1.1, 0.05, cR);
      iron.box(x, F + 0.98, TZ0 - landD / 2, 0.05, 0.05, landD, cR); iron.box(x, F + 0.5, TZ0 - landD / 2, 0.035, 0.035, landD, cR);
      // sloped rails down the stairs
      for (const hOff of [0.98, 0.5]) iron.beam([x, F + hOff, TZ0 - landD], [x, hOff + 0.08, zEnd], 0.05, cR);
      for (let i = 1; i < 7; i++) { const t = i / 7, z = TZ0 - landD + (zEnd - (TZ0 - landD)) * t, yb = F * (1 - t); iron.box(x, yb + 0.5, z, 0.02, 0.96, 0.02, cR); }
    }
    // path from the stairs to the public sidewalk
    conc.box(0, 0.05, zEnd - 1.0, 3.3, 0.1, 2.3, new THREE.Color(this.snow ? 0xe6eaef : 0xc4c1b8));           // concrete pad at the foot of the steps
    conc.box(0, 0.03, zEnd - 4.6, 1.6, 0.06, 5.0, new THREE.Color(this.snow ? 0xe6eaef : 0xb9b6ae));
    iron.box(0, 0.115, zEnd - 0.75, 0.9, 0.03, 0.55, 0x1c1c1e);                                                // doormat
    // by the door: the "1260" plate, mailbox, floodlight and security camera
    trim.box(-0.8, F + 1.78, TZ0 - 0.04, 0.3, 0.14, 0.02, 0xe8e8e4); iron.box(-0.98, F + 1.32, TZ0 - 0.07, 0.34, 0.2, 0.1, 0x18181a);
    iron.box(0.05, F + 2.98, TZ0 - 0.1, 0.24, 0.12, 0.14, 0x18181a); trim.box(-0.55, F + 3.14, TZ0 - 0.1, 0.13, 0.13, 0.13, 0xf0f0ec);
    // ---- festival dressing: flags by the door ----
    if (this.festival) for (const sx of [-1, 1]) {
      const m = new THREE.Matrix4().makeRotationZ(-sx * 0.35).setPosition(sx * 1.25, F + 2.2, TZ0 - 0.25); iron.setMatrix(m); iron.box(0, 0.6, 0, 0.035, 2.4, 0.035, 0xd8d8d8); iron.setMatrix(null);
      const fg = new THREE.PlaneGeometry(1.2, 0.62, 12, 4); const flag = new THREE.Mesh(fg, sx < 0 ? this.mats.flagE : this.mats.flagC);
      flag.position.set(sx * (1.25 + 0.75), F + 3.45, TZ0 - 0.27); flag.userData.base = fg.attributes.position.array.slice(); flag.userData.sx = sx; ex.add(flag); this.flags.push(flag);
    }
    const add = (g: Geo, mat: THREE.Material, cast = true) => { if (g.count) ex.add(g.mesh(mat, cast)); };
    add(tower, V.vertical ? this.mats.vsiding : this.mats.hsiding); add(stucco, this.mats.stucco); add(roof, this.mats.roof); add(trim, this.mats.trim); add(conc, this.mats.concrete);
    add(iron, this.mats.iron); add(glass, this.mats.glass, false); add(gR, this.mats.glassRed, false); add(gG, this.mats.glassGreen, false); add(louvre, this.mats.louvre, false); add(wood, this.mats.wood);
    // ---- the front door (auto-opening leaf) ----
    this.door = new THREE.Group(); this.door.position.set(-0.575, F, TZ0 + 0.02);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.12, 0.06), new THREE.MeshStandardMaterial({ color: V.door, roughness: 0.5, metalness: 0.3 })); leaf.position.set(0.575, 1.06, 0); leaf.castShadow = true;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), this.mats.gold); handle.position.set(1.02, 1.05, -0.06);
    const dcross = new Geo(); dcross.box(0.575, 1.5, -0.035, 0.05, 0.42, 0.012, 0xd9a927); dcross.box(0.575, 1.56, -0.035, 0.26, 0.05, 0.012, 0xd9a927);
    this.door.add(leaf, handle, dcross.mesh(this.mats.gold as THREE.Material, false)); ex.add(this.door);
  }

  /** frame + glass for a pointed window in a real opening */
  private windowDress(trim: Geo, glass: Geo, top: Geo, Pout: (s: number, y: number) => number[], Pmid: (s: number, y: number) => number[], c: number, w: number, y0: number, y1: number, pk: number, W: THREE.Color) {
    const o = [[c - w / 2, y0], [c - w / 2, y1], [c, pk], [c + w / 2, y1], [c + w / 2, y0]];
    trimOutline(trim, Pout, o, 0.1, W, true);
    trimOutline(trim, Pout, [[c - w / 2 - 0.08, y0 - 0.06], [c + w / 2 + 0.08, y0 - 0.06]], 0.09, W);
    glass.quad(Pmid(c - w / 2, y0), Pmid(c + w / 2, y0), Pmid(c + w / 2, y1 - 0.02), Pmid(c - w / 2, y1 - 0.02), 0xffffff);
    top.tri(Pmid(c - w / 2, y1), Pmid(c + w / 2, y1), Pmid(c, pk), 0xffffff);
    trimOutline(trim, Pmid, [[c - w / 2, y1], [c + w / 2, y1]], 0.06, W); trimOutline(trim, Pmid, [[c - w / 2, (y0 + y1) / 2], [c + w / 2, (y0 + y1) / 2]], 0.04, W);
    // jambs through the wall thickness
    const a = o.map((p) => Pout(p[0], p[1])), b = o.map((p) => { const q = Pmid(p[0], p[1]); const r = Pout(p[0], p[1]); return [q[0] + (q[0] - r[0]) * 1.1, q[1], q[2] + (q[2] - r[2]) * 1.1]; });
    for (let i = 0; i < o.length; i++) { const j = (i + 1) % o.length; trim.quad(a[i], a[j], b[j], b[i], W); }
  }

  private buildColliders() {
    for (const b of this.bodies) this.phys.world.removeRigidBody(b); this.bodies = [];
    const { F: FN, FL: F, HW, NZ0, NZ1, T, TW, TZ0, WINGX, WINGZ, PZ, MZ0 } = CH; void TW; void WINGZ;
    const box = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => { const w = this.toWorld(cx, cy, cz); this.bodies.push(this.phys.staticBox(w.x, w.y, w.z, sx / 2, sy / 2, sz / 2, this.yaw).body); };
    const H = 6.4;
    box(-HW + T / 2, H / 2, (MZ0 + NZ1) / 2, T, H, NZ1 - MZ0); box(HW - T / 2, H / 2, (MZ0 + NZ1) / 2, T, H, NZ1 - MZ0); box(0, H / 2, NZ1 - T / 2, HW * 2, H, T);
    for (const sx of [-1, 1]) { box(sx * (HW + 0.85) / 2, H / 2, NZ0 + T / 2, HW - 0.85, H, T); box(sx * (WINGX - T / 2), H / 2, (TZ0 + MZ0) / 2, T, H, MZ0 - TZ0); box(sx * (HW + WINGX - T) / 2, H / 2, MZ0 + T / 2, HW - WINGX + T, H, T); box(sx * (WINGX + 0.575) / 2, H / 2, TZ0 + T / 2, WINGX - 0.575, H, T); }
    box(0, F + 2.12 + 1, TZ0 + T / 2, 1.2, 2, T); box(0, FN + 2.05 + 1.2, NZ0 + T / 2, 1.7, 2.4, T);
    box(0, FN / 2 - 0.25, (NZ0 + NZ1) / 2, HW * 2, FN + 0.5, NZ1 - NZ0);                     // nave floor slab
    box(0, F / 2 - 0.25, (MZ0 + NZ0) / 2, HW * 2, F + 0.5, NZ0 - MZ0); box(0, F / 2 - 0.25, (TZ0 + MZ0) / 2, WINGX * 2, F + 0.5, MZ0 - TZ0);                     // lobby floor slab (lower)
    { const d0 = -4.1 * (HW / 4.9) - 0.44, d1 = d0 + 0.88; box((-HW + d0) / 2, H / 2, PZ + 0.15, d0 + HW, H, 0.3); box((d1 + HW) / 2, H / 2, PZ + 0.15, HW - d1, H, 0.3); box((d0 + d1) / 2, FN + 1.98 + 1.5, PZ + 0.15, 0.9, 3, 0.3); }   // the screen; clergy enter the Meqdes by the side doorway
    // (the stage's colliders are built with the interior)
    const nSteps = 8, run = 0.3, rise = F / nSteps, landD = 1.3, sw = 2.2;
    box(0, F / 2 - 0.2, TZ0 - landD / 2, sw, F + 0.4, landD);
    for (let i = 0; i < nSteps - 1; i++) { const h = F - (i + 1) * rise; box(0, h / 2 - 0.2, TZ0 - landD - (i + 0.5) * run, sw, h + 0.4, run); }
    const zEnd = TZ0 - landD - (nSteps - 1) * run;
    for (const sx of [-1, 1]) box(sx * (sw / 2 + 0.02), F / 2 + 0.5, (TZ0 + zEnd) / 2, 0.06, F + 1.6, TZ0 - zEnd);
    for (const c of this.refs.colliders) box(c[0], c[1], c[2], c[3], c[4], c[5]);
  }

  update(dt: number, playerPos: THREE.Vector3, time: number) {
    // auto-open the front door when someone approaches
    const l = this.toLocal(playerPos); const near = Math.abs(l.x) < 1.6 && l.z > CH.TZ0 - 2.3 && l.z < CH.TZ0 + 1.8 && l.y > CH.FL - 0.6;
    this.refs.naveDoorWant = Math.abs(l.x) < 1.4 && l.z > CH.NZ0 - 2.3 && l.z < CH.NZ0 + 1.9 ? 1 : 0;
    const want = Math.max(near ? 1 : 0, this.doorWant);
    this.doorOpen += (want - this.doorOpen) * Math.min(1, dt * 4);
    this.door.rotation.y = this.doorOpen * 1.75;
    for (const f of this.flags) { const p = f.geometry.attributes.position, b = f.userData.base as Float32Array; for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setZ(i, Math.sin(x * 5 + time * 5) * 0.06 * (x + 0.6)); } p.needsUpdate = true; }
    this.refs.update(dt, time);
  }
}

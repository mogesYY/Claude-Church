// Procedural Brandon houses (1900s–1950s wood-frame), garages and simplified commercial blocks.
// Deterministic per footprint id. Everything in a chunk is merged into a handful of meshes.
import * as THREE from 'three/webgpu';
import { Geo, mulberry } from '../core/geo';
import type { Materials, Season } from './materials';

export interface BuildingData { id: number; pts: number[][]; levels: number; kind: string; name: string; num: string; gen?: boolean }
export interface Obb { cx: number; cz: number; hw: number; hd: number; yaw: number; h: number }

const WALL_COLORS = [0xe9e4d6, 0xf1ead0, 0xd9d2bd, 0xc9d3c2, 0xb9c7cf, 0xcfcfcf, 0xe8dcc0, 0xbfae94, 0xd8c7b8, 0xa9b7a2, 0xf4f2ec, 0x9fb0bd, 0xd7b9a8, 0x8f9a86, 0xe6d9a8];
const ROOF_COLORS = [0x3c3c40, 0x4a3f38, 0x55585a, 0x3f4a44, 0x6a4038, 0x2f3338, 0x5a5048];
const TRIM_COLORS = [0xf5f5f0, 0xf5f5f0, 0xf5f5f0, 0x3b4a3f, 0x5a3a2e, 0x2e3d4f, 0xe8e0c8];
const DOOR_COLORS = [0x6b2f2a, 0x2f4a3a, 0x283a55, 0xf0ece0, 0x4a3524, 0x1e1e1e, 0x8a6a2a];
const BRICK_COLORS = [0x9a5a48, 0xb89a78, 0x8a8a88, 0xcfc4ae, 0x7a4a3c, 0xa8a49c, 0xb07a5a];

export class ChunkGeo {
  siding = new Geo(); vsiding = new Geo(); stucco = new Geo(); roof = new Geo(); trim = new Geo(); glass = new Geo(); glassLit = new Geo();
  concrete = new Geo(); facade = new Geo(); wood = new Geo(); chain = new Geo();
  setMatrix(m: THREE.Matrix4 | null) { for (const g of this.all()) g.setMatrix(m); }
  all() { return [this.siding, this.vsiding, this.stucco, this.roof, this.trim, this.glass, this.glassLit, this.concrete, this.facade, this.wood, this.chain]; }
  toGroup(m: Materials): THREE.Group {
    const grp = new THREE.Group();
    const add = (g: Geo, mat: THREE.Material, cast = true) => { if (g.count) grp.add(g.mesh(mat, cast)); };
    add(this.siding, m.siding); add(this.vsiding, m.vsiding); add(this.stucco, m.stucco); add(this.roof, m.roof); add(this.trim, m.trim);
    add(this.glass, m.glass, false); add(this.glassLit, m.glassLit, false); add(this.concrete, m.concrete); add(this.facade, m.facade); add(this.wood, m.wood); add(this.chain, m.chain, false);
    return grp;
  }
}

/** minimum-area bounding rectangle of a footprint */
export function obbOf(pts: number[][]): { cx: number; cz: number; hw: number; hd: number; yaw: number } {
  let best = { area: 1e18, cx: 0, cz: 0, hw: 1, hd: 1, yaw: 0 };
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue;
    const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
    let mnu = 1e9, mxu = -1e9, mnv = 1e9, mxv = -1e9;
    for (const p of pts) { const u = p[0] * ux + p[1] * uz, v = -p[0] * uz + p[1] * ux; mnu = Math.min(mnu, u); mxu = Math.max(mxu, u); mnv = Math.min(mnv, v); mxv = Math.max(mxv, v); }
    const ar = (mxu - mnu) * (mxv - mnv);
    if (ar < best.area) { const cu = (mnu + mxu) / 2, cv = (mnv + mxv) / 2; best = { area: ar, cx: cu * ux - cv * uz, cz: cu * uz + cv * ux, hw: (mxu - mnu) / 2, hd: (mxv - mnv) / 2, yaw: Math.atan2(-uz, ux) }; }
  }
  return best;
}

const C = (hex: number, mul = 1) => new THREE.Color(hex).multiplyScalar(mul);

function windowAt(cg: ChunkGeo, x: number, y: number, z: number, w: number, h: number, axis: 'x' | 'z', dir: number, trim: THREE.Color, lit: boolean) {
  // axis: wall normal axis; dir ±1. frame + glass slightly proud of the wall
  const t = 0.07, e = 0.03, g = lit ? cg.glassLit : cg.glass;
  if (axis === 'z') {
    cg.trim.box(x, y, z + dir * e, w + 2 * t, h + 2 * t, 0.06, trim);
    const zz = z + dir * (e + 0.035);
    if (dir > 0) g.quad([x - w / 2, y - h / 2, zz], [x + w / 2, y - h / 2, zz], [x + w / 2, y + h / 2, zz], [x - w / 2, y + h / 2, zz], 0xffffff);
    else g.quad([x + w / 2, y - h / 2, zz], [x - w / 2, y - h / 2, zz], [x - w / 2, y + h / 2, zz], [x + w / 2, y + h / 2, zz], 0xffffff);
    cg.trim.box(x, y, zz + dir * 0.005, w, 0.04, 0.01, trim);
  } else {
    cg.trim.box(x + dir * e, y, z, 0.06, h + 2 * t, w + 2 * t, trim);
    const xx = x + dir * (e + 0.035);
    if (dir > 0) g.quad([xx, y - h / 2, z + w / 2], [xx, y - h / 2, z - w / 2], [xx, y + h / 2, z - w / 2], [xx, y + h / 2, z + w / 2], 0xffffff);
    else g.quad([xx, y - h / 2, z - w / 2], [xx, y - h / 2, z + w / 2], [xx, y + h / 2, z + w / 2], [xx, y + h / 2, z - w / 2], 0xffffff);
    cg.trim.box(xx + dir * 0.005, y, z, 0.01, 0.04, w, trim);
  }
}

/** gable roof over a rectangle centred at origin; ridge along x (ridgeX) or z. returns ridge height */
function gableRoof(cg: ChunkGeo, wallGeo: Geo, hw: number, hd: number, y: number, pitch: number, ridgeX: boolean, roofCol: THREE.Color, wallCol: THREE.Color, o = 0.4) {
  if (ridgeX) {
    const rise = hd * pitch, yo = y - o * pitch;
    cg.roof.quad([-hw - o, yo, hd + o], [hw + o, yo, hd + o], [hw + o, y + rise, 0], [-hw - o, y + rise, 0], roofCol, [0, 0, (2 * hw) / 2, hd / 1.5]);
    cg.roof.quad([hw + o, yo, -hd - o], [-hw - o, yo, -hd - o], [-hw - o, y + rise, 0], [hw + o, y + rise, 0], roofCol, [0, 0, (2 * hw) / 2, hd / 1.5]);
    wallGeo.tri([hw, y, hd], [hw, y, -hd], [hw, y + rise, 0], wallCol, [0, 0, 2 * hd, 0, hd, rise]);
    wallGeo.tri([-hw, y, -hd], [-hw, y, hd], [-hw, y + rise, 0], wallCol, [0, 0, 2 * hd, 0, hd, rise]);
    // eave undersides (so the overhang is not see-through from below)
    cg.trim.quad([-hw - o, yo, hd + o], [-hw - o, yo, hd], [hw + o, yo, hd], [hw + o, yo, hd + o], 0xe8e8e2);
    cg.trim.quad([hw + o, yo, -hd - o], [hw + o, yo, -hd], [-hw - o, yo, -hd], [-hw - o, yo, -hd - o], 0xe8e8e2);
    return rise;
  }
  const rise = hw * pitch, yo = y - o * pitch;
  cg.roof.quad([hw + o, yo, hd + o], [hw + o, yo, -hd - o], [0, y + rise, -hd - o], [0, y + rise, hd + o], roofCol, [0, 0, (2 * hd) / 2, hw / 1.5]);
  cg.roof.quad([-hw - o, yo, -hd - o], [-hw - o, yo, hd + o], [0, y + rise, hd + o], [0, y + rise, -hd - o], roofCol, [0, 0, (2 * hd) / 2, hw / 1.5]);
  wallGeo.tri([-hw, y, hd], [hw, y, hd], [0, y + rise, hd], wallCol, [0, 0, 2 * hw, 0, hw, rise]);
  wallGeo.tri([hw, y, -hd], [-hw, y, -hd], [0, y + rise, -hd], wallCol, [0, 0, 2 * hw, 0, hw, rise]);
  cg.trim.quad([hw + o, yo, hd + o], [hw, yo, hd + o], [hw, yo, -hd - o], [hw + o, yo, -hd - o], 0xe8e8e2);
  cg.trim.quad([-hw - o, yo, -hd - o], [-hw, yo, -hd - o], [-hw, yo, hd + o], [-hw - o, yo, hd + o], 0xe8e8e2);
  return rise;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _up = new THREE.Vector3(0, 1, 0);

/**
 * Build one building into the chunk geometry. `toRoad` is the unit vector from the footprint centre to the nearest street.
 * Returns the collision box.
 */
export function buildBuilding(cg: ChunkGeo, b: BuildingData, y0: number, toRoad: [number, number], season: Season, era = 0): Obb {
  const rnd = mulberry(Math.abs(b.id) * 2654435761 + (b.id < 0 ? 17 : 0));
  const o = obbOf(b.pts);
  const snow = season === 'winter';
  const roofCol = snow ? C(0xf2f5fa) : C(ROOF_COLORS[Math.floor(rnd() * ROOF_COLORS.length)]);
  if (b.kind === 'house' || b.kind === 'garage') {
    // orient local -z toward the street
    let yaw = o.yaw, hw = o.hw, hd = o.hd, bestDot = -2;
    for (let k = 0; k < 4; k++) {
      const a = o.yaw + (k * Math.PI) / 2; const fx = -Math.sin(a), fz = -Math.cos(a); const d = fx * toRoad[0] + fz * toRoad[1];
      if (d > bestDot) { bestDot = d; yaw = a; hw = k % 2 ? o.hd : o.hw; hd = k % 2 ? o.hw : o.hd; }
    }
    _q.setFromAxisAngle(_up, yaw); _m.compose(_p.set(o.cx, y0, o.cz), _q, _s); cg.setMatrix(_m);
    hw = Math.max(1.2, Math.min(hw, 9)); hd = Math.max(1.5, Math.min(hd, 10));
    if (b.kind === 'garage') {
      const wallCol = C(WALL_COLORS[Math.floor(rnd() * WALL_COLORS.length)], 0.92); const h = 2.5;
      cg.siding.box(0, h / 2, 0, hw * 2, h, hd * 2, wallCol, 1, 0b001111);
      gableRoof(cg, cg.siding, hw, hd, h, 0.33, hw > hd, roofCol, wallCol, 0.25);
      // overhead door faces away from the street (toward the back lane)
      const dw = Math.min(hw * 2 - 0.6, 2.7 + (hw > 2.6 ? 2.2 : 0));
      cg.trim.box(0, 1.1, hd + 0.03, dw, 2.1, 0.05, C(0xeeeee8));
      for (let i = 1; i < 4; i++) cg.trim.box(0, i * 0.52, hd + 0.06, dw, 0.03, 0.02, C(0xc8c8c2));
      cg.setMatrix(null);
      return { cx: o.cx, cz: o.cz, hw, hd, yaw, h: h + 1 };
    }
    const type = rnd() < 0.34 ? 0 : rnd() < 0.62 ? 1 : 2;       // 0 bungalow, 1 one-and-a-half, 2 two-storey
    const stuccoWall = rnd() < 0.45;
    const wallCol = C(WALL_COLORS[Math.floor(rnd() * WALL_COLORS.length)]);
    const trim = C(TRIM_COLORS[Math.floor(rnd() * TRIM_COLORS.length)]);
    const wg = stuccoWall ? cg.stucco : cg.siding;
    const fh = 0.5, wallH = type === 0 ? 2.7 : type === 1 ? 3.0 : 5.5, top = fh + wallH;
    cg.concrete.box(0, fh / 2, 0, hw * 2 + 0.06, fh, hd * 2 + 0.06, C(0xb9b6ae), 1, 0b001111);
    wg.box(0, fh + wallH / 2, 0, hw * 2, wallH, hd * 2, wallCol, 1, 0b001111);
    const gableFront = type === 1 ? rnd() < 0.7 : rnd() < 0.35;
    const pitch = type === 0 ? 0.42 : type === 1 ? 0.95 : 0.6;
    const ridgeX = !gableFront;
    const rise = gableRoof(cg, wg, hw, hd, top, pitch, ridgeX, roofCol, wallCol);
    // chimney
    if (rnd() < 0.75) { const cx = (rnd() - 0.5) * hw, cz = (rnd() - 0.2) * hd * 0.8; const ch = top + rise + 0.7; cg.facade.box(cx, ch / 2 + 1, cz, 0.6, ch - 2, 0.6, C(0x8a4f3f), 4); cg.concrete.box(cx, ch + 0.04, cz, 0.7, 0.08, 0.7, C(0x9a9a96)); }
    // windows
    const lit = () => rnd() < 0.35;
    const wy = fh + 1.5, ww = 0.95, wh = 1.25;
    const doorX = (rnd() < 0.5 ? -1 : 1) * hw * (0.15 + rnd() * 0.35);
    // front
    for (const sx of [-1, 1]) { const x = sx * hw * 0.58; if (Math.abs(x - doorX) > 1.0) windowAt(cg, x, wy, -hd, ww * (type === 0 ? 1.5 : 1), wh, 'z', -1, trim, lit()); }
    if (type === 2) for (const sx of [-1, 1]) windowAt(cg, sx * hw * 0.5, fh + 4.2, -hd, ww, wh, 'z', -1, trim, lit());
    if (gableFront && rise > 2.2) windowAt(cg, 0, top + rise * 0.36, -hd, 0.8, 1.0, 'z', -1, trim, lit());
    if (!gableFront && type === 1) { // front dormer
      const dw = 1.5, dy = top + rise * 0.3, dz = -hd * 0.45;
      wg.box(0, dy + 0.6, dz, dw, 1.2, 1.4, wallCol, 1, 0b001110);
      cg.roof.quad([-dw / 2 - 0.15, dy + 1.2, dz - 0.85], [0, dy + 1.75, dz - 0.85], [0, dy + 1.75, dz + 1.2], [-dw / 2 - 0.15, dy + 1.2, dz + 1.2], roofCol);
      cg.roof.quad([0, dy + 1.75, dz - 0.85], [dw / 2 + 0.15, dy + 1.2, dz - 0.85], [dw / 2 + 0.15, dy + 1.2, dz + 1.2], [0, dy + 1.75, dz + 1.2], roofCol);
      wg.tri([dw / 2, dy + 1.2, dz - 0.7], [-dw / 2, dy + 1.2, dz - 0.7], [0, dy + 1.7, dz - 0.7], wallCol);
      windowAt(cg, 0, dy + 0.65, dz - 0.7, 0.8, 0.9, 'z', -1, trim, lit());
    }
    // sides + back
    for (const sx of [-1, 1]) for (const fz of [-0.45, 0.4]) { if (rnd() < 0.85) windowAt(cg, sx * hw, wy, fz * hd, 0.9, 1.2, 'x', sx, trim, lit()); if (type === 2 && rnd() < 0.8) windowAt(cg, sx * hw, fh + 4.2, fz * hd, 0.9, 1.2, 'x', sx, trim, lit()); }
    if (!gableFront && rise > 2.4) for (const sx of [-1, 1]) windowAt(cg, sx * hw, top + rise * 0.33, 0, 0.8, 1.0, 'x', sx, trim, lit());
    windowAt(cg, hw * 0.4, wy, hd, 1.0, 1.1, 'z', 1, trim, lit());
    // door + porch
    const doorCol = C(DOOR_COLORS[Math.floor(rnd() * DOOR_COLORS.length)]);
    cg.trim.box(doorX, fh + 1.05, -hd - 0.03, 1.02, 2.14, 0.06, trim);
    cg.trim.box(doorX, fh + 1.02, -hd - 0.06, 0.88, 2.02, 0.04, doorCol);
    const porch = rnd();
    if (porch < 0.62) {
      const full = porch < 0.3; const pw = full ? hw * 2 - 0.3 : 2.6, px = full ? 0 : doorX, pd = 1.9;
      cg.wood.box(px, fh / 2, -hd - pd / 2, pw, fh, pd, C(0x9a9288));
      const ph = 2.35, n = full ? 4 : 2;
      for (let i = 0; i < n; i++) { const x = px - pw / 2 + 0.1 + (i * (pw - 0.2)) / (n - 1); cg.trim.box(x, fh + ph / 2, -hd - pd + 0.1, 0.13, ph, 0.13, trim); }
      // rail
      for (let i = 0; i < n - 1; i++) { const xa = px - pw / 2 + 0.1 + (i * (pw - 0.2)) / (n - 1), xb = px - pw / 2 + 0.1 + ((i + 1) * (pw - 0.2)) / (n - 1); if (Math.abs((xa + xb) / 2 - doorX) > 0.9 || n === 2 && false) cg.trim.box((xa + xb) / 2, fh + 0.85, -hd - pd + 0.1, xb - xa, 0.07, 0.06, trim); }
      // shed roof
      cg.roof.quad([px - pw / 2 - 0.2, fh + ph + 0.05, -hd - pd - 0.25], [px + pw / 2 + 0.2, fh + ph + 0.05, -hd - pd - 0.25], [px + pw / 2 + 0.2, fh + ph + 0.65, -hd], [px - pw / 2 - 0.2, fh + ph + 0.65, -hd], roofCol);
      cg.trim.quad([px + pw / 2 + 0.2, fh + ph + 0.04, -hd - pd - 0.25], [px - pw / 2 - 0.2, fh + ph + 0.04, -hd - pd - 0.25], [px - pw / 2 - 0.2, fh + ph + 0.04, -hd], [px + pw / 2 + 0.2, fh + ph + 0.04, -hd], 0xe8e8e2);
      for (let i = 0; i < 3; i++) cg.concrete.box(doorX, fh - (i + 0.5) * (fh / 3), -hd - pd - 0.15 - i * 0.28, 1.3, fh / 3, 0.3, C(0xb4b1a9));
    } else for (let i = 0; i < 3; i++) cg.concrete.box(doorX, fh - (i + 0.5) * (fh / 3) + 0.0, -hd - 0.2 - i * 0.28, 1.4, fh / 3, 0.32 + (i === 0 ? 0.5 : 0), C(0xb4b1a9));
    // front walk
    cg.concrete.box(doorX, 0.03, -hd - 5.5, 1.0, 0.06, 6.5, C(snow ? 0xe9edf2 : 0xb9b6ae), 1, 0b010000);
    // backyard fence (deterministic subset)
    const f = rnd();
    if (b.gen && f < 0.5) {
      const fw = hw + 2.4, f0 = hd * 0.2, f1 = hd + 11, fhh = f < 0.3 ? 1.5 : 1.15;
      const seg = (xa: number, za: number, xb: number, zb: number) => {
        if (f < 0.3) { const cxm = (xa + xb) / 2, czm = (za + zb) / 2; cg.wood.box(cxm, fhh / 2, czm, Math.abs(xb - xa) + 0.06, fhh, Math.abs(zb - za) + 0.06, C(f < 0.15 ? 0x8a7458 : 0xcfc8b8), 1); }
        else { cg.chain.quad([xa, 0, za], [xb, 0, zb], [xb, fhh, zb], [xa, fhh, za], 0xffffff, [0, 0, Math.hypot(xb - xa, zb - za) / 0.3, fhh / 0.3]); cg.trim.box(xa, fhh / 2, za, 0.05, fhh, 0.05, C(0x9aa0a6)); }
      };
      seg(-fw, f0, -fw, f1); seg(fw, f0, fw, f1); seg(-fw, f1, fw, f1);
    }
    cg.setMatrix(null);
    return { cx: o.cx, cz: o.cz, hw, hd, yaw, h: top + rise };
  }
  // ---------- commercial / institutional: extruded footprint, flat roof ----------
  let pts = b.pts;
  let sh = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; sh += a[0] * c[1] - c[0] * a[1]; }
  if (sh < 0) pts = [...pts].reverse();
  const levels = b.levels || (b.kind === 'apartments' ? 3 : 1 + Math.floor(rnd() * rnd() * 3));
  const storey = 3.6, h = levels * storey + 0.6;
  const col = C(BRICK_COLORS[Math.floor(rnd() * BRICK_COLORS.length)], era ? 0.9 : 1);
  cg.setMatrix(null);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], c = pts[(i + 1) % pts.length]; const len = Math.hypot(c[0] - a[0], c[1] - a[1]); if (len < 0.2) continue;
    const bays = Math.max(1, Math.round(len / 4));
    cg.facade.quad([c[0], y0 - 1, c[1]], [a[0], y0 - 1, a[1]], [a[0], y0 + levels * storey, a[1]], [c[0], y0 + levels * storey, c[1]], col, [0, -1 / storey, bays, levels]);
    cg.concrete.quad([c[0], y0 + levels * storey, c[1]], [a[0], y0 + levels * storey, a[1]], [a[0], y0 + h, a[1]], [c[0], y0 + h, c[1]], C(0xa9a69f));
  }
  try {
    const contour = pts.map((p) => new THREE.Vector2(p[0], p[1]));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const rc = snow ? C(0xf2f5fa) : C(0x55565a);
    for (const t of tris) cg.concrete.tri([pts[t[0]][0], y0 + h - 0.25, pts[t[0]][1]], [pts[t[2]][0], y0 + h - 0.25, pts[t[2]][1]], [pts[t[1]][0], y0 + h - 0.25, pts[t[1]][1]], rc);
  } catch { /* degenerate footprint */ }
  return { cx: o.cx, cz: o.cz, hw: o.hw, hd: o.hd, yaw: o.yaw, h };
}

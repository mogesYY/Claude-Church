// Small geometry-building utilities shared by world, church, vehicles and characters.
import * as THREE from 'three/webgpu';

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();

/** Accumulates triangles with per-vertex colour + uv; flat or supplied normals. */
export class Geo {
  pos: number[] = []; nor: number[] = []; col: number[] = []; uv: number[] = []; idx: number[] = [];
  /** optional transform applied to everything added (local -> world) */
  mat: THREE.Matrix4 | null = null;
  private nmat = new THREE.Matrix3();
  setMatrix(m: THREE.Matrix4 | null) { this.mat = m; if (m) this.nmat.getNormalMatrix(m); }
  get count() { return this.pos.length / 3; }

  vert(x: number, y: number, z: number, nx: number, ny: number, nz: number, c: THREE.Color, u = 0, v = 0) {
    if (this.mat) {
      _v.set(x, y, z).applyMatrix4(this.mat); x = _v.x; y = _v.y; z = _v.z;
      _v.set(nx, ny, nz).applyMatrix3(this.nmat).normalize(); nx = _v.x; ny = _v.y; nz = _v.z;
    }
    this.pos.push(x, y, z); this.nor.push(nx, ny, nz); this.col.push(c.r, c.g, c.b); this.uv.push(u, v);
    return this.pos.length / 3 - 1;
  }

  /** quad a,b,c,d counter-clockwise seen from the front; flat normal. uv = [u0,v0,u1,v1] */
  quad(a: number[], b: number[], c: number[], d: number[], color: THREE.Color | number, uv: number[] = [0, 0, 1, 1]) {
    const col = typeof color === 'number' ? _c.set(color).clone() : color;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i = this.vert(a[0], a[1], a[2], nx, ny, nz, col, uv[0], uv[1]);
    this.vert(b[0], b[1], b[2], nx, ny, nz, col, uv[2], uv[1]);
    this.vert(c[0], c[1], c[2], nx, ny, nz, col, uv[2], uv[3]);
    this.vert(d[0], d[1], d[2], nx, ny, nz, col, uv[0], uv[3]);
    this.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  tri(a: number[], b: number[], c: number[], color: THREE.Color | number, uvs: number[] = [0, 0, 1, 0, 0.5, 1]) {
    const col = typeof color === 'number' ? _c.set(color).clone() : color;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const i = this.vert(a[0], a[1], a[2], nx, ny, nz, col, uvs[0], uvs[1]);
    this.vert(b[0], b[1], b[2], nx, ny, nz, col, uvs[2], uvs[3]);
    this.vert(c[0], c[1], c[2], nx, ny, nz, col, uvs[4], uvs[5]);
    this.idx.push(i, i + 1, i + 2);
  }
  /** axis-aligned box (in current matrix space) centred at cx,cy,cz. uvScale: metres per uv unit */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: THREE.Color | number, uvScale = 1, faces = 0b111111) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2, s = uvScale;
    if (faces & 1) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, [0, 0, sx / s, sy / s]);   // +z
    if (faces & 2) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color, [0, 0, sx / s, sy / s]);   // -z
    if (faces & 4) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color, [0, 0, sz / s, sy / s]);   // +x
    if (faces & 8) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color, [0, 0, sz / s, sy / s]);   // -x
    if (faces & 16) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], color, [0, 0, sx / s, sz / s]);  // +y
    if (faces & 32) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color, [0, 0, sx / s, sz / s]);  // -y
  }
  /** box-section beam between two points */
  beam(a: number[], b: number[], t: number, color: THREE.Color | number, t2 = t) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = d.length(); if (len < 1e-5) return;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1));
    const saved = this.mat; this.setMatrix(saved ? saved.clone().multiply(m) : m); this.box(0, 0, 0, t, t2, len, color); this.setMatrix(saved);
  }
  /** append an existing geometry (transformed by m, tinted) */
  merge(g: THREE.BufferGeometry, m: THREE.Matrix4 | null, color: THREE.Color | number) {
    const col = typeof color === 'number' ? _c.set(color).clone() : color;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, base = this.count;
    const saved = this.mat; const full = m ? (saved ? _m.multiplyMatrices(saved, m).clone() : m) : saved;
    this.setMatrix(full);
    for (let i = 0; i < p.count; i++) this.vert(p.getX(i), p.getY(i), p.getZ(i), n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0, col, u ? u.getX(i) : 0, u ? u.getY(i) : 0);
    this.setMatrix(saved);
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(base + g.index.getX(i)); else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  mesh(mat: THREE.Material, shadows = true): THREE.Mesh {
    const m = new THREE.Mesh(this.build(), mat); m.castShadow = shadows; m.receiveShadow = true; return m;
  }
}

/** canvas texture helper */
export function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: boolean; srgb?: boolean; aniso?: number } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.repeat !== false) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso ?? 8;
  return t;
}

/** fill canvas with value noise speckle (cheap procedural material detail) */
export function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], amp: number, seed = 1, scale = 1) {
  const img = ctx.getImageData(0, 0, w, h); const d = img.data; const r = mulberry(seed);
  // layered noise
  const g = new Float32Array(w * h);
  for (let o = 0; o < 3; o++) {
    const cs = Math.max(1, Math.round((8 >> o) * scale)), gw = Math.ceil(w / cs) + 1, gh = Math.ceil(h / cs) + 1; const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const gx = (x / cs) | 0, gy = (y / cs) | 0, fx = x / cs - gx, fy = y / cs - gy;
      const gx1 = (gx + 1) % (gw - 1), gy1 = (gy + 1) % (gh - 1);
      const a = grid[gy * gw + gx], b = grid[gy * gw + gx1], c2 = grid[gy1 * gw + gx], e = grid[gy1 * gw + gx1];
      g[y * w + x] += (a + (b - a) * fx + (c2 - a) * fy + (a - b - c2 + e) * fx * fy) / (3 - o * 0.5);
    }
  }
  for (let i = 0; i < w * h; i++) {
    const n = (g[i] / 1.4 - 0.5) * 2 * amp + (r() - 0.5) * amp * 0.5;
    d[i * 4] = Math.max(0, Math.min(255, base[0] + n)); d[i * 4 + 1] = Math.max(0, Math.min(255, base[1] + n)); d[i * 4 + 2] = Math.max(0, Math.min(255, base[2] + n)); d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function pointInPoly(x: number, z: number, poly: number[][]) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
export function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number) { const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz || 1e-9; let t = ((px - ax) * dx + (pz - az) * dz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, pz - az - t * dz); }

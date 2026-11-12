// The neighbourhood: terrain, roads, sidewalks, areas, streamed building/tree chunks, street furniture.
import * as THREE from 'three/webgpu';
import { texture, uv, positionWorld } from 'three/tsl';
import type { Engine } from '../core/engine';
import type { Physics } from '../core/physics';
import { Geo, canvasTex, speckle, mulberry, smooth, segDist, pointInPoly } from '../core/geo';
import { Materials, Season } from './materials';
import { ChunkGeo, buildBuilding, BuildingData } from './houses';

export interface RoadData { id: number; kind: string; name: string; w: number; lanes: number; oneway: boolean; pts: number[][]; sidewalk: boolean; surface: string }
export interface WorldData {
  source: string; origin: { lat: number; lon: number }; chunk: number; bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  church: { x: number; z: number; yaw: number; street: string };
  roads: RoadData[]; areas: { kind: string; name: string; pts: number[][] }[]; rails: number[][][];
  nav: { nodes: number[][]; edges: number[][] }; pois: { name: string; kind: string; x: number; z: number }[]; chunks: string[]; guessed: string[];
}
interface Seg { ax: number; az: number; bx: number; bz: number; hw: number; ri: number }
interface LoadedChunk { key: string; group: THREE.Group | null; bodies: any[]; state: 'loading' | 'ready'; data?: any }
export interface Control { type: 'stop' | 'signal'; stopRoads: Set<number> }

const RANK: Record<string, number> = { motorway: 4, trunk: 4, primary: 4, secondary: 3, tertiary: 2, residential: 1, unclassified: 1, living_street: 1, service: 0 };
const CELL = 20;

export class World {
  data!: WorldData;
  mats = new Materials();
  season: Season = 'summer';
  group = new THREE.Group();
  private gridW = 0; private gridH = 0; private gx0 = 0; private gz0 = 0; private heights!: Float32Array;
  private segGrid = new Map<string, Seg[]>();
  private chunks = new Map<string, LoadedChunk>();
  private chunkSet = new Set<string>();
  private queue: string[] = [];
  private building = false;
  loadRadius = 420;
  control = new Map<number, Control>();
  /** adjacency: node -> [neighbourNode, roadIdx][] (respects one-way) */
  adj: number[][][] = [];
  private terrain!: THREE.Mesh; private splat!: THREE.CanvasTexture; private splatCanvas!: HTMLCanvasElement;
  private snowbankMeshes: THREE.Mesh[] = []; private roadTiles: { grp: THREE.Group; x: number; z: number }[] = [];
  private treeGeos: { trunk: THREE.BufferGeometry; crown: THREE.BufferGeometry }[] = [];
  private lampPositions: THREE.Vector3[] = [];
  private lampLights: THREE.PointLight[] = [];
  waterY = -1;
  /** rectangles (world XZ polygons) where nothing is generated, e.g. the church lot */
  reserved: number[][][] = [];
  pendingChunks = 0;

  constructor(private engine: Engine, private phys: Physics) {}

  async load() {
    const base = import.meta.env.BASE_URL;
    this.data = await (await fetch(`${base}world/world.json`)).json();
    this.chunkSet = new Set(this.data.chunks);
    this.buildSegGrid();
    this.buildHeights();
    this.buildNav();
    this.buildTerrain();
    this.buildRoads();
    this.buildWaterAndRails();
    this.buildTreeGeos();
    this.engine.scene.add(this.group);
    const q = this.engine.quality;
    this.loadRadius = q === 'ultra' ? 620 : q === 'high' ? 430 : 300;
    if (q !== 'low') for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffd9a0, 0, 26, 1.6); l.position.set(0, -100, 0); this.lampLights.push(l); this.group.add(l); }
  }

  // ------------------------------------------------------------ queries
  private key(x: number, z: number) { return `${Math.floor(x / 40)},${Math.floor(z / 40)}`; }
  private buildSegGrid() {
    this.data.roads.forEach((r, ri) => {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const a = r.pts[i], b = r.pts[i + 1]; const s: Seg = { ax: a[0], az: a[1], bx: b[0], bz: b[1], hw: r.w / 2, ri };
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 30) + 1; const seen = new Set<string>();
        for (let k = 0; k <= n; k++) { const kk = this.key(a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n); if (!seen.has(kk)) { seen.add(kk); (this.segGrid.get(kk) ?? this.segGrid.set(kk, []).get(kk)!).push(s); } }
      }
    });
  }
  /** nearest road segment within ~range cells; returns distance to centreline and the segment */
  nearestRoad(x: number, z: number, drivableOnly = false, cells = 2): { d: number; seg: Seg | null; px: number; pz: number } {
    const cx = Math.floor(x / 40), cz = Math.floor(z / 40); let best = 1e9, bs: Seg | null = null, bpx = 0, bpz = 0;
    for (let i = -cells; i <= cells; i++) for (let j = -cells; j <= cells; j++) for (const s of this.segGrid.get(`${cx + i},${cz + j}`) ?? []) {
      if (drivableOnly && (this.data.roads[s.ri].lanes === 0 || this.data.roads[s.ri].kind === 'service')) continue;
      const dx = s.bx - s.ax, dz = s.bz - s.az; const l2 = dx * dx + dz * dz || 1e-9; const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
      const px = s.ax + t * dx, pz = s.az + t * dz, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; bs = s; bpx = px; bpz = pz; }
    }
    return { d: best, seg: bs, px: bpx, pz: bpz };
  }
  onRoad(x: number, z: number) { const n = this.nearestRoad(x, z, false, 1); return !!n.seg && n.d < n.seg.hw; }
  private nearOtherRoad(x: number, z: number, self: number, margin: number) {
    const cx = Math.floor(x / 40), cz = Math.floor(z / 40);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const s of this.segGrid.get(`${cx + i},${cz + j}`) ?? []) {
      if (s.ri === self) continue; const r = this.data.roads[s.ri]; if (r.lanes === 0) continue;
      if (segDist(x, z, s.ax, s.az, s.bx, s.bz) < s.hw + margin) return true;
    }
    return false;
  }

  private buildHeights() {
    const b = this.data.bounds, m = 320;
    this.gx0 = Math.floor((b.minX - m) / CELL) * CELL; this.gz0 = Math.floor((b.minZ - m) / CELL) * CELL;
    this.gridW = Math.ceil((b.maxX + m - this.gx0) / CELL) + 1; this.gridH = Math.ceil((b.maxZ + m - this.gz0) / CELL) + 1;
    this.heights = new Float32Array(this.gridW * this.gridH);
    const water = this.data.areas.filter((a) => a.kind === 'water');
    const edges: number[][] = []; for (const w of water) for (let i = 0; i < w.pts.length; i++) { const a = w.pts[i], c = w.pts[(i + 1) % w.pts.length]; edges.push([a[0], a[1], c[0], c[1]]); }
    for (let j = 0; j < this.gridH; j++) for (let i = 0; i < this.gridW; i++) {
      const x = this.gx0 + i * CELL, z = this.gz0 + j * CELL; let h: number;
      if (edges.length) {
        let d = 1e9; for (const e of edges) { const q = Math.abs(x - e[0]) + Math.abs(z - e[1]); if (q - 400 > d) continue; d = Math.min(d, segDist(x, z, e[0], e[1], e[2], e[3])); }
        const inside = d < 400 && water.some((w) => pointInPoly(x, z, w.pts));
        h = inside ? -3 : (d < 25 ? -3 + (d / 25) * 3.4 : 0.4 + 15 * smooth(25, 620, d) + 0.0035 * Math.max(0, d - 620));
      } else h = 12 + z * 0.002;
      this.heights[j * this.gridW + i] = h + 0.45 * Math.sin(x / 170) * Math.cos(z / 230);
    }
  }
  /** terrain height; matches the rendered triangles exactly */
  height(x: number, z: number): number {
    const fx = (x - this.gx0) / CELL, fz = (z - this.gz0) / CELL;
    const i = Math.max(0, Math.min(this.gridW - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.gridH - 2, Math.floor(fz)));
    const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j)); const H = this.heights, w = this.gridW;
    const h00 = H[j * w + i], h10 = H[j * w + i + 1], h01 = H[(j + 1) * w + i], h11 = H[(j + 1) * w + i + 1];
    return u > v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;
  }

  private buildNav() {
    const { nodes, edges } = this.data.nav; this.adj = nodes.map(() => []);
    const nodeRoads = nodes.map(() => new Set<number>());
    for (const [a, b, ri] of edges) { this.adj[a].push([b, ri]); if (!this.data.roads[ri].oneway) this.adj[b].push([a, ri]); nodeRoads[a].add(ri); nodeRoads[b].add(ri); }
    nodes.forEach((n, i) => {
      const rs = [...nodeRoads[i]]; if (rs.length < 2) return;
      const ranks = rs.map((r) => RANK[this.data.roads[r].kind] ?? 0); const mx = Math.max(...ranks), mn = Math.min(...ranks);
      const top = ranks.filter((r) => r === mx).length;
      if (mx >= 3 && top >= 2) { this.control.set(i, { type: 'signal', stopRoads: new Set() }); return; }
      if (mx < 1) return;
      const stop = new Set<number>();
      if (mn < mx) rs.forEach((r, k) => { if (ranks[k] < mx) stop.add(r); });
      else rs.forEach((r) => { const dir = this.roadDirAt(r, n[0], n[1]); if (Math.abs(dir[0]) > Math.abs(dir[1])) stop.add(r); });
      if (stop.size) this.control.set(i, { type: 'stop', stopRoads: stop });
    });
  }
  roadDirAt(ri: number, x: number, z: number): [number, number] {
    const p = this.data.roads[ri].pts; let best = 1e9, dir: [number, number] = [1, 0];
    for (let i = 0; i < p.length - 1; i++) { const d = segDist(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]); if (d < best) { best = d; const l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) || 1; dir = [(p[i + 1][0] - p[i][0]) / l, (p[i + 1][1] - p[i][1]) / l]; } }
    return dir;
  }
  nearestNavNode(x: number, z: number) { let b = -1, bd = 1e18; const n = this.data.nav.nodes; for (let i = 0; i < n.length; i++) { if (!this.adj[i].length) continue; const d = (n[i][0] - x) ** 2 + (n[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  /** A* over the road graph (binary heap); returns list of [x,z] from the start to the destination */
  route(fx: number, fz: number, tx: number, tz: number): number[][] {
    const n = this.data.nav.nodes, s = this.nearestNavNode(fx, fz), t = this.nearestNavNode(tx, tz); if (s < 0 || t < 0) return [];
    const g = new Float32Array(n.length).fill(1e18), from = new Int32Array(n.length).fill(-1), done = new Uint8Array(n.length);
    const heap: number[] = [], key: number[] = [];
    const push = (i: number, k: number) => { let c = heap.length; heap.push(i); key.push(k); while (c > 0) { const p = (c - 1) >> 1; if (key[p] <= key[c]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; [key[p], key[c]] = [key[c], key[p]]; c = p; } };
    const pop = () => { const top = heap[0]; const li = heap.pop()!, lk = key.pop()!; if (heap.length) { heap[0] = li; key[0] = lk; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && key[l] < key[m]) m = l; if (r < heap.length && key[r] < key[m]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; [key[m], key[c]] = [key[c], key[m]]; c = m; } } return top; };
    const hfn = (i: number) => Math.hypot(n[i][0] - n[t][0], n[i][1] - n[t][1]);
    g[s] = 0; push(s, hfn(s));
    while (heap.length) {
      const cur = pop(); if (done[cur]) continue; done[cur] = 1; if (cur === t) break;
      for (const [nb, ri] of this.adj[cur]) { if (done[nb]) continue; const kind = this.data.roads[ri].kind; const cost = Math.hypot(n[nb][0] - n[cur][0], n[nb][1] - n[cur][1]) * (kind === 'service' ? 3 : kind === 'residential' ? 1.1 : 1); if (g[cur] + cost < g[nb]) { g[nb] = g[cur] + cost; from[nb] = cur; push(nb, g[nb] + hfn(nb)); } }
    }
    if (from[t] < 0 && s !== t) return [[fx, fz], [tx, tz]];
    const path: number[][] = []; let c = t; while (c >= 0 && c !== s) { path.push([n[c][0], n[c][1]]); c = from[c]; } path.push([n[s][0], n[s][1]]); path.reverse();
    // start from where the player actually is: drop leading nodes that lie behind
    while (path.length > 1) { const a = path[0], b = path[1]; const ab = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const tproj = ((fx - a[0]) * (b[0] - a[0]) + (fz - a[1]) * (b[1] - a[1])) / (ab * ab); if (tproj > 0) { path.shift(); } else break; }
    path.unshift([fx, fz]);
    const last = path[path.length - 1]; if (Math.hypot(last[0] - tx, last[1] - tz) > 3) path.push([tx, tz]);
    return path;
  }
  private routeMesh: THREE.Mesh | null = null;
  /** gold guidance ribbon laid on the road along the GPS route */
  showRoute(path: number[][]) {
    if (this.routeMesh) { this.group.remove(this.routeMesh); this.routeMesh.geometry.dispose(); this.routeMesh = null; }
    if (path.length < 2) return;
    const g = new Geo(); const col = new THREE.Color(0xffc93a); const rs = this.resample(path, 4); let dist = 0;
    for (let i = 0; i < rs.length - 1 && dist < 420; i++) { const a = rs[i], b = rs[i + 1]; const sl = Math.hypot(b.x - a.x, b.z - a.z); const P = (e: typeof a, o: number) => [e.x - e.tz * o, this.height(e.x - e.tz * o, e.z + e.tx * o) + 0.11, e.z + e.tx * o]; if (Math.floor(dist / 2.2) % 2 === 0 || true) g.quad(P(a, -0.55), P(a, 0.55), P(b, 0.55), P(b, -0.55), col, [0, dist / 3, 1, (dist + sl) / 3]); dist += sl; }
    if (!this.routeMat) { const tex = canvasTex(64, 64, (c) => { c.clearRect(0, 0, 64, 64); c.fillStyle = 'rgba(255,201,58,0.9)'; c.beginPath(); c.moveTo(6, 56); c.lineTo(32, 20); c.lineTo(58, 56); c.lineTo(46, 56); c.lineTo(32, 38); c.lineTo(18, 56); c.closePath(); c.fill(); }); this.routeMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6, fog: false }); }
    this.routeMesh = new THREE.Mesh(g.build(), this.routeMat); this.routeMesh.renderOrder = 3; this.group.add(this.routeMesh);
  }
  private routeMat: THREE.MeshBasicMaterial | null = null;

  // ------------------------------------------------------------ terrain
  private drawSplat() {
    const c = this.splatCanvas, ctx = c.getContext('2d')!; const W = c.width, H = c.height;
    const x0 = this.gx0, z0 = this.gz0, sx = W / ((this.gridW - 1) * CELL), sz = H / ((this.gridH - 1) * CELL);
    const pal = {
      summer: { ground: '#5c9a3e', park: '#4fa63a', pitch: '#48b040', lot: '#77787a', bank: '#9a8f62', wood: '#3f8232' },
      autumn: { ground: '#9a8e40', park: '#a8963a', pitch: '#8f9a3c', lot: '#77787a', bank: '#8a7c5a', wood: '#a88030' },
      winter: { ground: '#eef2f7', park: '#f3f6fa', pitch: '#f3f6fa', lot: '#d9dee5', bank: '#e6ebf2', wood: '#e9edf2' },
      spring: { ground: '#7a8a48', park: '#6f9a44', pitch: '#62a444', lot: '#6f7072', bank: '#766e58', wood: '#5f8a3c' },
    }[this.season];
    ctx.fillStyle = pal.ground; ctx.fillRect(0, 0, W, H);
    const poly = (pts: number[][], fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach((p, i) => { const X = (p[0] - x0) * sx, Z = (p[1] - z0) * sz; if (i) ctx.lineTo(X, Z); else ctx.moveTo(X, Z); }); ctx.closePath(); ctx.fill(); };
    for (const a of this.data.areas) if (a.kind === 'park' || a.kind === 'wood') poly(a.pts, a.kind === 'wood' ? pal.wood : pal.park);
    for (const a of this.data.areas) if (a.kind === 'pitch') poly(a.pts, pal.pitch);
    for (const a of this.data.areas) if (a.kind === 'parking') poly(a.pts, pal.lot);
    ctx.lineJoin = 'round';
    for (const a of this.data.areas) if (a.kind === 'water') { ctx.strokeStyle = pal.bank; ctx.lineWidth = 40 * sx; ctx.beginPath(); a.pts.forEach((p, i) => { const X = (p[0] - x0) * sx, Z = (p[1] - z0) * sz; if (i) ctx.lineTo(X, Z); else ctx.moveTo(X, Z); }); ctx.closePath(); ctx.stroke(); }
    if (this.season === 'spring') { const r = mulberry(4); ctx.fillStyle = 'rgba(240,244,248,0.75)'; for (let i = 0; i < 2600; i++) { ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 2 + r() * 7, 1.5 + r() * 4, r() * 3, 0, 6.3); ctx.fill(); } }
    this.splat.needsUpdate = true;
  }
  private buildTerrain() {
    const W = this.gridW, H = this.gridH; const pos = new Float32Array(W * H * 3), uvs = new Float32Array(W * H * 2);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; pos[k * 3] = this.gx0 + i * CELL; pos[k * 3 + 1] = this.heights[k]; pos[k * 3 + 2] = this.gz0 + j * CELL; uvs[k * 2] = i / (W - 1); uvs[k * 2 + 1] = 1 - j / (H - 1); }
    const idx = new Uint32Array((W - 1) * (H - 1) * 6); let n = 0;
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) { const a = j * W + i, b = a + 1, c = a + W, d = c + 1; idx[n++] = a; idx[n++] = d; idx[n++] = b; idx[n++] = a; idx[n++] = c; idx[n++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
    this.splatCanvas = document.createElement('canvas'); this.splatCanvas.width = 1024; this.splatCanvas.height = 2048;
    this.splat = new THREE.CanvasTexture(this.splatCanvas); this.splat.colorSpace = THREE.SRGBColorSpace; this.splat.anisotropy = 4;
    const detail = canvasTex(256, 256, (c, w, h) => speckle(c, w, h, [200, 200, 200], 60, 23, 0.5), { srgb: false });
    const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.96 });
    mat.map = this.splat; // for the path tracer / fallback
    mat.colorNode = texture(this.splat, uv()).mul(texture(detail, positionWorld.xz.mul(0.21)).r.mul(0.7).add(0.5)).mul(texture(detail, positionWorld.xz.mul(0.013)).g.mul(0.35).add(0.8));
    this.terrain = new THREE.Mesh(g, mat); this.terrain.receiveShadow = true; this.group.add(this.terrain);
    this.drawSplat();
    this.phys.staticTrimesh(pos, idx, 0.9);
  }

  // ------------------------------------------------------------ roads
  private resample(pts: number[][], step = 5) {
    const out: { x: number; z: number; tx: number; tz: number }[] = [];
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.ceil(l / step)); for (let k = i === 0 ? 0 : 1; k <= n; k++) out.push({ x: a[0] + ((b[0] - a[0]) * k) / n, z: a[1] + ((b[1] - a[1]) * k) / n, tx: 0, tz: 0 }); }
    for (let i = 0; i < out.length; i++) { const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)]; const l = Math.hypot(b.x - a.x, b.z - a.z) || 1; out[i].tx = (b.x - a.x) / l; out[i].tz = (b.z - a.z) / l; }
    return out;
  }
  private buildRoads() {
    // road geometry is binned into spatial tiles so distant streets are culled
    type Tile = { asphalt: Geo; gravel: Geo; walk: Geo; mark: Geo; bank: Geo; signs: Geo; lampGeo: Geo; headGeo: Geo };
    const TS = 192; const tiles = new Map<string, Tile>();
    const tileAt = (x: number, z: number): Tile => { const k = `${Math.floor(x / TS)}_${Math.floor(z / TS)}`; let t = tiles.get(k); if (!t) { t = { asphalt: new Geo(), gravel: new Geo(), walk: new Geo(), mark: new Geo(), bank: new Geo(), signs: new Geo(), lampGeo: new Geo(), headGeo: new Geo() }; tiles.set(k, t); } return t; };
    const white = new THREE.Color(0xe8e8e8), yellow = new THREE.Color(0xd9b13a), conc = new THREE.Color(0xffffff), snowC = new THREE.Color(0xffffff);
    const nodes = this.data.nav.nodes;
    const junctions: number[][] = nodes.filter((n) => n[2] & 1);
    const jGrid = new Map<string, number[][]>(); for (const j of junctions) { const k = this.key(j[0], j[1]); (jGrid.get(k) ?? jGrid.set(k, []).get(k)!).push(j); }
    const nearJunction = (x: number, z: number, r: number) => { const cx = Math.floor(x / 40), cz = Math.floor(z / 40); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const n of jGrid.get(`${cx + i},${cz + j}`) ?? []) if (Math.hypot(n[0] - x, n[1] - z) < r) return true; return false; };
    this.data.roads.forEach((r, ri) => {
      const rs = this.resample(r.pts); const hw = r.w / 2; const gk: 'gravel' | 'walk' | 'asphalt' = r.surface === 'gravel' || r.surface === 'unpaved' || r.surface === 'dirt' ? 'gravel' : r.lanes === 0 ? 'walk' : 'asphalt';
      const yoff = r.lanes === 0 ? 0.07 : 0.05; let dist = 0;
      for (let i = 0; i < rs.length - 1; i++) {
        const a = rs[i], b = rs[i + 1]; const sl = Math.hypot(b.x - a.x, b.z - a.z);
        const T = tileAt((a.x + b.x) / 2, (a.z + b.z) / 2); const g = T[gk], mark = T.mark, walk = T.walk, bank = T.bank;
        const al = [a.x - a.tz * -hw, a.z + a.tx * -hw], ar = [a.x - a.tz * hw, a.z + a.tx * hw], bl = [b.x - b.tz * -hw, b.z + b.tx * -hw], br = [b.x - b.tz * hw, b.z + b.tx * hw];
        const y = (p: number[]) => this.height(p[0], p[1]) + yoff;
        g.quad([al[0], y(al), al[1]], [ar[0], y(ar), ar[1]], [br[0], y(br), br[1]], [bl[0], y(bl), bl[1]], conc, [0, dist / 4, r.w / 4, (dist + sl) / 4]);
        const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, tx = a.tx, tz = a.tz;
        const strip = (geo: Geo, o0: number, o1: number, yo: number, col: THREE.Color, curb = false) => {
          const p0 = [a.x - a.tz * o0, a.z + a.tx * o0], p1 = [a.x - a.tz * o1, a.z + a.tx * o1], q0 = [b.x - b.tz * o0, b.z + b.tx * o0], q1 = [b.x - b.tz * o1, b.z + b.tx * o1];
          const hy = (p: number[]) => this.height(p[0], p[1]) + yo;
          const lo = Math.min(o0, o1) === o0;
          if (lo) geo.quad([p0[0], hy(p0), p0[1]], [p1[0], hy(p1), p1[1]], [q1[0], hy(q1), q1[1]], [q0[0], hy(q0), q0[1]], col, [0, dist / 2, Math.abs(o1 - o0) / 2, (dist + sl) / 2]);
          else geo.quad([p1[0], hy(p1), p1[1]], [p0[0], hy(p0), p0[1]], [q0[0], hy(q0), q0[1]], [q1[0], hy(q1), q1[1]], col, [0, dist / 2, Math.abs(o1 - o0) / 2, (dist + sl) / 2]);
          if (curb) { // vertical faces on both long edges
            for (const [pp, qq, flip] of [[p0, q0, lo], [p1, q1, !lo]] as [number[], number[], boolean][]) {
              const t0 = [pp[0], hy(pp), pp[1]], t1 = [qq[0], hy(qq), qq[1]], b0 = [pp[0], hy(pp) - yo - 0.05, pp[1]], b1 = [qq[0], hy(qq) - yo - 0.05, qq[1]];
              if (flip) geo.quad(b0, b1, t1, t0, col); else geo.quad(b1, b0, t0, t1, col);
            }
          }
        };
        const rank = RANK[r.kind] ?? 0;
        // markings
        if (r.lanes >= 2 && rank >= 2 && !nearJunction(mx, mz, hw + 5)) {
          if (rank >= 3) { strip(mark, -0.22, -0.1, 0.06, yellow); strip(mark, 0.1, 0.22, 0.06, yellow); }
          else if (Math.floor(dist / 5) % 2 === 0) strip(mark, -0.07, 0.07, 0.06, yellow);
          if (r.lanes >= 4 && Math.floor(dist / 5) % 3 === 0) { strip(mark, hw / 2 - 0.06, hw / 2 + 0.06, 0.06, white); strip(mark, -hw / 2 - 0.06, -hw / 2 + 0.06, 0.06, white); }
        }
        // sidewalks (with boulevard strip between curb and walk) + winter snowbanks
        if (r.sidewalk) for (const side of [-1, 1]) {
          const so = side * (hw + 2.4), sxm = mx - tz * so, szm = mz + tx * so;
          if (!this.nearOtherRoad(sxm, szm, ri, 1.6)) strip(walk, side * (hw + 1.7), side * (hw + 3.2), 0.13, conc, true);
          if (!this.nearOtherRoad(mx - tz * side * (hw + 0.4), mz + tx * side * (hw + 0.4), ri, 0.6)) {
            strip(walk, side * hw, side * (hw + 0.18), 0.13, conc, true);   // curb
            // snowbank ridge on the boulevard
            const o0 = side * (hw + 0.2), o1 = side * (hw + 0.95), o2 = side * (hw + 1.7); const hb = 0.45 + 0.25 * Math.sin(dist * 0.37 + ri);
            const P = (o: number, yy: number, e: typeof a) => [e.x - e.tz * o, this.height(e.x - e.tz * o, e.z + e.tx * o) + yy, e.z + e.tx * o];
            if (side > 0) { bank.quad(P(o0, 0.1, a), P(o1, hb, a), P(o1, hb, b), P(o0, 0.1, b), snowC); bank.quad(P(o1, hb, a), P(o2, 0.12, a), P(o2, 0.12, b), P(o1, hb, b), snowC); }
            else { bank.quad(P(o1, hb, a), P(o0, 0.1, a), P(o0, 0.1, b), P(o1, hb, b), snowC); bank.quad(P(o2, 0.12, a), P(o1, hb, a), P(o1, hb, b), P(o2, 0.12, b), snowC); }
          }
        }
        dist += sl;
      }
    });
    // junction discs so crossing ribbons blend + stop signs / signals
    const disc = new THREE.CircleGeometry(1, 14); disc.rotateX(-Math.PI / 2);
    const m4 = new THREE.Matrix4();
    nodes.forEach((n, ni) => {
      const ctl = this.control.get(ni); if (!(n[2] & 1)) return;
      let maxW = 0; const seen = new Set<number>(); for (const [, ri] of this.adj[ni]) { if (!seen.has(ri)) { seen.add(ri); maxW = Math.max(maxW, this.data.roads[ri].w); } }
      const { asphalt, signs, mark } = tileAt(n[0], n[1]);
      if (maxW >= 7) { m4.makeScale(maxW * 0.56, 1, maxW * 0.56).setPosition(n[0], this.height(n[0], n[1]) + 0.055, n[1]); asphalt.merge(disc, m4, 0xffffff); }
      if (!ctl) return;
      // one post per approach that must stop / per approach at signals
      const done = new Set<string>();
      for (const [nb, ri] of this.adj[ni]) {
        if (ctl.type === 'stop' && !ctl.stopRoads.has(ri)) continue;
        const o = nodes[nb]; const l = Math.hypot(o[0] - n[0], o[1] - n[1]) || 1; const dx = (o[0] - n[0]) / l, dz = (o[1] - n[1]) / l;
        const k = `${Math.round(dx)}:${Math.round(dz)}`; if (done.has(k)) continue; done.add(k);
        const r = this.data.roads[ri]; let cross = 5; for (const [, r2] of this.adj[ni]) if (r2 !== ri) cross = Math.max(cross, this.data.roads[r2].w / 2 + 1.2);
        // right-hand side of the approaching lane (approach direction = -d)
        const px = n[0] + dx * (cross + 1.5) + dz * (r.w / 2 + 1.0), pz = n[1] + dz * (cross + 1.5) - dx * (r.w / 2 + 1.0); const py = this.height(px, pz);
        const yaw = Math.atan2(dx, dz);
        m4.makeRotationY(yaw).setPosition(px, py, pz); signs.setMatrix(m4);
        if (ctl.type === 'stop') {
          signs.box(0, 1.2, 0, 0.06, 2.4, 0.06, 0x8a8f94);
          const oct = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 8); oct.rotateX(Math.PI / 2); oct.rotateZ(Math.PI / 8); oct.translate(0, 2.3, 0.04);
          signs.merge(oct, null, 0xb3221f);
          signs.box(0, 2.3, 0.06, 0.42, 0.1, 0.012, 0xf4f4f4);
          // stop bar on the pavement
          signs.setMatrix(null);
          const bx = n[0] + dx * cross, bz = n[1] + dz * cross; const hwv = r.w / 4;
          const A = [bx + dz * 0.2, 0, bz - dx * 0.2], B = [bx + dz * (hwv * 2 - 0.2), 0, bz - dx * (hwv * 2 - 0.2)];
          const Y = (p: number[]) => this.height(p[0], p[2]) + 0.07;
          mark.quad([A[0], Y(A), A[2]], [A[0] + dx * 0.4, Y(A), A[2] + dz * 0.4], [B[0] + dx * 0.4, Y(B), B[2] + dz * 0.4], [B[0], Y(B), B[2]], white);
        } else {
          signs.box(0, 2.6, 0, 0.14, 5.2, 0.14, 0x30343a); signs.box(-1.6, 5.1, 0, 3.2, 0.1, 0.1, 0x30343a); signs.box(-2.9, 4.6, 0, 0.32, 0.95, 0.28, 0x1c1e22);
          signs.setMatrix(null);
          this.signalHeads.push({ node: ni, pos: new THREE.Vector3(px - Math.cos(yaw) * 2.9, py + 4.6, pz + Math.sin(yaw) * 2.9).add(new THREE.Vector3(dx * 0.16, 0, dz * 0.16)), ns: Math.abs(dz) > Math.abs(dx) });
        }
        signs.setMatrix(null);
      }
    });
    // street lamps
    this.data.roads.forEach((r, ri) => {
      const rank = RANK[r.kind] ?? 0; if (rank < 1) return; const rs = this.resample(r.pts, 6); let dist = 0, next = rank >= 2 ? 20 : 45, side = 1;
      for (let i = 0; i < rs.length - 1; i++) {
        dist += Math.hypot(rs[i + 1].x - rs[i].x, rs[i + 1].z - rs[i].z);
        if (dist < next) continue; next += rank >= 2 ? 46 : 90; side = -side; const a = rs[i];
        const o = side * (r.w / 2 + 0.9), x = a.x - a.tz * o, z = a.z + a.tx * o; if (this.nearOtherRoad(x, z, ri, 0.5)) continue;
        const y = this.height(x, z); m4.makeRotationY(Math.atan2(side * a.tz, -side * a.tx)).setPosition(x, y, z); const { lampGeo, headGeo } = tileAt(x, z);
        lampGeo.setMatrix(m4); lampGeo.box(0, 3.6, 0, 0.14, 7.2, 0.14, 0x4a4f55); lampGeo.box(0, 7.15, 0.8, 0.09, 0.09, 1.7, 0x4a4f55);
        headGeo.setMatrix(m4); headGeo.box(0, 7.08, 1.55, 0.3, 0.12, 0.6, 0xffffff);
        this.lampPositions.push(new THREE.Vector3(x - a.tz * -side * 1.5, y + 6.9, z + a.tx * -side * 1.5));
      }
    });
    for (const [k, t] of tiles) {
      const grp = new THREE.Group(); const [ti, tj] = k.split('_').map(Number);
      const add = (g: Geo, mat: THREE.Material, cast = false) => { if (!g.count) return null; const m = g.mesh(mat, cast); grp.add(m); return m; };
      add(t.asphalt, this.mats.asphalt); add(t.gravel, this.mats.gravel); add(t.walk, this.mats.concrete); add(t.mark, this.mats.marking);
      add(t.signs, this.mats.metal, true); add(t.lampGeo, this.mats.metal, true); add(t.headGeo, this.mats.lamp);
      const bank = add(t.bank, this.mats.snow); if (bank) { bank.visible = false; this.snowbankMeshes.push(bank); }
      this.group.add(grp); this.roadTiles.push({ grp, x: (ti + 0.5) * TS, z: (tj + 0.5) * TS });
    }
    // signal lamps (emissive colour updated per frame)
    if (this.signalHeads.length) {
      const sg = new THREE.SphereGeometry(0.13, 8, 6);
      this.signalMesh = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.signalHeads.length);
      const d = new THREE.Object3D(); this.signalHeads.forEach((s, i) => { d.position.copy(s.pos); d.updateMatrix(); this.signalMesh!.setMatrixAt(i, d.matrix); this.signalMesh!.setColorAt(i, new THREE.Color(0xff0000)); });
      this.group.add(this.signalMesh);
    }
  }
  private signalHeads: { node: number; pos: THREE.Vector3; ns: boolean }[] = [];
  private signalMesh: THREE.InstancedMesh | null = null;
  private signalT = 0;
  /** is north–south traffic green? cycle: 12 s green, 3 s amber, each way */
  signalState(t = this.signalT): { nsGreen: boolean; amber: boolean } { const c = t % 30; return { nsGreen: c < 15, amber: (c % 15) > 12 }; }

  private buildWaterAndRails() {
    const g = new Geo();
    for (const a of this.data.areas) { if (a.kind !== 'water') continue; try { const tris = THREE.ShapeUtils.triangulateShape(a.pts.map((p) => new THREE.Vector2(p[0], p[1])), []); for (const t of tris) { const p = t.map((i) => [a.pts[i][0], this.waterY, a.pts[i][1]]); g.tri(p[0], p[2], p[1], 0xffffff); g.tri(p[0], p[1], p[2], 0xffffff); } } catch { /* skip */ } }
    if (g.count) { const m = g.mesh(this.mats.water, false); this.group.add(m); }
    const bed = new Geo(), rail = new Geo();
    for (const line of this.data.rails) { const rs = this.resample(line, 8); for (let i = 0; i < rs.length - 1; i++) { const a = rs[i], b = rs[i + 1]; const P = (e: typeof a, o: number, yo: number) => [e.x - e.tz * o, this.height(e.x, e.z) + yo, e.z + e.tx * o]; bed.quad(P(a, -1.8, 0.12), P(a, 1.8, 0.12), P(b, 1.8, 0.12), P(b, -1.8, 0.12), 0xffffff, [0, 0, 1, 2]); for (const o of [-0.72, 0.72]) rail.quad(P(a, o - 0.05, 0.26), P(a, o + 0.05, 0.26), P(b, o + 0.05, 0.26), P(b, o - 0.05, 0.26), 0x6a6460); } }
    if (bed.count) { const mb = bed.mesh(this.mats.gravel, false); this.group.add(mb); this.group.add(rail.mesh(this.mats.metal, false)); }
  }

  // ------------------------------------------------------------ trees
  private buildTreeGeos() {
    const lowQ = this.engine.quality === 'low';
    const mk = (type: number) => {
      const r = mulberry(100 + type); const trunk = new Geo(), crown = new Geo(); const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
      if (type === 2) { // spruce
        const t = new THREE.CylinderGeometry(0.08, 0.22, 2.2, lowQ ? 4 : 6); t.translate(0, 1.1, 0); trunk.merge(t, null, 0xffffff);
        for (let i = 0; i < 5; i++) { const c = new THREE.ConeGeometry(2.3 - i * 0.4, 2.6, lowQ ? 7 : 12); c.translate(0, 2.2 + i * 1.5, 0); crown.merge(c, null, new THREE.Color().setHSL(0.38, 0.3, 0.7 + r() * 0.3)); }
        return { trunk: trunk.build(), crown: crown.build() };
      }
      const H = type === 0 ? 6.2 : 4.6; // elm: tall vase; ash: rounder
      const t = new THREE.CylinderGeometry(0.2, 0.34, H, lowQ ? 5 : 7, 1, lowQ); t.translate(0, H / 2, 0); trunk.merge(t, null, 0xffffff);
      const nb = type === 0 ? 7 : 6;
      for (let i = 0; i < nb; i++) {
        const an = (i / nb) * 6.283 + r(), tilt = type === 0 ? 0.42 + r() * 0.2 : 0.7 + r() * 0.3, len = (type === 0 ? 6.5 : 4.8) * (0.8 + r() * 0.4);
        const dir = new THREE.Vector3(Math.sin(tilt) * Math.cos(an), Math.cos(tilt), Math.sin(tilt) * Math.sin(an));
        const b = new THREE.CylinderGeometry(0.05, 0.14, len, lowQ ? 3 : 5, 1, true); b.translate(0, len / 2, 0); q.setFromUnitVectors(up, dir); m.compose(new THREE.Vector3(0, H - 0.4 - r() * 1.2, 0), q, s); trunk.merge(b, m, 0xffffff);
        const end = dir.clone().multiplyScalar(len).add(new THREE.Vector3(0, H - 0.6, 0));
        // twigs
        for (let k = 0; k < (lowQ ? 0 : 2); k++) { const d2 = dir.clone().add(new THREE.Vector3(r() - 0.5, r() * 0.3, r() - 0.5).multiplyScalar(0.9)).normalize(); const tw = new THREE.CylinderGeometry(0.015, 0.05, 2.6, 3, 1, true); tw.translate(0, 1.3, 0); q.setFromUnitVectors(up, d2); m.compose(end.clone().multiplyScalar(0.72 + k * 0.2).setY(end.y * (0.8 + k * 0.15)), q, s); trunk.merge(tw, m, 0xffffff); }
        const blob = new THREE.SphereGeometry((type === 0 ? 2.5 : 2.3) * (0.8 + r() * 0.4), lowQ ? 7 : 12, lowQ ? 5 : 8); { const bp = blob.attributes.position; for (let q = 0; q < bp.count; q++) { const k = 1 + 0.12 * Math.sin(bp.getX(q) * 2.3 + i) * Math.cos(bp.getZ(q) * 2.1 + i * 2) + 0.06 * Math.sin(bp.getY(q) * 4.7); bp.setXYZ(q, bp.getX(q) * k, bp.getY(q) * k, bp.getZ(q) * k); } blob.computeVertexNormals(); } m.makeScale(1, 0.72, 1).setPosition(end.x, end.y + 0.4, end.z); crown.merge(blob, m, new THREE.Color().setHSL(0.3, 0.2, 0.72 + r() * 0.28));
      }
      const topBlob = new THREE.SphereGeometry(type === 0 ? 3.0 : 2.8, lowQ ? 8 : 14, lowQ ? 6 : 10); m.makeScale(1.15, 0.7, 1.15).setPosition(0, H + (type === 0 ? 5.2 : 3.4), 0); crown.merge(topBlob, m, 0xffffff);
      return { trunk: trunk.build(), crown: crown.build() };
    };
    this.treeGeos = [mk(0), mk(1), mk(2)];
  }

  // ------------------------------------------------------------ chunk streaming
  private inReserved(x: number, z: number) { return this.reserved.some((p) => pointInPoly(x, z, p)); }
  update(px: number, pz: number, dt: number) {
    const C = this.data.chunk, r = this.loadRadius, ci = Math.floor(px / C), cj = Math.floor(pz / C), n = Math.ceil(r / C);
    const want: [string, number][] = [];
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) { const k = `${ci + i}_${cj + j}`; if (!this.chunkSet.has(k)) continue; const cx = (ci + i + 0.5) * C, cz = (cj + j + 0.5) * C; const d = Math.hypot(cx - px, cz - pz); if (d < r + C * 0.5) want.push([k, d]); }
    want.sort((a, b) => a[1] - b[1]);
    for (const [k] of want) if (!this.chunks.has(k)) { this.chunks.set(k, { key: k, group: null, bodies: [], state: 'loading' }); this.fetchChunk(k); }
    for (const [k, c] of this.chunks) { const [a, b] = k.split('_').map(Number); const d = Math.hypot((a + 0.5) * C - px, (b + 0.5) * C - pz); if (d > r + C * 1.6 && c.state === 'ready') this.unload(c); }
    // build at most one fetched chunk per frame (nearest first)
    if (this.queue.length && !this.building) {
      this.queue.sort((a, b) => this.chunkDist(a, px, pz) - this.chunkDist(b, px, pz));
      const k = this.queue.shift()!; const c = this.chunks.get(k); if (c && c.data) this.buildChunk(c);
    }
    this.pendingChunks = [...this.chunks.values()].filter((c) => c.state === 'loading').length;
    const rr = this.loadRadius + 260; for (const t of this.roadTiles) t.grp.visible = Math.hypot(t.x - px, t.z - pz) < rr;
    // signals + lamps
    this.signalT += dt;
    if (this.signalMesh) { const st = this.signalState(); const col = new THREE.Color(); this.signalHeads.forEach((s, i) => { const green = s.ns === st.nsGreen; col.set(green ? (st.amber ? 0xffb020 : 0x20e060) : 0xff2a20); this.signalMesh!.setColorAt(i, col); }); this.signalMesh.instanceColor!.needsUpdate = true; }
    if (this.lampLights.length) {
      const night = this.mats.lamp.emissiveIntensity / 6; const near = this.lampPositions.map((p) => [p, (p.x - px) ** 2 + (p.z - pz) ** 2] as [THREE.Vector3, number]).filter((e) => e[1] < 3600).sort((a, b) => a[1] - b[1]);
      this.lampLights.forEach((l, i) => { if (near[i] && night > 0.05) { l.position.copy(near[i][0]); l.intensity = night * 55; } else l.intensity = 0; });
    }
  }
  private chunkDist(k: string, px: number, pz: number) { const [a, b] = k.split('_').map(Number); return Math.hypot((a + 0.5) * this.data.chunk - px, (b + 0.5) * this.data.chunk - pz); }
  private async fetchChunk(k: string) {
    try { const d = await (await fetch(`${import.meta.env.BASE_URL}world/c_${k}.json`)).json(); const c = this.chunks.get(k); if (c) { c.data = d; this.queue.push(k); } }
    catch (e) { console.warn('chunk failed', k, e); this.chunks.delete(k); }
  }
  private buildChunk(c: LoadedChunk) {
    const d = c.data as { b: BuildingData[]; t: number[][]; p: number[][] };
    const cg = new ChunkGeo(); const group = new THREE.Group();
    for (const b of d.b) {
      let cx = 0, cz = 0; for (const p of b.pts) { cx += p[0]; cz += p[1]; } cx /= b.pts.length; cz /= b.pts.length;
      if (this.inReserved(cx, cz)) continue;
      const nr = this.nearestRoad(cx, cz, true, 2); let dir: [number, number] = [0, -1];
      if (nr.seg) { const l = Math.hypot(nr.px - cx, nr.pz - cz) || 1; dir = [(nr.px - cx) / l, (nr.pz - cz) / l]; }
      const y = this.height(cx, cz);
      const o = buildBuilding(cg, b, y, dir, this.season, 0, (x, z) => { const n = this.nearestRoad(x, z, false, 1); return !!n.seg && this.data.roads[n.seg.ri].lanes > 0 && n.d < n.seg.hw + 0.3; });
      c.bodies.push(this.phys.staticBox(o.cx, y + o.h / 2, o.cz, o.hw, o.h / 2 + 0.5, o.hd, o.yaw).body);
    }
    // poles
    for (const p of d.p) { if (this.inReserved(p[0], p[1])) continue; const y = this.height(p[0], p[1]); const m = new THREE.Matrix4().makeRotationY(p[2]).setPosition(p[0], y, p[1]); cg.wood.setMatrix(m); cg.wood.box(0, 4.2, 0, 0.24, 8.4, 0.24, 0x6a5848); cg.wood.box(0, 7.8, 0, 2.2, 0.12, 0.12, 0x6a5848); cg.wood.setMatrix(null); }
    group.add(cg.toGroup(this.mats));
    // trees (instanced per species)
    const dummy = new THREE.Object3D(); const col = new THREE.Color(); const lowQ2 = this.engine.quality === 'low';
    for (let type = 0; type < 3; type++) {
      const list = d.t.filter((t) => t[3] === type && !this.inReserved(t[0], t[1])); if (!list.length) continue;
      const trunk = new THREE.InstancedMesh(this.treeGeos[type].trunk, this.mats.bark, list.length);
      const crown = new THREE.InstancedMesh(this.treeGeos[type].crown, type === 2 ? this.mats.needles : this.mats.leaves, list.length);
      list.forEach((t, i) => {
        const rr = mulberry(Math.round(t[0] * 31 + t[1] * 17)); dummy.position.set(t[0], this.height(t[0], t[1]) - 0.1, t[1]); dummy.rotation.y = rr() * 6.28; dummy.scale.setScalar(t[2]); dummy.updateMatrix();
        trunk.setMatrixAt(i, dummy.matrix); crown.setMatrixAt(i, dummy.matrix); col.setHSL(0, 0, 0.75 + rr() * 0.25); crown.setColorAt(i, col);
        c.bodies.push(this.phys.staticCylinder(t[0], dummy.position.y + 2, t[1], 2, 0.3 * t[2]));
      });
      trunk.castShadow = !lowQ2; crown.castShadow = true; crown.receiveShadow = true; trunk.computeBoundingSphere(); crown.computeBoundingSphere();
      group.add(trunk, crown);
    }
    c.group = group; c.state = 'ready'; c.data = undefined; this.group.add(group);
  }
  private unload(c: LoadedChunk) {
    if (c.group) { this.group.remove(c.group); c.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as any).isInstancedMesh) m.geometry.dispose(); if ((m as any).isInstancedMesh) (m as any).dispose(); }); }
    for (const b of c.bodies) this.phys.world.removeRigidBody(b);
    this.chunks.delete(c.key);
  }
  /** true once everything near (x,z) is built */
  ready() { return this.pendingChunks === 0 && this.queue.length === 0 && this.chunks.size > 0; }

  setSeason(s: Season) {
    if (s === this.season && this.chunks.size) { this.mats.setSeason(s); return; }
    this.season = s; this.mats.setSeason(s); this.drawSplat();
    for (const b of this.snowbankMeshes) b.visible = s === 'winter';
    this.engine.groundEnvColor.set(s === 'winter' ? 0xe8edf2 : s === 'autumn' ? 0x8a8450 : 0x6f8452);
    this.engine.fogColor.set(s === 'winter' ? 0xcfd8e4 : 0xa8b8cc);
    for (const c of [...this.chunks.values()]) if (c.state === 'ready') this.unload(c); // rebuilt with snow roofs
  }
}

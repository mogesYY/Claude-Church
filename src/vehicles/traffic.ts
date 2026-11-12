// Parked cars + AI traffic that follows the road graph, keeps right, and obeys stop signs and signals.
import * as THREE from 'three/webgpu';
import { Car, CarKind, SPECS } from './car';
import type { World } from '../world/world';
import type { Physics } from '../core/physics';
import { mulberry } from '../core/geo';

interface Ai { car: Car; from: number; to: number; road: number; s: number; len: number; v: number; wait: number; cleared: boolean; yaw: number; stuck: number }
const MODERN: CarKind[] = ['sedan', 'hatchback', 'suv', 'minivan', 'pickup', 'pickup', 'suv', 'sedan'];
const OLD: CarKind[] = ['oldsedan', 'oldwagon', 'oldsedan', 'pickup'];

export class Traffic {
  ai: Ai[] = []; parked: Car[] = [];
  maxAi = 8; maxParked = 8; era: 'modern' | 'old' = 'modern'; enabled = true; snow = false;
  private rnd = mulberry(99); private spawnT = 0; private parkT = 0;
  /** cars that must never be despawned (player's car, mission cars) */
  keep = new Set<Car>();

  constructor(private world: World, private phys: Physics, private scene: THREE.Object3D) {}

  private pickKind(): CarKind { const l = this.era === 'old' ? OLD : MODERN; return l[Math.floor(this.rnd() * l.length)]; }
  private pickColor(k: CarKind) { const c = SPECS[k].colors; return c[Math.floor(this.rnd() * c.length)]; }

  /** create a drivable (dynamic) car at a spot */
  spawnCar(kind: CarKind, color: number, x: number, z: number, yaw: number, keep = true): Car {
    const c = new Car(kind, color, this.phys, this.scene, this.snow, true); c.place(x, this.world.height(x, z), z, yaw); this.parked.push(c); if (keep) this.keep.add(c); return c;
  }
  clear(all = false) {
    for (const a of this.ai) a.car.dispose(this.scene); this.ai = [];
    this.parked = this.parked.filter((c) => { if (!all && this.keep.has(c)) return true; c.dispose(this.scene); this.keep.delete(c); return false; });
  }

  private laneOffset(road: number) { const r = this.world.data.roads[road]; return r.oneway ? 0 : Math.min(r.w / 4, 3.3); }

  private spawnAi(px: number, pz: number) {
    const nodes = this.world.data.nav.nodes; if (!nodes.length) return;
    for (let tries = 0; tries < 12; tries++) {
      const i = Math.floor(this.rnd() * nodes.length); const n = nodes[i]; const d = Math.hypot(n[0] - px, n[1] - pz);
      if (d < 110 || d > 300 || !this.world.adj[i].length) continue;
      const opts = this.world.adj[i].filter(([, r]) => this.world.data.roads[r].kind !== 'service'); if (!opts.length) continue;
      const [to, road] = opts[Math.floor(this.rnd() * opts.length)];
      const kind = this.pickKind(); const car = new Car(kind, this.pickColor(kind), this.phys, this.scene, this.snow, false); car.ai = true; car.parked = false;
      const len = Math.hypot(nodes[to][0] - n[0], nodes[to][1] - n[1]);
      const a: Ai = { car, from: i, to, road, s: 0, len, v: 6, wait: 0, cleared: false, yaw: Math.atan2(nodes[to][0] - n[0], nodes[to][1] - n[1]), stuck: 0 };
      this.ai.push(a); this.moveAi(a, 0); return;
    }
  }
  private moveAi(a: Ai, dt: number) {
    const nodes = this.world.data.nav.nodes; const A = nodes[a.from], B = nodes[a.to]; const t = a.len > 0 ? a.s / a.len : 0;
    const dx = (B[0] - A[0]) / (a.len || 1), dz = (B[1] - A[1]) / (a.len || 1); const off = this.laneOffset(a.road);
    // right-hand side of travel direction (heading h -> right = (-hz, hx))
    const x = A[0] + (B[0] - A[0]) * t - dz * off, z = A[1] + (B[1] - A[1]) * t + dx * off;
    const want = Math.atan2(dx, dz); let d = want - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 3.2 + (dt === 0 ? 1 : 0));
    const y = this.world.height(x, z) + 0.05; const q = { x: 0, y: Math.sin(a.yaw / 2), z: 0, w: Math.cos(a.yaw / 2) };
    a.car.body.setNextKinematicTranslation({ x, y, z }); a.car.body.setNextKinematicRotation(q);
    if (dt === 0) { a.car.body.setTranslation({ x, y, z }, true); a.car.body.setRotation(q, true); }
    a.car.speed = a.v;
  }

  update(dt: number, px: number, pz: number, obstacles: { x: number; z: number; r: number }[], night: number) {
    const W = this.world; const nodes = W.data.nav.nodes;
    // --- spawn / despawn AI
    this.spawnT -= dt;
    if (this.enabled && this.ai.length < this.maxAi && this.spawnT <= 0) { this.spawnT = 0.7; this.spawnAi(px, pz); }
    this.ai = this.ai.filter((a) => { const p = a.car.pos; const far = Math.hypot(p.x - px, p.z - pz) > 360 || a.stuck > 25 || !this.enabled; if (far) a.car.dispose(this.scene); return !far; });
    const sig = W.signalState();
    for (const a of this.ai) {
      const road = W.data.roads[a.road]; const rank = road.kind === 'primary' || road.kind === 'trunk' ? 13.5 : road.kind === 'secondary' ? 12 : road.kind === 'tertiary' ? 10.5 : 8.2;
      let target = rank * (this.snow ? 0.72 : 1);
      const remaining = a.len - a.s; const ctl = W.control.get(a.to); const stopAt = 7.5;
      if (ctl && !a.cleared) {
        let mustStop = false;
        if (ctl.type === 'stop') mustStop = ctl.stopRoads.has(a.road);
        else { const A = nodes[a.from], B = nodes[a.to]; const ns = Math.abs(B[1] - A[1]) > Math.abs(B[0] - A[0]); mustStop = ns !== sig.nsGreen || sig.amber; }
        if (mustStop) {
          const d = remaining - stopAt; if (d < 28) target = Math.min(target, Math.max(0, d) * 0.55);
          if (d < 0.8 && a.v < 0.4) { if (ctl.type === 'stop') { a.wait += dt; if (a.wait > 1.3) { a.cleared = true; a.wait = 0; } } }
        } else if (ctl.type === 'signal' && remaining < stopAt + 2) a.cleared = true;
      }
      if (remaining < 14) target = Math.min(target, 5.5); // slow for the turn
      // obstacles ahead (other cars, the player)
      const f = a.car.forward(); const p = a.car.pos; let blocked = false;
      const check = (ox: number, oz: number, r: number) => { const rx = ox - p.x, rz = oz - p.z; const fwd = rx * f.x + rz * f.z, lat = Math.abs(rx * f.z - rz * f.x); if (fwd > 1 && fwd < 7 + a.v * 1.1 + r && lat < 1.5 + r) { blocked = true; target = Math.min(target, Math.max(0, (fwd - 5.5 - r) * 0.8)); } };
      for (const o of obstacles) check(o.x, o.z, o.r);
      for (const b of this.ai) if (b !== a) check(b.car.pos.x, b.car.pos.z, 1.2);
      a.stuck = blocked && a.v < 0.2 ? a.stuck + dt : 0;
      a.v += THREE.MathUtils.clamp(target - a.v, -7 * dt, 2.4 * dt); a.v = Math.max(0, a.v);
      a.car.braking = target < a.v - 0.3;
      a.s += a.v * dt;
      if (a.s >= a.len) {
        const prev = a.from; a.from = a.to; let opts = W.adj[a.from].filter(([n]) => n !== prev); if (!opts.length) opts = W.adj[a.from];
        if (!opts.length) { a.stuck = 99; continue; }
        const A = nodes[prev], B = nodes[a.from]; const hx = B[0] - A[0], hz = B[1] - A[1]; const hl = Math.hypot(hx, hz) || 1;
        const scored = opts.map(([n, r]) => { const C = nodes[n]; const l = Math.hypot(C[0] - B[0], C[1] - B[1]) || 1; const straight = ((C[0] - B[0]) * hx + (C[1] - B[1]) * hz) / (l * hl); return { n, r, w: (straight > 0.7 ? 3 : 1) * (W.data.roads[r].kind === 'service' ? 0.05 : 1) }; });
        let pick = this.rnd() * scored.reduce((s2, e) => s2 + e.w, 0); let ch = scored[0]; for (const e of scored) { pick -= e.w; if (pick <= 0) { ch = e; break; } }
        a.to = ch.n; a.road = ch.r; a.s = 0; a.len = Math.hypot(nodes[a.to][0] - B[0], nodes[a.to][1] - B[1]); a.cleared = false; a.wait = 0;
      }
      this.moveAi(a, dt);
      a.car.update(dt, night);
    }
    // --- parked cars along residential streets near the player
    this.parkT -= dt;
    if (this.parkT <= 0) {
      this.parkT = 1.5;
      this.parked = this.parked.filter((c) => { if (this.keep.has(c) || c.occupied) return true; const far = Math.hypot(c.pos.x - px, c.pos.z - pz) > 230; if (far) c.dispose(this.scene); return !far; });
      const count = this.parked.filter((c) => !this.keep.has(c)).length;
      if (this.enabled && count < this.maxParked) {
        const roads = W.data.roads;
        for (let tries = 0; tries < 20; tries++) {
          const r = roads[Math.floor(this.rnd() * roads.length)]; if (r.kind !== 'residential' && r.kind !== 'tertiary') continue;
          const i = Math.floor(this.rnd() * (r.pts.length - 1)); const a = r.pts[i], b = r.pts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 40) continue;
          const t = 0.2 + this.rnd() * 0.6; const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len; const side = this.rnd() < 0.5 ? 1 : -1; const off = r.w / 2 - 1.25;
          const x = a[0] + (b[0] - a[0]) * t - dz * off * side, z = a[1] + (b[1] - a[1]) * t + dx * off * side; const d = Math.hypot(x - px, z - pz);
          if (d < 45 || d > 190) continue; if (this.parked.some((c) => Math.hypot(c.pos.x - x, c.pos.z - z) < 9)) continue;
          const kind = this.pickKind(); const car = new Car(kind, this.pickColor(kind), this.phys, this.scene, this.snow, true);
          car.place(x, W.height(x, z), z, Math.atan2(dx * side, dz * side)); this.parked.push(car); break;
        }
      }
    }
    for (const c of this.parked) c.update(dt, night);
  }
  /** physics-rate update: parked cars hold their brakes and suspension */
  fixedStep(dt: number) { for (const c of this.parked) if (!c.occupied) c.step(dt, 0, 0, true); }

  /** nearest enterable car */
  nearest(p: THREE.Vector3, max = 3.2): Car | null { let best: Car | null = null, bd = max; for (const c of this.parked) { const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z); if (d < bd) { bd = d; best = c; } } return best; }
}

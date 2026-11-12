// NPCs: generic, varied community members (nobody modelled on a real person), simple movers and sidewalk pedestrians.
import * as THREE from 'three/webgpu';
import { Human, HumanOpts, Outfit } from './human';
import { mulberry } from '../core/geo';
import type { World } from '../world/world';
import { handCrossMesh } from '../church/interior';

export type NpcKind = 'priest' | 'elder' | 'woman' | 'kid' | 'neighbour' | 'deacon' | 'man' | 'elderWoman';
const SKINS = [0x7a4a30, 0x6a3f28, 0x8a5a3a, 0x5a3420, 0x946442, 0x70452c];
const NEIGHBOUR_SKINS = [0xd9b08f, 0xc99a78, 0x8a5a3a, 0xe2bfa2, 0xb9865e, 0x6a3f28];

export function makeNpc(kind: NpcKind, seed: number, winter = false): Human {
  const r = mulberry(seed * 131 + 7); const skin = SKINS[Math.floor(r() * SKINS.length)];
  let o: HumanOpts;
  switch (kind) {
    case 'priest': o = { outfit: 'priest', turban: true, beard: r() < 0.5 ? 0x9a9a9a : 0x1a1410, hair: 'covered', height: 1.72 + r() * 0.08, build: 1.1, robeColor: [0x7f9a86, 0xf2efe6, 0x2a2a30][seed % 3], skin }; break;
    case 'deacon': o = { outfit: 'deacon', hair: 'short', height: 1.6 + r() * 0.22, build: 0.9, robeColor: 0xf4f1e8, skin }; break;
    case 'elder': o = { outfit: 'elder', hair: r() < 0.5 ? 'grey' : 'bald', beard: r() < 0.5 ? 0xa0a0a0 : null, height: 1.66 + r() * 0.1, build: 1.1, skin, pants: 0x2a2a2e }; break;
    case 'elderWoman': o = { outfit: 'woman', female: true, hair: 'covered', height: 1.52 + r() * 0.08, build: 1.1, skin }; break;
    case 'woman': o = { outfit: 'woman', female: true, hair: 'covered', height: 1.56 + r() * 0.12, build: 0.9 + r() * 0.2, skin }; break;
    case 'kid': o = { outfit: r() < 0.5 ? 'netela' : 'woman', female: r() < 0.5, hair: 'short', height: 1.05 + r() * 0.3, build: 0.85, headScale: 1.18, skin }; if (o.outfit === 'woman') o.hair = 'covered'; break;
    case 'man': o = { outfit: winter ? 'netelaPuffer' : 'netela', hair: r() < 0.3 ? 'afro' : 'short', beard: r() < 0.3 ? 0x1a1410 : null, moustache: r() < 0.4, height: 1.68 + r() * 0.16, build: 0.9 + r() * 0.25, skin }; break;
    default: o = { outfit: winter ? 'neighbour' : 'casual', hair: r() < 0.25 ? 'grey' : 'short', female: r() < 0.5, height: 1.6 + r() * 0.25, build: 0.9 + r() * 0.3, skin: NEIGHBOUR_SKINS[Math.floor(r() * NEIGHBOUR_SKINS.length)], toque: winter ? [0x8a1f24, 0x1f3a5a, 0x2a2a2c, 0x3a6a4a][seed % 4] : null, shirt: [0x3a5a7a, 0x7a3a34, 0x2a2f38, 0x5a6a3a, 0x8a6a2a][seed % 5] };
  }
  const h = new Human({ ...o, seed });
  if (kind === 'priest') h.hold('R', handCrossMesh(), [0, -0.1, 0.03], [Math.PI, 0, 0]);
  return h;
}

export class Npc {
  human: Human; pos = new THREE.Vector3(); yaw = 0; target: THREE.Vector3 | null = null; speed = 1.3; path: THREE.Vector3[] = []; idle = ''; visible = true;
  onArrive: (() => void) | null = null; fixedY: number | null = null; name = '';
  constructor(public kind: NpcKind, seed: number, winter = false) { this.human = makeNpc(kind, seed, winter); }
  place(p: THREE.Vector3, yaw = 0) { this.pos.copy(p); this.yaw = yaw; this.target = null; this.path = []; this.sync(); return this; }
  walkTo(...pts: THREE.Vector3[]) { this.path = pts.map((p) => p.clone()); this.target = this.path.shift() ?? null; return new Promise<void>((res) => { this.onArrive = res; }); }
  act(name: string, hold = true, dur = 1.6) { if (hold) this.idle = name; this.human.play(name, dur, hold); }
  private sync() { this.human.root.position.copy(this.pos); this.human.root.rotation.y = this.yaw; this.human.root.visible = this.visible; }
  update(dt: number, groundY?: (x: number, z: number) => number) {
    let sp = 0;
    if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.12) { this.pos.x = this.target.x; this.pos.z = this.target.z; this.pos.y = this.target.y; this.target = this.path.shift() ?? null; if (!this.target) { const f = this.onArrive; this.onArrive = null; f?.(); if (this.idle) this.human.play(this.idle, 1, true); } }
      else { const st = Math.min(d, this.speed * dt); this.pos.x += (dx / d) * st; this.pos.z += (dz / d) * st; this.pos.y += (this.target.y - this.pos.y) * Math.min(1, (st / d) * 1.0); const want = Math.atan2(-dx, -dz); let a = want - this.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); this.yaw += a * Math.min(1, dt * 8); sp = this.speed; if (this.human.action && this.human.action === this.idle) this.human.stop(); }
      if (groundY && this.fixedY === null) this.pos.y = groundY(this.pos.x, this.pos.z);
    }
    this.sync(); this.human.update(dt, sp, true);
  }
  face(p: THREE.Vector3) { this.yaw = Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z)); }
}

/** ambient pedestrians walking the sidewalks near the player */
export class Pedestrians {
  list: { npc: Npc; road: number; seg: number; t: number; dir: number; side: number }[] = []; max = 5; enabled = true; winter = false; private rnd = mulberry(321); private T = 0; private seed = 500;
  constructor(private world: World, private scene: THREE.Object3D) {}
  clear() { for (const p of this.list) { this.scene.remove(p.npc.human.root); p.npc.human.dispose(); } this.list = []; }
  update(dt: number, px: number, pz: number) {
    const W = this.world; this.T -= dt;
    this.list = this.list.filter((p) => { const far = Math.hypot(p.npc.pos.x - px, p.npc.pos.z - pz) > 150 || !this.enabled; if (far) { this.scene.remove(p.npc.human.root); p.npc.human.dispose(); } return !far; });
    if (this.enabled && this.T <= 0 && this.list.length < this.max) {
      this.T = 2;
      for (let k = 0; k < 15; k++) { const ri = Math.floor(this.rnd() * W.data.roads.length); const r = W.data.roads[ri]; if (!r.sidewalk) continue; const si = Math.floor(this.rnd() * (r.pts.length - 1)); const a = r.pts[si]; const d = Math.hypot(a[0] - px, a[1] - pz); if (d < 40 || d > 120) continue;
        const npc = new Npc('neighbour', this.seed++, this.winter); npc.speed = 1.15 + this.rnd() * 0.4; this.scene.add(npc.human.root); this.list.push({ npc, road: ri, seg: si, t: 0, dir: 1, side: this.rnd() < 0.5 ? 1 : -1 }); break; }
    }
    for (const p of this.list) {
      const r = W.data.roads[p.road]; const a = r.pts[p.seg], b = r.pts[p.seg + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; p.t += (p.npc.speed * dt * p.dir) / len;
      if (p.t > 1) { if (p.seg < r.pts.length - 2) { p.seg++; p.t = 0; } else { p.dir = -1; p.t = 1; } } else if (p.t < 0) { if (p.seg > 0) { p.seg--; p.t = 1; } else { p.dir = 1; p.t = 0; } }
      const A = r.pts[p.seg], B = r.pts[p.seg + 1]; const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1; const dx = (B[0] - A[0]) / L, dz = (B[1] - A[1]) / L; const off = (r.w / 2 + 2.45) * p.side;
      const x = A[0] + (B[0] - A[0]) * p.t - dz * off, z = A[1] + (B[1] - A[1]) * p.t + dx * off;
      p.npc.pos.set(x, W.height(x, z) + 0.14, z); p.npc.yaw = Math.atan2(-dx * p.dir, -dz * p.dir); p.npc.human.root.position.copy(p.npc.pos); p.npc.human.root.rotation.y = p.npc.yaw; p.npc.human.update(dt, p.npc.speed, true);
    }
  }
}

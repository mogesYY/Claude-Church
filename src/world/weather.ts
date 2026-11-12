// Weather + effects: snowfall, blizzard fog, breath vapour, incense smoke, fire, window light shafts.
import * as THREE from 'three/webgpu';
import { canvasTex, mulberry } from '../core/geo';
import type { Engine } from '../core/engine';

const dotTex = () => canvasTex(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); }, { repeat: false });
let DOT: THREE.Texture | null = null;

/** CPU billboard particles drawn as one InstancedMesh (works on WebGPU and WebGL2) */
export class Particles {
  mesh: THREE.InstancedMesh; private p: Float32Array; private v: Float32Array; private life: Float32Array; private max0: Float32Array; private size: Float32Array; private col: Float32Array; private next = 0;
  gravity = 0; drag = 0; grow = 0; private d = new THREE.Object3D(); private c = new THREE.Color();
  constructor(public max: number, opts: { additive?: boolean; color?: number; opacity?: number } = {}) {
    DOT ??= dotTex();
    const mat = new THREE.MeshBasicMaterial({ map: DOT, transparent: true, depthWrite: false, opacity: opts.opacity ?? 1, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending, color: opts.color ?? 0xffffff, fog: !opts.additive });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, max); this.mesh.frustumCulled = false; this.mesh.count = 0; this.mesh.renderOrder = 5;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.life = new Float32Array(max); this.max0 = new Float32Array(max); this.size = new Float32Array(max); this.col = new Float32Array(max * 3);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.c.set(0xffffff));
  }
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color = 0xffffff) {
    const i = this.next; this.next = (this.next + 1) % this.max; this.p.set([x, y, z], i * 3); this.v.set([vx, vy, vz], i * 3); this.life[i] = life; this.max0[i] = life; this.size[i] = size; this.c.set(color); this.col.set([this.c.r, this.c.g, this.c.b], i * 3);
  }
  update(dt: number, cam: THREE.Camera) {
    let n = 0; const d = this.d; const k = Math.max(0, 1 - this.drag * dt);
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue; this.life[i] -= dt; const j = i * 3; this.v[j + 1] += this.gravity * dt; this.v[j] *= k; this.v[j + 1] *= k; this.v[j + 2] *= k; this.p[j] += this.v[j] * dt; this.p[j + 1] += this.v[j + 1] * dt; this.p[j + 2] += this.v[j + 2] * dt;
      const t = Math.max(0, this.life[i] / this.max0[i]); const fade = Math.min(1, t * 3) * Math.min(1, (1 - t) * 8); const s = this.size[i] * (1 + this.grow * (1 - t));
      d.position.set(this.p[j], this.p[j + 1], this.p[j + 2]); d.quaternion.copy(cam.quaternion); d.scale.setScalar(s * (0.35 + 0.65 * fade)); d.updateMatrix(); this.mesh.setMatrixAt(n, d.matrix);
      this.mesh.setColorAt(n, this.c.setRGB(this.col[j] * fade, this.col[j + 1] * fade, this.col[j + 2] * fade)); n++;
    }
    this.mesh.count = n; this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export class Weather {
  snowfall = 0;         // 0..1 (light snow ~0.3, blizzard 1)
  wind = 0.2;           // 0..1
  tempC = 21;
  blizzard = 0;
  private snow: THREE.InstancedMesh; private sp: Float32Array; private sn: number; private d = new THREE.Object3D();
  smoke: Particles; fire: Particles; sparks: Particles; breath: Particles; water: Particles;
  private breathT = 0; private rnd = mulberry(5);
  smokeSources: { pos: THREE.Vector3; rate: number; acc: number }[] = [];
  fires: { pos: THREE.Vector3; size: number; light: THREE.PointLight }[] = [];
  private shafts: THREE.Mesh[] = [];

  constructor(private engine: Engine) {
    DOT ??= dotTex();
    const q = engine.quality; this.sn = q === 'ultra' ? 2600 : q === 'high' ? 1500 : 600;
    this.snow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: DOT, transparent: true, depthWrite: false, opacity: 0.9 }), this.sn); this.snow.frustumCulled = false; this.snow.count = 0; this.snow.renderOrder = 4;
    this.sp = new Float32Array(this.sn * 4); for (let i = 0; i < this.sn; i++) { this.sp[i * 4] = (this.rnd() - 0.5) * 50; this.sp[i * 4 + 1] = this.rnd() * 22; this.sp[i * 4 + 2] = (this.rnd() - 0.5) * 50; this.sp[i * 4 + 3] = this.rnd(); }
    this.smoke = new Particles(q === 'low' ? 120 : 320, { opacity: 0.22, color: 0xdfe4ee }); this.smoke.drag = 0.7; this.smoke.grow = 3.5;
    this.fire = new Particles(q === 'low' ? 150 : 420, { additive: true }); this.fire.grow = -0.6; this.fire.drag = 0.4;
    this.sparks = new Particles(160, { additive: true }); this.sparks.gravity = -1.2; this.sparks.drag = 0.3;
    this.breath = new Particles(40, { opacity: 0.25 }); this.breath.drag = 2; this.breath.grow = 3;
    this.water = new Particles(160, { opacity: 0.8, color: 0xcfe6ff }); this.water.gravity = -7;
    engine.scene.add(this.snow, this.smoke.mesh, this.fire.mesh, this.sparks.mesh, this.breath.mesh, this.water.mesh);
  }
  addFire(pos: THREE.Vector3, size = 1) { const light = new THREE.PointLight(0xff8a30, 0, 30 * size, 1.6); light.position.copy(pos).add(new THREE.Vector3(0, 1.2 * size, 0)); this.engine.scene.add(light); const f = { pos: pos.clone(), size, light }; this.fires.push(f); return f; }
  clearFires() { for (const f of this.fires) this.engine.scene.remove(f.light); this.fires = []; }
  /** additive light shafts through the church windows (rebuilt when the sun moves a lot) */
  setShafts(windows: { pos: THREE.Vector3; w: number; h: number }[], sunDir: THREE.Vector3, strength: number) {
    for (const s of this.shafts) { this.engine.scene.remove(s); s.geometry.dispose(); } this.shafts = [];
    if (strength <= 0.02 || sunDir.y < 0.06) return;
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.06 * strength, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const dir = sunDir.clone().multiplyScalar(-1);
    for (const w of windows) { const len = Math.min(7, (w.pos.y - 1.2) / Math.max(0.15, -dir.y)); const a = w.pos.clone(), b = w.pos.clone().addScaledVector(dir, len); const side = new THREE.Vector3(dir.z, 0, -dir.x).normalize().multiplyScalar(w.w / 2); const up = new THREE.Vector3(0, w.h / 2, 0);
      for (const [u, v] of [[side, up], [up, side]] as const) { const g = new THREE.BufferGeometry(); const P = [a.clone().add(u).add(v), a.clone().sub(u).sub(v), b.clone().sub(u).sub(v).multiplyScalar(1), b.clone().add(u).add(v)]; g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap((p) => [p.x, p.y, p.z]), 3)); g.setIndex([0, 1, 2, 0, 2, 3]); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 6; this.engine.scene.add(m); this.shafts.push(m); } }
  }
  sprinkle(pos: THREE.Vector3, dir: THREE.Vector3) { for (let i = 0; i < 26; i++) this.water.emit(pos.x, pos.y, pos.z, dir.x * 3 + (this.rnd() - 0.5) * 2, 2.5 + this.rnd() * 2, dir.z * 3 + (this.rnd() - 0.5) * 2, 1.1, 0.05); }

  update(dt: number, cam: THREE.Camera, time: number, head: THREE.Vector3 | null, interior: boolean) {
    // snowfall around the camera (wrapped volume)
    const n = Math.floor(this.sn * Math.min(1, this.snowfall)); const wx = (2 + this.wind * 16) * (0.6 + this.blizzard), fall = 1.6 + this.blizzard * 2.5; const d = this.d; const cp = cam.position; let k = 0;
    if (n > 0 && !interior) for (let i = 0; i < n; i++) {
      const j = i * 4; this.sp[j] += (wx + Math.sin(time * 1.3 + i) * 0.6) * dt; this.sp[j + 1] -= (fall + this.sp[j + 3]) * dt; this.sp[j + 2] += (Math.cos(time + i * 0.7) * 0.6 + this.wind * 3) * dt;
      if (this.sp[j + 1] < -3) this.sp[j + 1] += 22; if (this.sp[j] > 25) this.sp[j] -= 50; if (this.sp[j + 2] > 25) this.sp[j + 2] -= 50; if (this.sp[j + 2] < -25) this.sp[j + 2] += 50;
      d.position.set(cp.x + this.sp[j], cp.y - 5 + this.sp[j + 1], cp.z + this.sp[j + 2]); d.quaternion.copy(cam.quaternion); d.scale.setScalar(0.05 + this.sp[j + 3] * 0.06); d.updateMatrix(); this.snow.setMatrixAt(k++, d.matrix);
    }
    this.snow.count = k; this.snow.instanceMatrix.needsUpdate = true;
    // breath in the cold
    if (head && this.tempC < -3 && !interior) { this.breathT -= dt; if (this.breathT <= 0) { this.breathT = 2.6; for (let i = 0; i < 4; i++) this.breath.emit(head.x, head.y, head.z, (this.rnd() - 0.5) * 0.2 + this.wind, 0.15, (this.rnd() - 0.5) * 0.2, 1.4, 0.12); } }
    for (const s of this.smokeSources) { s.acc += s.rate * dt; while (s.acc > 1) { s.acc -= 1; this.smoke.emit(s.pos.x + (this.rnd() - 0.5) * 0.04, s.pos.y, s.pos.z + (this.rnd() - 0.5) * 0.04, (this.rnd() - 0.5) * 0.12, 0.28 + this.rnd() * 0.15, (this.rnd() - 0.5) * 0.12, 5.5, 0.16); } }
    for (const f of this.fires) { const s = f.size; for (let i = 0; i < Math.ceil(60 * s * dt); i++) { const a = this.rnd() * 6.28, r = this.rnd() * 0.5 * s; this.fire.emit(f.pos.x + Math.cos(a) * r, f.pos.y + this.rnd() * 0.5 * s, f.pos.z + Math.sin(a) * r, (this.rnd() - 0.5) * 0.5, (1.6 + this.rnd() * 2.2) * s, (this.rnd() - 0.5) * 0.5, 0.7 + this.rnd() * 0.6, 0.7 * s, this.rnd() < 0.5 ? 0xff7a18 : 0xffc040); } if (this.rnd() < dt * 14) this.sparks.emit(f.pos.x, f.pos.y + s, f.pos.z, (this.rnd() - 0.5) * 2, 3 + this.rnd() * 3, (this.rnd() - 0.5) * 2, 2.2, 0.06, 0xffb040); f.light.intensity = (130 + 50 * Math.sin(time * 13) * Math.sin(time * 7.7)) * s * s; }
    this.smoke.update(dt, cam); this.fire.update(dt, cam); this.sparks.update(dt, cam); this.breath.update(dt, cam); this.water.update(dt, cam);
  }
}

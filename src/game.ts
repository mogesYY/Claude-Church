// Top-level game object: owns all systems and the main loop.
import * as THREE from 'three/webgpu';
import { Engine } from './core/engine';
import { Input } from './core/input';
import { Physics } from './core/physics';
import { Player } from './char/player';
import { CameraRig } from './core/camera';
import { World } from './world/world';
import type { Season } from './world/materials';
import { Church } from './church/church';

export class Game {
  church!: Church;
  engine!: Engine; phys!: Physics; input!: Input; player!: Player; rig!: CameraRig; world!: World;
  ready = false;
  mode: 'foot' | 'car' | 'cutscene' | 'photo' | 'menu' = 'foot';
  time = 0;
  private jump = false;
  private last = performance.now();
  fps = 60;
  debugCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  updaters: ((dt: number) => void)[] = [];

  async boot() {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.engine = new Engine(canvas); await this.engine.init();
    this.phys = new Physics(); await this.phys.init();
    this.input = new Input(canvas);
    try { await Promise.race([Promise.all([document.fonts.load("700 54px 'Noto Sans Ethiopic'", 'መድኃኔ'), document.fonts.load("600 30px 'Noto Sans'")]), new Promise((r) => setTimeout(r, 4000))]); } catch { /* offline: system fonts */ }
    this.world = new World(this.engine, this.phys); await this.world.load();
    const cd = this.world.data.church;
    this.church = new Church(this.engine, this.phys);
    this.church.place(cd.x, this.world.height(cd.x, cd.z) + 0.02, cd.z, cd.yaw);
    this.world.reserved.push(this.church.lot());
    this.player = new Player(this.phys); this.engine.scene.add(this.player.group);
    this.rig = new CameraRig(this.engine.camera, this.phys);
    this.phys.onStep.push((dt) => { if (this.mode === 'foot') { this.player.step(dt, this.input.state, this.rig.yaw, this.jump); this.jump = false; } });
    await this.setup();
    this.engine.renderer.setAnimationLoop(() => this.frame());
    this.ready = true;
  }
  /** overridden / extended as systems come online */
  async setup() {
    const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    cap.position.y = 0.85; cap.castShadow = true; this.player.group.add(cap);
    const sp = this.church.toWorld(1.5, 0, -16); this.tp(sp.x, sp.z, this.church.faceYaw(0, 1));
    this.setSeason('summer'); this.engine.setDateTime(7, 12, 15); this.engine.clockPaused = true;
  }
  setSeason(s: Season) { this.world.setSeason(s); this.engine.applyTime(true); }
  tp(x: number, z: number, yaw?: number) { this.player.teleport(x, this.world.height(x, z) + 0.05, z, yaw); this.rig.snap(); }
  /** debug/capture camera: fixed position + look target (null to release) */
  cam(px?: number, py?: number, pz?: number, lx = 0, ly = 0, lz = 0) { this.debugCam = px === undefined ? null : { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) }; }

  /** capture camera in church-local coordinates */
  camLocal(px: number, py: number, pz: number, lx: number, ly: number, lz: number) { const a = this.church.toWorld(px, py, pz), b = this.church.toWorld(lx, ly, lz); this.cam(a.x, a.y, a.z, b.x, b.y, b.z); }

  frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - this.last) / 1000); this.last = now; this.time += dt;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    this.input.update(); if (this.input.take('jump')) this.jump = true;
    this.phys.update(dt); this.player.syncVisual(1);
    for (const u of this.updaters) u(dt);
    const inside = this.church.isInside(this.debugCam ? this.debugCam.pos : this.player.group.position);
    if (inside !== this.engine.interior) { this.engine.interior = inside; this.engine.applyTime(); }
    this.church.refs.setLights(1);
    this.church.update(dt, this.player.group.position, this.time);
    const focus = this.player.group.position;
    this.world.update(focus.x, focus.z, dt);
    if (this.debugCam) { this.engine.camera.position.copy(this.debugCam.pos); this.engine.camera.lookAt(this.debugCam.look); }
    else if (this.mode === 'foot') this.rig.updateFoot(dt, focus, this.input.state.lookX, this.input.state.lookY, this.input.wheel, this.engine.interior);
    this.input.wheel = 0;
    const night = 1 - THREE.MathUtils.smoothstep(this.engine.sunElevation, -0.08, 0.1);
    this.world.mats.setNight(night);
    this.engine.tick(dt); this.engine.render(this.debugCam ? this.debugCam.look : focus);
  }
}

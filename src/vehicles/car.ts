// Prairie vehicles: procedural bodies + Rapier raycast-suspension physics.
import * as THREE from 'three/webgpu';
import { Physics, RAPIER, groups, GROUP_CAR, GROUP_WORLD, GROUP_PLAYER } from '../core/physics';
import { Geo } from '../core/geo';

export type CarKind = 'pickup' | 'minivan' | 'sedan' | 'suv' | 'hatchback' | 'oldsedan' | 'oldwagon';
interface Spec { name: string; L: number; W: number; wheelbase: number; r: number; mass: number; power: number; profile: number[][]; glass: number[][]; colors: number[]; bed?: boolean; old?: boolean }
// profile: side silhouette [z, y] clockwise from rear-bottom (z forward). glass: side-window polygon [z, y].
export const SPECS: Record<CarKind, Spec> = {
  sedan: { name: '2004 sedan', L: 4.7, W: 1.78, wheelbase: 2.7, r: 0.32, mass: 1350, power: 5200, colors: [0x7d858c, 0x8a1f24, 0x2d3d52, 0xd8d8d2, 0x3a3a3c, 0x56664a],
    profile: [[-2.35, 0.38], [-2.35, 0.92], [-1.62, 1.0], [-1.0, 1.42], [0.28, 1.44], [1.02, 1.02], [2.1, 0.9], [2.35, 0.66], [2.35, 0.38]], glass: [[-0.98, 1.36], [0.24, 1.38], [0.88, 1.04], [-1.5, 1.04]] },
  hatchback: { name: 'hatchback', L: 4.05, W: 1.72, wheelbase: 2.5, r: 0.31, mass: 1150, power: 4600, colors: [0x2f5f8a, 0xb8b8b4, 0xa32a22, 0x2a2a2c, 0xd8c63a],
    profile: [[-2.02, 0.38], [-2.02, 0.95], [-1.72, 1.42], [0.3, 1.46], [1.0, 1.04], [1.85, 0.92], [2.02, 0.66], [2.02, 0.38]], glass: [[-1.6, 1.38], [0.26, 1.4], [0.86, 1.06], [-1.75, 1.06]] },
  suv: { name: 'SUV', L: 4.75, W: 1.9, wheelbase: 2.8, r: 0.37, mass: 1900, power: 7000, colors: [0x1f2a24, 0xe6e6e2, 0x3a3f48, 0x5a2a24, 0x9aa0a6],
    profile: [[-2.37, 0.45], [-2.37, 1.1], [-2.22, 1.72], [0.35, 1.76], [1.05, 1.22], [2.15, 1.08], [2.37, 0.8], [2.37, 0.45]], glass: [[-2.1, 1.66], [0.3, 1.68], [0.9, 1.24], [-2.2, 1.24]] },
  minivan: { name: 'minivan', L: 5.05, W: 1.95, wheelbase: 3.05, r: 0.34, mass: 1950, power: 6600, colors: [0x6a7078, 0xc9c9c4, 0x2a3a5a, 0x7a2a2a, 0x8f8a7a],
    profile: [[-2.52, 0.42], [-2.52, 1.1], [-2.4, 1.74], [0.75, 1.78], [1.55, 1.12], [2.3, 0.98], [2.52, 0.72], [2.52, 0.42]], glass: [[-2.25, 1.68], [0.7, 1.7], [1.38, 1.16], [-2.3, 1.16]] },
  pickup: { name: 'pickup truck', L: 5.6, W: 2.0, wheelbase: 3.5, r: 0.4, mass: 2300, power: 8600, bed: true, colors: [0xe8e8e4, 0x8a1a1a, 0x1c1c1e, 0x2f4a6a, 0x8a8f94],
    profile: [[-2.8, 0.52], [-2.8, 1.2], [-0.72, 1.2], [-0.6, 1.86], [0.72, 1.88], [1.32, 1.26], [2.5, 1.16], [2.8, 0.9], [2.8, 0.52]], glass: [[-0.5, 1.8], [0.68, 1.82], [1.16, 1.3], [-0.52, 1.3]] },
  oldsedan: { name: '1980s sedan', L: 5.0, W: 1.82, wheelbase: 2.85, r: 0.33, mass: 1500, power: 4800, old: true, colors: [0x6a4a2a, 0x8a8a6a, 0x3a5a7a, 0x7a2a22, 0xc8b88a],
    profile: [[-2.5, 0.4], [-2.5, 0.95], [-1.3, 0.98], [-0.95, 1.4], [0.35, 1.4], [0.85, 1.0], [2.5, 0.95], [2.5, 0.4]], glass: [[-0.9, 1.35], [0.3, 1.35], [0.72, 1.03], [-1.2, 1.03]] },
  oldwagon: { name: '1980s station wagon', L: 5.1, W: 1.84, wheelbase: 2.9, r: 0.33, mass: 1650, power: 5000, old: true, colors: [0x7a5a3a, 0xa89a6a, 0x4a5a4a, 0x8a3a2a],
    profile: [[-2.55, 0.4], [-2.55, 1.0], [-2.4, 1.42], [0.35, 1.42], [0.85, 1.0], [2.55, 0.95], [2.55, 0.4]], glass: [[-2.2, 1.37], [0.3, 1.37], [0.72, 1.04], [-2.3, 1.04]] },
};

const shared: { tire?: THREE.Material; hub?: THREE.Material; glass?: THREE.Material; dark?: THREE.Material; lampOff?: THREE.Material } = {};
function mats() {
  if (!shared.tire) {
    shared.tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.95 }); shared.hub = new THREE.MeshStandardMaterial({ color: 0xa8acb0, metalness: 0.8, roughness: 0.35 });
    shared.glass = new THREE.MeshStandardMaterial({ color: 0x10161c, roughness: 0.06, metalness: 0.7, transparent: true, opacity: 0.72 }); shared.dark = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.8 });
  }
  return shared as Required<typeof shared>;
}

export function buildCarMesh(kind: CarKind, color: number, snow = false) {
  const s = SPECS[kind]; const m = mats(); const root = new THREE.Group(); const hw = s.W / 2;
  const shape = new THREE.Shape(); s.profile.forEach((p, i) => (i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]))); shape.closePath();
  const ext = new THREE.ExtrudeGeometry(shape, { depth: s.W - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 4 });
  // shape is in (z,y); extrude along x: rotate so shape-x -> world z
  ext.translate(0, 0, -(s.W - 0.16) / 2); ext.rotateY(-Math.PI / 2);
  const paint = new THREE.MeshStandardMaterial({ color, roughness: s.old ? 0.5 : 0.3, metalness: 0.55, envMapIntensity: 1.2 });
  const body = new THREE.Mesh(ext, paint); body.castShadow = true; body.receiveShadow = true; root.add(body);
  const g = new Geo(), lightsF = new Geo(), lightsR = new Geo(), dark = new Geo();
  // side windows
  for (const sx of [-1, 1]) { const x = sx * (hw + 0.006); const P = s.glass.map((p) => [x, p[1], p[0]]); if (sx > 0) g.quad(P[3], P[2], P[1], P[0], 0xffffff); else g.quad(P[0], P[1], P[2], P[3], 0xffffff); const mid = (s.glass[0][0] + s.glass[1][0]) / 2 + 0.1; dark.box(sx * (hw + 0.01), (s.glass[0][1] + s.glass[3][1]) / 2, mid, 0.02, s.glass[0][1] - s.glass[3][1], 0.07, color); }
  // windshield + rear glass follow the silhouette around the cabin
  const gl = s.glass; const wsTop = [gl[1][0], gl[1][1] + 0.03], wsBot = [gl[2][0] + 0.1, gl[2][1] - 0.01]; const n = new THREE.Vector2(wsTop[1] - wsBot[1], wsBot[0] - wsTop[0]).normalize().multiplyScalar(-0.012);
  const wx = hw - 0.14;
  g.quad([wx, wsBot[1] - n.y, wsBot[0] - n.x], [wx, wsTop[1] - n.y, wsTop[0] - n.x], [-wx, wsTop[1] - n.y, wsTop[0] - n.x], [-wx, wsBot[1] - n.y, wsBot[0] - n.x], 0xffffff);
  const rTop = [gl[0][0] - 0.02, gl[0][1] + 0.03], rBot = [gl[3][0] - 0.06, gl[3][1]];
  if (!s.bed) g.quad([-wx, rBot[1], rBot[0] - 0.012], [-wx, rTop[1], rTop[0] - 0.012], [wx, rTop[1], rTop[0] - 0.012], [wx, rBot[1], rBot[0] - 0.012], 0xffffff);
  else g.quad([-wx, rBot[1], rTop[0] - 0.16], [-wx, rTop[1], rTop[0] - 0.14], [wx, rTop[1], rTop[0] - 0.14], [wx, rBot[1], rTop[0] - 0.16], 0xffffff);
  // lights, grille, bumpers, plates
  const fz = s.L / 2 + 0.075, fy = s.profile[s.profile.length - 2][1] + 0.08, ry = s.profile[1][1] - 0.12;
  for (const sx of [-1, 1]) { lightsF.box(sx * (hw - 0.3), fy, fz - 0.03, 0.36, 0.14, 0.05, 0xffffff); lightsR.box(sx * (hw - 0.26), ry, -fz + 0.03, 0.3, 0.16, 0.05, 0xffffff); }
  dark.box(0, fy - 0.02, fz - 0.02, s.W - 1.05, 0.2, 0.05, 0x121214); dark.box(0, 0.48, fz, s.W - 0.1, 0.16, 0.1, s.old ? 0xb8bcc0 : 0x222226); dark.box(0, 0.5, -fz, s.W - 0.1, 0.16, 0.1, s.old ? 0xb8bcc0 : 0x222226);
  dark.box(0, 0.5, -fz - 0.055, 0.34, 0.14, 0.01, 0xf2f2f2);
  dark.box(0, 0.34, 0, s.W - 0.24, 0.12, s.L - 0.5, 0x0e0e10); // underbody
  for (const sx of [-1, 1]) dark.box(sx * (hw + 0.07), gl[2][1] + 0.02, gl[2][0] + 0.02, 0.14, 0.09, 0.05, color); // mirrors
  if (s.bed) { dark.box(0, 1.16, -1.76, s.W - 0.3, 0.04, 1.95, 0x1a1a1c); }
  if (snow) { const sg = new Geo(); const top = Math.max(...s.profile.map((p) => p[1])); const zs = s.profile.filter((p) => p[1] > top - 0.1).map((p) => p[0]); sg.box(0, top + 0.1, (Math.min(...zs) + Math.max(...zs)) / 2, s.W - 0.3, 0.09, Math.max(...zs) - Math.min(...zs) - 0.1, 0xf4f7fb); const sm = sg.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); root.add(sm); }
  root.add(g.mesh(m.glass, false));
  const matF = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, emissive: 0xfff2cc, emissiveIntensity: 0, roughness: 0.2 }), matR = new THREE.MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff1a10, emissiveIntensity: 0.15, roughness: 0.3 });
  root.add(lightsF.mesh(matF, false), lightsR.mesh(matR, false), dark.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }), false));
  // wheels
  const wheels: THREE.Group[] = []; const tire = new THREE.CylinderGeometry(s.r, s.r, 0.22, 18); tire.rotateZ(Math.PI / 2); const hub = new THREE.CylinderGeometry(s.r * 0.58, s.r * 0.58, 0.235, 10); hub.rotateZ(Math.PI / 2);
  const wz = s.wheelbase / 2, wxo = hw - 0.13;
  for (const [x, z] of [[wxo, wz], [-wxo, wz], [wxo, -wz], [-wxo, -wz]]) { const wg = new THREE.Group(); const t = new THREE.Mesh(tire, m.tire); t.castShadow = true; wg.add(t, new THREE.Mesh(hub, m.hub)); wg.position.set(x, s.r, z); root.add(wg); wheels.push(wg); }
  // wipers
  const wipers: THREE.Group[] = []; for (const sx of [-0.45, 0.25]) { const wp = new THREE.Group(); const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.015), m.dark); arm.position.y = 0.25; wp.add(arm); wp.position.set(sx * hw, wsBot[1] + 0.02, wsBot[0] + 0.02); const tilt = Math.atan2(wsBot[0] - wsTop[0], wsTop[1] - wsBot[1]); wp.rotation.x = tilt; wp.userData.tilt = tilt; root.add(wp); wipers.push(wp); }
  return { root, wheels, wipers, matF, matR, paint, seat: new THREE.Vector3(hw * 0.42, 0.42, (gl[1][0] + gl[0][0]) / 2 + (s.bed ? 0.1 : 0.25)), spec: s };
}

export class Car {
  spec: Spec; mesh: THREE.Group; wheels: THREE.Group[]; wipers: THREE.Group[];
  body: RAPIER.RigidBody; vc: RAPIER.DynamicRayCastVehicleController | null = null;
  private matF: THREE.MeshStandardMaterial; private matR: THREE.MeshStandardMaterial; seat: THREE.Vector3;
  headlights = false; wipersOn = false; private wiperT = 0; private lamps: THREE.SpotLight[] = [];
  speed = 0; steer = 0; throttle = 0; braking = false; grip = 1; slip = 0;
  occupied = false; ai = false; parked = true; honk = 0;
  pos = new THREE.Vector3(); quat = new THREE.Quaternion();
  private wheelSpin = 0;

  constructor(public kind: CarKind, color: number, private phys: Physics, scene: THREE.Object3D, snow = false, dynamic = true) {
    const b = buildCarMesh(kind, color, snow); this.spec = b.spec; this.mesh = b.root; this.wheels = b.wheels; this.wipers = b.wipers; this.matF = b.matF; this.matR = b.matR; this.seat = b.seat;
    scene.add(this.mesh);
    const s = this.spec; const w = phys.world;
    const desc = (dynamic ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.kinematicPositionBased()).setTranslation(0, 5, 0).setCanSleep(true).setLinearDamping(0.05).setAngularDamping(0.6);
    this.body = w.createRigidBody(desc);
    const top = Math.max(...s.profile.map((p) => p[1]));
    w.createCollider(RAPIER.ColliderDesc.cuboid(s.W / 2, (top - 0.4) / 2 * 0.8, s.L / 2).setTranslation(0, 0.42 + (top - 0.4) * 0.4, 0).setMass(s.mass).setFriction(0.4).setRestitution(0.1).setCollisionGroups(groups(GROUP_CAR, GROUP_WORLD | GROUP_CAR | GROUP_PLAYER)), this.body);
    if (dynamic) {
      // keep the centre of mass low for stability
      this.body.setAdditionalMassProperties(s.mass * 0.6, { x: 0, y: 0.05, z: 0 }, { x: s.mass * 0.5, y: s.mass * 0.9, z: s.mass * 0.25 }, { x: 0, y: 0, z: 0, w: 1 }, true);
      const vc = w.createVehicleController(this.body); (vc as any).indexUpAxis = 1; (vc as any).setIndexForwardAxis = 2;
      const hw = s.W / 2 - 0.13, wz = s.wheelbase / 2, rest = 0.3;
      for (const [x, z] of [[hw, wz], [-hw, wz], [hw, -wz], [-hw, -wz]]) vc.addWheel({ x, y: s.r + rest * 0.55, z }, { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, rest, s.r);
      for (let i = 0; i < 4; i++) { vc.setWheelSuspensionStiffness(i, 26); vc.setWheelSuspensionCompression(i, 2.6); vc.setWheelSuspensionRelaxation(i, 3.4); vc.setWheelMaxSuspensionTravel(i, 0.28); vc.setWheelMaxSuspensionForce(i, s.mass * 14); vc.setWheelFrictionSlip(i, 2.2); vc.setWheelSideFrictionStiffness(i, 1); }
      this.vc = vc;
    }
  }

  place(x: number, y: number, z: number, yaw: number) {
    const q = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
    this.body.setTranslation({ x, y: y + 0.25, z }, true); this.body.setRotation(q, true); this.body.setLinvel({ x: 0, y: 0, z: 0 }, true); this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    if (this.body.isKinematic()) { this.body.setNextKinematicTranslation({ x, y: y, z }); this.body.setNextKinematicRotation(q); }
    this.sync();
  }
  get yaw() { const f = this.forward(); return Math.atan2(f.x, f.z); }
  forward(out = new THREE.Vector3()) { return out.set(0, 0, 1).applyQuaternion(this.quat); }

  /** fixed-step control. throttle -1..1, steer -1..1 (right positive) */
  step(dt: number, throttle: number, steer: number, brake: boolean) {
    const vc = this.vc; if (!vc) return;
    const s = this.spec; const v = this.speed; this.throttle = throttle;
    const maxSteer = 0.56 / (1 + Math.abs(v) * 0.17); const target = -steer * maxSteer;
    this.steer += (target - this.steer) * Math.min(1, dt * 7);
    let engine = 0, br = brake ? s.mass * 0.03 : 0;
    if (throttle > 0.02) { if (v < -0.6) br = s.mass * 0.03 * throttle; else engine = s.power * 1.5 * throttle * (1 - Math.min(1, Math.max(0, v) / 40)); }
    else if (throttle < -0.02) { if (v > 0.6) br = s.mass * 0.03 * -throttle; else engine = s.power * 0.6 * throttle * (1 - Math.min(1, Math.max(0, -v) / 9)); }
    else br = Math.max(br, s.mass * 0.0025);
    this.braking = br > s.mass * 0.01;
    const fr = 2.2 * this.grip;
    for (let i = 0; i < 4; i++) { vc.setWheelEngineForce(i, engine / 4); vc.setWheelBrake(i, i < 2 ? br : br * 0.7); vc.setWheelFrictionSlip(i, fr * (i >= 2 && brake ? 0.75 : 1)); vc.setWheelSideFrictionStiffness(i, 0.9 * Math.min(1, this.grip + 0.25)); }
    vc.setWheelSteering(0, this.steer); vc.setWheelSteering(1, this.steer);
    if (Math.abs(throttle) > 0.02 || brake || Math.abs(v) > 0.3) this.body.wakeUp();
    vc.updateVehicle(dt, undefined, groups(0xffff, GROUP_WORLD));
    this.speed = vc.currentVehicleSpeed();
    // gentle anti-roll: damp roll/pitch rates so SUVs do not tip on curbs
    const av = this.body.angvel(); this.body.setAngvel({ x: av.x * 0.97, y: av.y, z: av.z * 0.97 }, true);
    const lv = this.body.linvel(); const f = this.forward(); const side = lv.x * f.z - lv.z * f.x; this.slip = Math.abs(side);
  }

  sync() {
    const t = this.body.translation(), r = this.body.rotation(); this.pos.set(t.x, t.y, t.z); this.quat.set(r.x, r.y, r.z, r.w);
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat);
  }

  update(dt: number, night: number) {
    this.sync();
    const s = this.spec; this.wheelSpin += (this.speed / s.r) * dt;
    this.wheels.forEach((w, i) => { let y = s.r; if (this.vc) { const len = this.vc.wheelSuspensionLength(i) ?? 0.3; y = s.r + 0.3 * 0.55 - len; } w.position.y += (y - w.position.y) * 0.5; w.rotation.set(this.wheelSpin, i < 2 ? this.steer : 0, 0, 'YXZ'); });
    const on = this.headlights || (this.ai && night > 0.4);
    this.matF.emissiveIntensity = on ? 3.5 : 0; this.matR.emissiveIntensity = this.braking ? 3 : on ? 0.8 : 0.15;
    for (const l of this.lamps) l.intensity = on ? 160 : 0;
    this.wiperT += dt * (this.wipersOn ? 4.2 : 0);
    this.wipers.forEach((w) => { w.rotation.set(w.userData.tilt, 0, this.wipersOn ? -0.2 - (Math.sin(this.wiperT) * 0.5 + 0.5) * 1.25 : -1.45, 'XYZ'); });
    this.honk = Math.max(0, this.honk - dt);
  }
  /** real spotlights only for the car the player drives */
  enableLamps(on: boolean) {
    if (on && !this.lamps.length) for (const sx of [-1, 1]) { const l = new THREE.SpotLight(0xfff0d0, 0, 60, 0.5, 0.6, 1.4); l.position.set(sx * 0.6, 0.8, this.spec.L / 2); l.target.position.set(sx * 0.9, 0.0, this.spec.L / 2 + 14); this.mesh.add(l, l.target); this.lamps.push(l); }
    if (!on) { for (const l of this.lamps) { this.mesh.remove(l, l.target); l.dispose(); } this.lamps = []; }
  }
  dispose(scene: THREE.Object3D) { scene.remove(this.mesh); if (this.vc) this.phys.world.removeVehicleController(this.vc); this.phys.world.removeRigidBody(this.body); this.mesh.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); }
}

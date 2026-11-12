// On-foot kinematic character controller (Rapier) with GTA-style relative movement.
import * as THREE from 'three/webgpu';
import { Physics, RAPIER, groups, GROUP_PLAYER, GROUP_WORLD, GROUP_CAR } from '../core/physics';
import type { InputState } from '../core/input';

export class Player {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;            // facing
  grounded = true;
  speed = 0;          // horizontal speed (m/s)
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  ctrl: RAPIER.KinematicCharacterController;
  group = new THREE.Group();
  enabled = true;
  /** when set, movement speed is capped (e.g. inside the church we walk) */
  maxSpeedOverride = 0;
  readonly halfH = 0.55; readonly radius = 0.3;
  jumped = false;
  iceSlip = 0; // 0..1 slipperiness

  constructor(private phys: Physics) {
    const w = phys.world;
    this.body = w.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 2, 0));
    this.collider = w.createCollider(RAPIER.ColliderDesc.capsule(this.halfH, this.radius).setCollisionGroups(groups(GROUP_PLAYER, GROUP_WORLD | GROUP_CAR)), this.body);
    this.ctrl = w.createCharacterController(0.02);
    this.ctrl.enableAutostep(0.35, 0.2, true);
    this.ctrl.enableSnapToGround(0.35);
    this.ctrl.setMaxSlopeClimbAngle(50 * Math.PI / 180);
    this.ctrl.setMinSlopeSlideAngle(60 * Math.PI / 180);
    this.ctrl.setApplyImpulsesToDynamicBodies(false);
  }

  get feetOffset() { return this.halfH + this.radius; }

  teleport(x: number, y: number, z: number, yaw?: number) {
    this.pos.set(x, y, z); this.vel.set(0, 0, 0);
    this.body.setTranslation({ x, y: y + this.feetOffset, z }, true);
    this.body.setNextKinematicTranslation({ x, y: y + this.feetOffset, z });
    if (yaw !== undefined) this.yaw = yaw;
    this.group.position.copy(this.pos); this.group.rotation.y = this.yaw;
  }

  setCollides(on: boolean) {
    this.collider.setCollisionGroups(on ? groups(GROUP_PLAYER, GROUP_WORLD | GROUP_CAR) : groups(0, 0));
  }

  /** fixed-step update. camYaw is the orbit camera yaw so input is camera-relative. */
  step(dt: number, inp: InputState, camYaw: number, wantJump: boolean) {
    if (!this.enabled) return;
    const run = inp.sprint ? 6.2 : 2.6;
    const max = this.maxSpeedOverride > 0 ? Math.min(run, this.maxSpeedOverride) : run;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);     // camera forward on XZ
    const rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let wx = fx * inp.moveY + rx * inp.moveX, wz = fz * inp.moveY + rz * inp.moveX;
    const mag = Math.min(1, Math.hypot(wx, wz));
    const wl = Math.hypot(wx, wz); if (wl > 0.01) { wx /= wl; wz /= wl; }
    const tvx = wx * max * mag, tvz = wz * max * mag;
    const accel = (this.grounded ? 14 : 3) * (1 - this.iceSlip * 0.8);
    const k = Math.min(1, accel * dt);
    this.vel.x += (tvx - this.vel.x) * k; this.vel.z += (tvz - this.vel.z) * k;
    this.jumped = false;
    if (this.grounded) {
      this.vel.y = -1.5;
      if (wantJump) { this.vel.y = 4.6; this.jumped = true; }
    } else this.vel.y -= 14 * dt;
    const d = { x: this.vel.x * dt, y: this.vel.y * dt, z: this.vel.z * dt };
    this.ctrl.computeColliderMovement(this.collider, d, undefined, groups(GROUP_PLAYER, GROUP_WORLD | GROUP_CAR));
    const m = this.ctrl.computedMovement();
    this.grounded = this.ctrl.computedGrounded();
    const t = this.body.translation();
    const nx = t.x + m.x, ny = t.y + m.y, nz = t.z + m.z;
    this.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    this.pos.set(nx, ny - this.feetOffset, nz);
    this.speed = Math.hypot(m.x, m.z) / dt;
    if (mag > 0.05) {
      const target = Math.atan2(-wx, -wz);
      let dy = target - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      this.yaw += dy * Math.min(1, 10 * dt);
    }
    if (this.pos.y < -60) this.teleport(this.pos.x, 30, this.pos.z);
  }

  syncVisual(alpha = 1) {
    this.group.position.lerp(this.pos, alpha);
    this.group.rotation.y = this.yaw;
  }
}

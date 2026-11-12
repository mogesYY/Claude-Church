// Third-person orbit camera (on foot) and chase camera (driving) with collision.
import * as THREE from 'three/webgpu';
import type { Physics } from './physics';
import { groups, GROUP_WORLD } from './physics';

export class CameraRig {
  yaw = 0; pitch = 0.18; dist = 4.2; targetDist = 4.2;
  height = 1.55;
  minDist = 1.2; maxDist = 9;
  private cur = new THREE.Vector3();
  private look = new THREE.Vector3();
  shoulder = 0.35;
  /** when true the rig is not applied (cutscenes / photo mode) */
  locked = false;
  private inited = false;

  constructor(public camera: THREE.PerspectiveCamera, private phys: Physics) {}

  snap() { this.inited = false; }

  updateFoot(dt: number, target: THREE.Vector3, lookX: number, lookY: number, wheel: number, interior: boolean) {
    if (this.locked) return;
    this.yaw -= lookX; this.pitch = THREE.MathUtils.clamp(this.pitch + lookY, -0.5, 1.25);
    this.targetDist = THREE.MathUtils.clamp(this.targetDist + wheel * 0.5, this.minDist, this.maxDist);
    const want = interior ? Math.min(this.targetDist, 2.7) : this.targetDist;
    this.apply(dt, target, this.height, want, this.shoulder, 14);
  }

  updateCar(dt: number, target: THREE.Vector3, carYaw: number, speed: number, lookX: number, lookY: number, wheel: number) {
    if (this.locked) return;
    this.freeLook = Math.abs(lookX) + Math.abs(lookY) > 0.0005 ? 1.6 : Math.max(0, this.freeLook - dt);
    this.yaw -= lookX; this.pitch = THREE.MathUtils.clamp(this.pitch + lookY, -0.1, 1.1);
    this.carDist = THREE.MathUtils.clamp(this.carDist + wheel * 0.6, 4.5, 14);
    if (this.freeLook <= 0 && Math.abs(speed) > 1) {
      const back = speed < -1 ? carYaw + Math.PI : carYaw;
      let d = back - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yaw += d * Math.min(1, 2.5 * dt);
      this.pitch += (0.24 - this.pitch) * Math.min(1, 1.5 * dt);
    }
    this.apply(dt, target, 1.5, this.carDist + Math.min(2.5, Math.abs(speed) * 0.08), 0, 9);
  }
  private freeLook = 0; carDist = 7.5;

  private apply(dt: number, target: THREE.Vector3, h: number, want: number, shoulder: number, stiff: number) {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp); // from target to camera
    const pivot = new THREE.Vector3(target.x + Math.cos(this.yaw) * shoulder, target.y + h, target.z - Math.sin(this.yaw) * shoulder);
    let d = want;
    const hit = this.phys.raycast(pivot.x, pivot.y, pivot.z, dir.x, dir.y, dir.z, want + 0.3, groups(0xffff, GROUP_WORLD));
    if (hit >= 0) d = Math.max(0.5, hit - 0.25);
    this.dist += (d - this.dist) * Math.min(1, (d < this.dist ? 30 : 5) * dt);
    const pos = pivot.clone().addScaledVector(dir, this.dist);
    if (!this.inited) { this.cur.copy(pos); this.look.copy(pivot); this.inited = true; }
    const k = Math.min(1, stiff * 2 * dt);
    this.cur.lerp(pos, k); this.look.lerp(pivot, k);
    this.camera.position.copy(this.cur);
    this.camera.lookAt(this.look);
  }
}

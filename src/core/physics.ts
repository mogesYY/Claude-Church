import RAPIER from '@dimforge/rapier3d-compat';
export { RAPIER };

export const GROUP_WORLD = 0x0001, GROUP_PLAYER = 0x0002, GROUP_CAR = 0x0004, GROUP_SENSOR = 0x0008;
export const groups = (member: number, filter: number) => ((member & 0xffff) << 16) | (filter & 0xffff);

export class Physics {
  world!: RAPIER.World;
  private acc = 0;
  readonly step = 1 / 60;
  onStep: ((dt: number) => void)[] = [];

  async init() {
    await (RAPIER as any).init({});
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = this.step;
  }

  update(dt: number) {
    this.acc += Math.min(dt, 0.1);
    let n = 0;
    while (this.acc >= this.step && n < 4) {
      for (const f of this.onStep) f(this.step);
      this.world.step();
      this.acc -= this.step; n++;
    }
    if (n === 4) this.acc = 0;
  }

  staticTrimesh(verts: Float32Array, indices: Uint32Array, friction = 0.9) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const desc = RAPIER.ColliderDesc.trimesh(verts, indices).setFriction(friction).setCollisionGroups(groups(GROUP_WORLD, 0xffff));
    return this.world.createCollider(desc, body);
  }

  staticBox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, rotY = 0) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz).setRotation({ x: 0, y: Math.sin(rotY / 2), z: 0, w: Math.cos(rotY / 2) }));
    const col = this.world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setCollisionGroups(groups(GROUP_WORLD, 0xffff)), body);
    return { body, col };
  }

  staticCylinder(cx: number, cy: number, cz: number, halfH: number, r: number) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
    this.world.createCollider(RAPIER.ColliderDesc.cylinder(halfH, r).setCollisionGroups(groups(GROUP_WORLD, 0xffff)), body);
    return body;
  }

  /** returns hit distance or -1 */
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, filterGroups = groups(0xffff, GROUP_WORLD)): number {
    const ray = new RAPIER.Ray({ x: ox, y: oy, z: oz }, { x: dx, y: dy, z: dz });
    const hit = this.world.castRay(ray, max, true, undefined, filterGroups);
    return hit ? hit.timeOfImpact : -1;
  }
}

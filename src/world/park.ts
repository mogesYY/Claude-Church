// Dinsdale Park, by the Assiniboine River (49.851967, -99.942136): the gravel turnaround overlooking the water.
// This is where the community builds the Demera and where the Tabot is taken at Timket.
// The park lies about 2 km north of the church, outside the street map, so it is built as its own location.
import * as THREE from 'three/webgpu';
import { Geo, canvasTex, speckle } from '../core/geo';
import type { World } from './world';
import type { Physics } from '../core/physics';
import type { Season } from './materials';

export class Park {
  center = new THREE.Vector3(); y = 20; group = new THREE.Group();
  private grass: THREE.MeshStandardMaterial; private water: THREE.MeshStandardMaterial;
  readonly halfW = 120; readonly halfD = 80;
  constructor(private world: World, phys: Physics, scene: THREE.Object3D) {
    const cd = world.data.church; const cx = cd.x + 150, cz = cd.z - 1450; this.center.set(cx, this.y, cz);
    world.sets.push({ x: cx, z: cz, hw: this.halfW + 40, hd: this.halfD + 60, y: this.y });
    const tex = canvasTex(256, 256, (c, w, h) => speckle(c, w, h, [150, 190, 110], 40, 71, 0.6)); tex.repeat.set(60, 40);
    this.grass = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, color: 0xffffff });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(this.halfW * 2 + 80, this.halfD * 2 + 40), this.grass); ground.rotation.x = -Math.PI / 2; ground.position.set(cx, this.y, cz + 20); ground.receiveShadow = true; this.group.add(ground);
    phys.staticBox(cx, this.y - 1, cz + 20, this.halfW + 40, 1, this.halfD + 20);
    // the river to the north, a little below the bank
    this.water = new THREE.MeshStandardMaterial({ color: 0x2f6a8a, roughness: 0.08, metalness: 0.3 });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(520, 130), this.water); river.rotation.x = -Math.PI / 2; river.position.set(cx, this.y - 1.6, cz - this.halfD - 65); this.group.add(river);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(520, 120), this.grass); far.rotation.x = -Math.PI / 2; far.position.set(cx, this.y - 0.4, cz - this.halfD - 190); this.group.add(far);
    const g = new Geo(), gravel = new Geo();
    // the bank sloping down to the water
    g.quad([cx - 260, this.y - 1.7, cz - this.halfD - 12], [cx + 260, this.y - 1.7, cz - this.halfD - 12], [cx + 260, this.y, cz - this.halfD], [cx - 260, this.y, cz - this.halfD], 0x8a8f66);
    // gravel turnaround (a ring) and the lane coming in from the south
    const R0 = 9, R1 = 15, N = 40; for (let i = 0; i < N; i++) { const a = (i / N) * 6.283, b = ((i + 1) / N) * 6.283; const P = (r: number, t: number) => [cx + Math.cos(t) * r, this.y + 0.04, cz + Math.sin(t) * r]; gravel.quad(P(R0, a), P(R1, a), P(R1, b), P(R0, b), 0xffffff, [0, i, 1, i + 1]); }
    gravel.quad([cx - 3, this.y + 0.04, cz + 14], [cx - 3, this.y + 0.04, cz + this.halfD + 30], [cx + 3, this.y + 0.04, cz + this.halfD + 30], [cx + 3, this.y + 0.04, cz + 14], 0xffffff, [0, 0, 1, 12]);
    // a few picnic tables and a rail fence along the bank
    for (const [x, z] of [[-28, 10], [-34, 22], [30, 16]]) { g.box(cx + x, this.y + 0.74, cz + z, 1.9, 0.06, 0.8, 0x8a6a4a); g.box(cx + x, this.y + 0.42, cz + z - 0.65, 1.9, 0.05, 0.28, 0x8a6a4a); g.box(cx + x, this.y + 0.42, cz + z + 0.65, 1.9, 0.05, 0.28, 0x8a6a4a); for (const dx of [-0.75, 0.75]) g.box(cx + x + dx, this.y + 0.37, cz + z, 0.08, 0.74, 1.5, 0x6a5038); phys.staticBox(cx + x, this.y + 0.4, cz + z, 1, 0.4, 0.9); }
    for (let x = -90; x <= 90; x += 3) { if (Math.abs(x) < 8) continue; g.box(cx + x, this.y + 0.5, cz - this.halfD + 1.5, 0.12, 1.0, 0.12, 0x6a5038); g.box(cx + x + 1.5, this.y + 0.85, cz - this.halfD + 1.5, 3, 0.08, 0.06, 0x7a6048); }
    this.group.add(g.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })), gravel.mesh(world.mats.gravel, false));
    // walls so nobody walks off the edge of the location (the river bank and the far sides)
    phys.staticBox(cx, this.y + 2, cz - this.halfD - 2, this.halfW + 40, 3, 0.5); phys.staticBox(cx, this.y + 2, cz + this.halfD + 38, this.halfW + 40, 3, 0.5);
    phys.staticBox(cx - this.halfW - 38, this.y + 2, cz + 20, 0.5, 3, this.halfD + 20); phys.staticBox(cx + this.halfW + 38, this.y + 2, cz + 20, 0.5, 3, this.halfD + 20);
    scene.add(this.group);
    // riverside trees: elms and ash along the bank and around the lawn, spruce at the edges
    const t: number[][] = []; let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) { const x = (r() - 0.5) * 2 * (this.halfW + 20), z = (r() - 0.5) * 2 * this.halfD + 20; if (Math.hypot(x, z) < 34 || (Math.abs(x) < 9 && z > 0)) continue; const edge = Math.abs(x) > 70 || z > 60 || z < -55; if (!edge && r() < 0.6) continue; t.push([cx + x, cz + z, 1.0 + r() * 0.6, r() < 0.15 ? 2 : r() < 0.55 ? 0 : 1]); }
    world.addTrees(t);
  }
  /** park-local -> world (x east, z south; origin = centre of the turnaround) */
  P(x: number, z: number, dy = 0.05) { return new THREE.Vector3(this.center.x + x, this.y + dy, this.center.z + z); }
  setSeason(s: Season) { this.grass.color.set(s === 'winter' ? 0xf4f7fb : s === 'autumn' ? 0xd8c070 : s === 'spring' ? 0xc8d090 : 0xffffff); if (s === 'winter') this.grass.color.multiplyScalar(1.6); this.water.color.set(s === 'winter' ? 0xdfe8f0 : 0x2f6a8a); this.water.roughness = s === 'winter' ? 0.6 : 0.08; }
}

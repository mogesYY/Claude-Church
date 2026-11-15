// Church interior, following the reference photos: wood-panelled sanctuary screen with three curtained arches,
// yellow upper walls over white-grey board paneling, pews either side of a red aisle runner, patterned carpet.
// Tradition: Qene Mahlet (chanters) → Qiddist (the faithful) → Meqdes (sanctuary, behind the curtain; never entered or shown).
import * as THREE from 'three/webgpu';
import { Geo, canvasTex, speckle, mulberry, normalFrom } from '../core/geo';
import type { Engine } from '../core/engine';
import { CH, wall, trimOutline, type Church } from './church';
import { iconTexture, IconKind } from './icons';

export interface Candle { flame: THREE.Mesh; pos: THREE.Vector3; lit: boolean }
export interface InteriorRefs {
  colliders: number[][];
  spots: Record<string, THREE.Vector3>;
  candles: Candle[];
  candleLights: THREE.PointLight[];
  chandelier: THREE.PointLight;
  censer: THREE.Group; censerLit: boolean;
  camLed: THREE.Mesh; streamOn: boolean;
  shoes: THREE.Group;
  umbrellas: THREE.Group;
  keberos: THREE.Object3D[];
  standing: { men: THREE.Vector3[]; women: THREE.Vector3[]; chanters: THREE.Vector3[] };
  naveDoorWant: number;
  setCandles(n: number): void;
  setLights(level: number): void;
  update(dt: number, time: number): void;
}

const brassMat = () => new THREE.MeshStandardMaterial({ color: 0xc9a13a, metalness: 0.95, roughness: 0.28 });

export function keberoMesh(scale = 1): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#b3232a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ead9b8'; c.lineWidth = 5;
    for (let i = -4; i < 12; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32 + 64, h); c.stroke(); c.beginPath(); c.moveTo(i * 32 + 64, 0); c.lineTo(i * 32, h); c.stroke(); }
    c.fillStyle = '#ead9b8'; c.fillRect(0, 0, w, 8); c.fillRect(0, h - 8, w, 8);
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.3 * scale, 0.82 * scale, 20, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9c49a, roughness: 0.7 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(0.2 * scale, 20), skin); top.rotation.x = -Math.PI / 2; top.position.y = 0.41 * scale;
  const bot = new THREE.Mesh(new THREE.CircleGeometry(0.3 * scale, 20), skin); bot.rotation.x = Math.PI / 2; bot.position.y = -0.41 * scale;
  const rim1 = new THREE.Mesh(new THREE.TorusGeometry(0.205 * scale, 0.018 * scale, 6, 20), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.8 })); rim1.rotation.x = Math.PI / 2; rim1.position.y = 0.4 * scale;
  const rim2 = rim1.clone(); rim2.scale.setScalar(1.48); rim2.position.y = -0.4 * scale;
  for (const m of [body, top, bot, rim1, rim2]) { m.castShadow = true; g.add(m); }
  return g;
}
export function maqomiyaMesh(): THREE.Group {
  const g = new THREE.Group();
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x5a2f22, roughness: 0.6 })); staff.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.03), brassMat()); head.position.y = 1.5;
  const horn1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.03), brassMat()); horn1.position.set(-0.085, 1.535, 0); const horn2 = horn1.clone(); horn2.position.x = 0.085;
  g.add(staff, head, horn1, horn2); return g;
}
export function tsenatselMesh(): THREE.Group {
  const g = new THREE.Group(); const m = brassMat();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.12, 6), new THREE.MeshStandardMaterial({ color: 0x4a2f22 })); handle.position.y = 0.06;
  const u = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 14, Math.PI), m); u.position.y = 0.2;
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), m); leg.position.set(sx * 0.045, 0.155, 0); g.add(leg); }
  for (const y of [0.15, 0.19]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 4), m); bar.rotation.z = Math.PI / 2; bar.position.y = y; g.add(bar); for (const x of [-0.02, 0.015]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.003, 8), m); d.rotation.z = Math.PI / 2; d.position.set(x, y, 0); g.add(d); } }
  g.add(handle, u); return g;
}
export function handCrossMesh(): THREE.Group {
  const g = new THREE.Group(); const geo = new Geo(); const c = 0xd0a83a;
  geo.box(0, 0.11, 0, 0.022, 0.22, 0.012, c); geo.box(0, 0.25, 0, 0.13, 0.022, 0.012, c); geo.box(0, 0.25, 0, 0.022, 0.13, 0.012, c);
  const m = new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 0.25, 0); geo.setMatrix(m); geo.box(0, 0, 0, 0.075, 0.075, 0.01, c); geo.setMatrix(null);
  for (const [dx, dy] of [[0.065, 0], [-0.065, 0], [0, 0.065], [0, -0.065]]) geo.box(dx, 0.25 + dy, 0, dx ? 0.02 : 0.05, dx ? 0.05 : 0.02, 0.012, c);
  geo.box(0, 0.012, 0, 0.06, 0.024, 0.012, c);
  const mesh = geo.mesh(brassMat()); (mesh.material as THREE.MeshStandardMaterial).vertexColors = false; g.add(mesh); return g;
}
export function censerMesh(): THREE.Group {
  const g = new THREE.Group(); const m = brassMat();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 8, 0, 6.3, Math.PI * 0.45, Math.PI * 0.55), m); bowl.position.y = -0.62;
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 10, 1, true), m); lid.position.y = -0.53;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.03, 10), m); foot.position.y = -0.7;
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a1a, emissiveIntensity: 0 })); ember.position.y = -0.6; ember.name = 'ember';
  for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.6, 4), m); ch.position.set(Math.cos(a) * 0.035, -0.3, Math.sin(a) * 0.035); ch.rotation.z = Math.cos(a) * 0.11; ch.rotation.x = -Math.sin(a) * 0.11; g.add(ch); for (const y of [-0.2, -0.4]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), m); bell.position.set(Math.cos(a) * 0.03, y, Math.sin(a) * 0.03); g.add(bell); } }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 5, 10), m);
  g.add(bowl, lid, foot, ember, ring); return g;
}
export function umbrellaMesh(color = 0x8a1f3a, open = true): THREE.Group {
  const g = new THREE.Group(); const brass = brassMat();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.1, 6), new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.5 })); pole.position.y = 1.05; g.add(pole);
  const tex = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#' + new THREE.Color(color).getHexString(); c.fillRect(0, 0, w, h); c.fillStyle = '#e2b33c'; for (let i = 0; i < 16; i++) { const x = i * 16 + 8; c.fillRect(x - 1.5, 14, 3, 20); c.fillRect(x - 6, 20, 12, 3); c.beginPath(); c.arc(x, 48, 2.5, 0, 7); c.fill(); } c.fillRect(0, h - 6, w, 6); c.fillRect(0, 0, w, 3); });
  const r = open ? 0.62 : 0.09, hgt = open ? 0.3 : 0.8;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 16, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, side: THREE.DoubleSide })); canopy.position.y = 2.1 - hgt / 2 + 0.02; canopy.castShadow = true; g.add(canopy);
  if (open) { const fringe = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe2b33c, roughness: 0.6, side: THREE.DoubleSide })); fringe.position.y = 2.1 - hgt - 0.03; g.add(fringe); }
  const fin = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), brass); fin.position.y = 2.14; g.add(fin);
  const cr = handCrossMesh(); cr.scale.setScalar(0.45); cr.position.y = 2.15; g.add(cr);
  return g;
}

export function buildInterior(ch: Church, engine: Engine): InteriorRefs {
  const root = ch.interior; const { F, FL, HW, NZ0, T, TW, TZ0, PZ, WINGX } = CH; void TW;
  const xi = HW - T, zf = NZ0 + T, low = engine.quality === 'low';
  const M = THREE.MeshStandardMaterial;
  // ---------------------------------------------------------------- materials
  const panelTex = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [228, 228, 232], 5, 31); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.20)'; c.fillRect((i * w) / 6, 0, 1.5, h); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect((i * w) / 6 + 2, 0, 1.5, h); } });
  const creamTex = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [232, 226, 204], 5, 33); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect((i * w) / 6, 0, 1.5, h); } });
  const woodTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [190, 104, 44], 16, 37, 1.5); const r = mulberry(8); c.strokeStyle = 'rgba(90,36,8,0.26)'; for (let i = 0; i < 90; i++) { const x = r() * w; c.lineWidth = 0.6 + r() * 1.6; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 14 * (r() - 0.5), h * 0.3, x + 18 * (r() - 0.5), h * 0.7, x + 10 * (r() - 0.5), h); c.stroke(); } });
  const oakTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [196, 136, 66], 12, 61, 1.5); const r = mulberry(18); c.strokeStyle = 'rgba(110,62,20,0.22)'; for (let i = 0; i < 80; i++) { const y = r() * h; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 6 * (r() - 0.5), w * 0.7, y + 8 * (r() - 0.5), w, y + 5 * (r() - 0.5)); c.stroke(); } });
  const doorTex = canvasTex(128, 256, (c, w, h) => { speckle(c, w, h, [176, 112, 52], 12, 67, 1.5); const r = mulberry(28); c.strokeStyle = 'rgba(80,40,10,0.3)'; for (let i = 0; i < 26; i++) { c.lineWidth = 1 + r() * 2; c.beginPath(); const x = r() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 30 * (r() - 0.5), h * 0.3, x + 40 * (r() - 0.5), h * 0.7, x + 20 * (r() - 0.5), h); c.stroke(); } }, { repeat: false });
  const carpetTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [118, 34, 30], 10, 41, 0.5); const r = mulberry(12); for (let i = 0; i < 30; i++) { const x = r() * w, y = r() * h, R = 12 + r() * 24; for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { c.fillStyle = i % 3 ? 'rgba(196,170,104,0.9)' : 'rgba(170,140,80,0.9)'; c.beginPath(); c.arc(x + ox, y + oy, R, 0, 7); c.fill(); c.fillStyle = 'rgb(118,34,30)'; c.beginPath(); c.arc(x + ox, y + oy, R * 0.72, 0, 7); c.fill(); c.strokeStyle = '#c8aa68'; c.lineWidth = 2.5; c.beginPath(); c.arc(x + ox, y + oy, R * 0.42, 0, 7); c.stroke(); } } });
  const runnerTex = canvasTex(64, 64, (c, w, h) => speckle(c, w, h, [98, 18, 34], 12, 43, 0.4));
  const lobbyTex = canvasTex(64, 64, (c, w, h) => speckle(c, w, h, [86, 78, 68], 16, 47, 0.4));
  const curtainTex = canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 14; i++) g.addColorStop(i / 14, i % 2 ? '#d07a1c' : '#9a4c0e'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#f2d06a'; for (const [x, y] of [[70, 150], [186, 150]]) { for (let k = 0; k < 4; k++) { c.save(); c.translate(x, y); c.rotate(k * Math.PI / 2); c.beginPath(); c.moveTo(-5, -4); c.lineTo(0, -17); c.lineTo(5, -4); c.fill(); c.restore(); } c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); } }, { repeat: false });
  const brocade = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [58, 72, 50], 22, 51, 0.5); c.fillStyle = 'rgba(190,170,110,0.35)'; for (let y = 8; y < h; y += 16) for (let x = 8 + ((y / 16) % 2) * 8; x < w; x += 16) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } });
  const dotted = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#1e1a3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8a24a'; for (let y = 8; y < h; y += 16) for (let x = 8 + ((y / 16) % 2) * 8; x < w; x += 16) { c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); } });
  const lace = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(150,150,150,0.5)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(i * 8 + 4, 4, 3, 0, 7); c.stroke(); c.beginPath(); c.arc(i * 8 + 4, h - 4, 3, 0, 7); c.stroke(); } for (let y = 12; y < h - 8; y += 8) for (let x = 4; x < w; x += 8) { c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.stroke(); } });
  const bandTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e2c080'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a8742a'; c.lineWidth = 3; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#a8742a'; for (let k = 0; k < 4; k++) { c.save(); c.translate(w / 2, h / 2); c.rotate(k * Math.PI / 2); c.beginPath(); c.moveTo(-6, -5); c.lineTo(0, -22); c.lineTo(6, -5); c.fill(); c.restore(); } });
  const mats = {
    panel: new M({ map: panelTex, vertexColors: true, roughness: 0.6 }), cream: new M({ map: creamTex, vertexColors: true, roughness: 0.7 }), paint: new M({ vertexColors: true, roughness: 0.9 }),
    ceil: new M({ color: 0xf6f5f0, roughness: 0.95, emissive: 0xf2ecdc, emissiveIntensity: 0.3 }),
    wood: new M({ map: woodTex, vertexColors: true, roughness: 0.3 }), oak: new M({ map: oakTex, vertexColors: true, roughness: 0.4 }), door: new M({ map: doorTex, roughness: 0.4 }),
    carpet: new M({ map: carpetTex, roughness: 1 }), runner: new M({ map: runnerTex, roughness: 1 }), lobby: new M({ map: lobbyTex, roughness: 1 }),
    plain: new M({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), curtain: new M({ map: curtainTex, roughness: 0.36, metalness: 0.2, side: THREE.DoubleSide }),
    brocade: new M({ map: brocade, roughness: 0.6 }), dotted: new M({ map: dotted, roughness: 0.8 }), lace: new M({ map: lace, roughness: 0.9, side: THREE.DoubleSide }), band: new M({ map: bandTex, roughness: 0.5, side: THREE.DoubleSide }),
    brass: brassMat(), tv: new M({ color: 0x08080a, roughness: 0.15, metalness: 0.4 }), bulb: new M({ color: 0xfff2d0, emissive: 0xffd9a0, emissiveIntensity: 3 }),
    crystal: new M({ color: 0xffffff, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.7 }), flame: new M({ color: 0xffe6a0, emissive: 0xffa030, emissiveIntensity: 5 }), wax: new M({ color: 0xf2ead8, roughness: 0.6 }),
  };
  for (const [m, k] of [[mats.carpet, 2.5], [mats.wood, 1.4], [mats.oak, 1.6], [mats.panel, 2.2], [mats.cream, 2], [mats.runner, 2.5], [mats.lobby, 3]] as [THREE.MeshStandardMaterial, number][]) m.normalMap = normalFrom(m.map!, k);
  const G = { panel: new Geo(), cream: new Geo(), paint: new Geo(), ceil: new Geo(), wood: new Geo(), oak: new Geo(), plain: new Geo(), carpet: new Geo(), runner: new Geo(), lobby: new Geo(), band: new Geo(), brocade: new Geo(), dotted: new Geo(), lace: new Geo() };
  const { panel, cream, paint, ceil, wood, oak, plain, carpet, runner } = G;
  const yellow = new THREE.Color(0xeee486), white = new THREE.Color(0xf4f4f0), pw = new THREE.Color(0xe6e6ea), W = new THREE.Color(0xffffff), redFrame = 0x5a1a16;
  const colliders: number[][] = [];
  // ---------------------------------------------------------------- nave shell
  // Proportions (estimated from the photos, to be corrected with real measurements): 9.4 m wide, 11.5 m from the back doors to the screen,
  // walls 2.6 m to the ceiling edge, ceiling sloping up to a flat strip 3.25 m high down the middle.
  const capY = F + 1.5, ceilEdge = F + 2.6, ceilTop = F + 3.25, flat = 1.15;
  const sideWins = CH.WIN_Z.filter((z) => z < PZ);
  for (const sx of [-1, 1]) {
    wall(panel, sx * xi, zf, sx * xi, PZ, [-sx, 0], F, capY, sideWins.map((z) => ({ at: z, w: CH.WIN_W, y0: F + 1.0, y1: capY })), pw, 1);
    wall(paint, sx * xi, zf, sx * xi, PZ, [-sx, 0], capY, ceilEdge, sideWins.map((z) => ({ at: z, w: CH.WIN_W, y0: capY, y1: F + 2.0, peak: F + 2.4 })), yellow);
    plain.box(sx * (xi - 0.02), capY, (zf + PZ) / 2, 0.04, 0.06, PZ - zf, white); plain.box(sx * (xi - 0.02), F + 0.06, (zf + PZ) / 2, 0.04, 0.12, PZ - zf, white);
    for (const z of sideWins) { trimOutline(plain, (s, y) => [sx * (xi - 0.014), y, s], [[z - 0.4, F + 1.0], [z - 0.4, F + 2.0], [z, F + 2.4], [z + 0.4, F + 2.0], [z + 0.4, F + 1.0]], 0.11, white, true); plain.box(sx * (xi - 0.05), F + 0.97, z, 0.12, 0.05, 0.98, white); }
  }
  const slopeY = (x: number) => (Math.abs(x) <= flat ? ceilTop : ceilEdge + (ceilTop - ceilEdge) * (xi - Math.abs(x)) / (xi - flat));
  ceil.quad([-xi, ceilEdge, zf], [-flat, ceilTop, zf], [-flat, ceilTop, PZ], [-xi, ceilEdge, PZ], W); ceil.quad([-flat, ceilTop, zf], [flat, ceilTop, zf], [flat, ceilTop, PZ], [-flat, ceilTop, PZ], W); ceil.quad([flat, ceilTop, zf], [xi, ceilEdge, zf], [xi, ceilEdge, PZ], [flat, ceilTop, PZ], W);
  /** fills the gable above a wall whose top is ceilEdge (facing n) */
  const gable = (g: Geo, z: number, nz: number, col: THREE.Color | number) => { const P = (x: number, y: number) => [x, y, z]; const q = (a: number[], b: number[], c2: number[], d: number[]) => (nz > 0 ? g.quad(a, b, c2, d, col) : g.quad(b, a, d, c2, col)); q(P(-xi, ceilEdge), P(-flat, ceilEdge), P(-flat, ceilTop), P(-xi, ceilEdge + 0.001)); q(P(-flat, ceilEdge), P(flat, ceilEdge), P(flat, ceilTop), P(-flat, ceilTop)); q(P(flat, ceilEdge), P(xi, ceilEdge), P(xi, ceilEdge + 0.001), P(flat, ceilTop)); };
  carpet.quad([-xi, F + 0.004, PZ], [xi, F + 0.004, PZ], [xi, F + 0.004, zf], [-xi, F + 0.004, zf], W, [0, 0, (2 * xi) / 2.4, (PZ - zf) / 2.4]);
  runner.quad([-0.75, F + 0.012, PZ - 1.6], [0.75, F + 0.012, PZ - 1.6], [0.75, F + 0.012, zf], [-0.75, F + 0.012, zf], W, [0, 0, 2, 14]);
  for (const z of [-3.6, -1.4, 0.9]) plain.box(1.05, F + 0.014, z, 0.16, 0.006, 0.4, 0xe8e4da);                       // floor vents
  // ---------------------------------------------------------------- back wall: double doors, icon grids, Last Supper, TV, camera shelf, clock, St Mary, corner door
  const dH = { at: 0, w: 1.7, y0: F, y1: F + 2.05 };
  wall(panel, -xi, zf, xi, zf, [0, 1], F, capY, [{ ...dH, y1: capY }], pw); wall(paint, -xi, zf, xi, zf, [0, 1], capY, ceilEdge, [{ ...dH, y0: capY }], yellow); gable(paint, zf, 1, yellow);
  for (const sx of [-1, 1]) plain.box(sx * (0.99 + xi) / 2, capY, zf + 0.02, xi - 0.99, 0.06, 0.04, white);
  trimOutline(plain, (s, y) => [s, y, zf + 0.014], [[-0.92, F], [-0.92, F + 2.12], [0.92, F + 2.12], [0.92, F]], 0.14, redFrame);
  for (const sx of [-1, 1]) plain.quad([sx * 0.85, F, NZ0 - 0.02], [sx * 0.85, F, zf + 0.02], [sx * 0.85, F + 2.05, zf + 0.02], [sx * 0.85, F + 2.05, NZ0 - 0.02], redFrame);
  plain.quad([-0.85, F + 2.05, NZ0], [0.85, F + 2.05, NZ0], [0.85, F + 2.05, zf], [-0.85, F + 2.05, zf], redFrame);
  const iconPlane = (kind: IconKind, x: number, y: number, z: number, w: number, rotY: number, hOver?: number, frameCol = 0x2a1a10) => {
    const h = hOver ?? w * 1.406; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new M({ map: iconTexture(kind), roughness: 0.45 })); m.position.set(x, y, z); m.rotation.y = rotY; root.add(m);
    const fm = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z); plain.setMatrix(fm); plain.box(0, 0, -0.012, w + 0.05, h + 0.05, 0.016, frameCol); plain.setMatrix(null);
  };
  const zb = zf + 0.03;
  const gridA: IconKind[] = ['michael', 'medhaneAlem', 'crucifixion', 'gabriel', 'george', 'grace', 'mary', 'medhaneAlem'];
  gridA.forEach((k, i) => iconPlane(k, -4.25 + (i % 4) * 0.5, F + 2.32 - Math.floor(i / 4) * 0.62, zb, 0.46, 0, 0.58));     // two rows of four, far left
  (['gabriel', 'medhaneAlem', 'michael', 'trinity'] as IconKind[]).forEach((k, i) => iconPlane(k, -2.2 + i * 0.42, F + 1.74, zb, 0.39, 0, 0.5));
  iconPlane('supper', -1.6, F + 2.5, zb, 1.25, 0, 0.8, 0x6a1a1a);
  { const tv = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.5), mats.tv); tv.position.set(0.25, F + 2.52, zb + 0.03); root.add(tv); plain.box(0.25, F + 2.52, zb + 0.01, 0.92, 0.56, 0.04, 0x141416); }
  plain.box(0.25, F + 2.14, zb + 0.09, 0.62, 0.03, 0.2, 0x6a4a2e); plain.box(0.3, F + 2.2, zb + 0.1, 0.13, 0.1, 0.14, 0xe8e8e4); plain.box(0.3, F + 2.2, zb + 0.18, 0.07, 0.06, 0.03, 0x0a0a0c);     // stream camera on its shelf above the doors
  const clockAt = (x: number, y: number, z: number, ry: number) => { const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 20), new M({ color: 0xf6f6f2, roughness: 0.4 })); cl.rotation.x = Math.PI / 2; cl.position.set(x, y, z); root.add(cl); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 20), new M({ color: 0x8a8a8a })); rim.position.set(x, y, z); rim.rotation.y = ry; root.add(rim); };
  clockAt(1.25, F + 2.12, zb + 0.02, 0);
  { const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14), new M({ color: 0xb3221f, roughness: 0.4 })); bell.rotation.x = Math.PI / 2; bell.position.set(1.7, F + 2.5, zb + 0.03); root.add(bell); }
  iconPlane('gethsemane', 3.0, F + 2.5, zb, 0.52, 0, 0.7, 0x6a3a2a); iconPlane('mary', 2.45, F + 1.5, zb, 0.72, 0, 0.98, 0xe8e0c8);
  plain.box(4.05, F + 1.05, zf + 0.02, 0.98, 2.14, 0.05, redFrame); { const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 2.02), mats.door); d1.position.set(4.05, F + 1.02, zf + 0.05); root.add(d1); } plain.box(3.72, F + 1.0, zf + 0.07, 0.05, 0.05, 0.05, 0xc9a13a);
  // the double doors swing into the nave
  const naveDoors: THREE.Group[] = [];
  for (const sx of [-1, 1]) { const dg = new THREE.Group(); dg.position.set(sx * 0.85, F, NZ0 + 0.1); const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.05, 0.045), mats.door); leaf.position.set(-sx * 0.425, 1.025, 0); dg.add(leaf);
    const cr = new Geo(); for (const zz of [-0.03, 0.03]) { cr.box(-sx * 0.425, 1.62, zz, 0.035, 0.26, 0.006, 0x101010); cr.box(-sx * 0.425, 1.66, zz, 0.2, 0.035, 0.006, 0x101010); for (const [dx, dy] of [[0.1, 1.66], [-0.1, 1.66], [0, 1.76], [0, 1.5]]) cr.box(-sx * 0.425 + dx, dy, zz, 0.06, 0.06, 0.006, 0x101010); cr.box(-sx * 0.425, 1.3, zz, 0.2, 0.26, 0.004, 0xf4f4f0); cr.box(-sx * 0.1, 1.05, zz, 0.02, 0.14, 0.03, 0xc9a13a); }
    dg.add(cr.mesh(new M({ vertexColors: true, roughness: 0.6 }), false)); (dg.userData as any).sx = sx; root.add(dg); naveDoors.push(dg); }
  // ---------------------------------------------------------------- side walls: icons between the windows (photo-left wall = local +x)
  const gaps = sideWins.slice(0, -1).map((z, i) => (z + sideWins[i + 1]) / 2);
  const sideL: IconKind[] = ['george', 'mary', 'gabriel', 'michael'], sideR: IconKind[] = ['michael', 'grace', 'george', 'mary'];
  gaps.forEach((z, i) => { iconPlane(sideL[i], xi - 0.03, F + 1.8, z, 0.62, -Math.PI / 2, 0.86, i === 0 ? 0x1a1a1a : 0xe8e0c8); iconPlane(sideR[i], -(xi - 0.03), F + 1.8, z, 0.62, Math.PI / 2, 0.86, 0xe8e0c8); });
  // ---------------------------------------------------------------- the sanctuary screen and the stage (measured off the wide stage photo)
  const wc = new THREE.Color(0xffffff); const DX = -4.1;                                    // the doorway in the screen wall, right of the stage
  wall(wood, -xi, PZ, xi, PZ, [0, -1], F, ceilEdge, [{ at: DX, w: 0.8, y0: F, y1: F + 1.95 }], wc, 1.8); gable(wood, PZ, -1, wc);
  trimOutline(plain, (s2, y) => [s2, y, PZ - 0.015], [[DX - 0.45, F], [DX - 0.45, F + 2.0], [DX + 0.45, F + 2.0], [DX + 0.45, F]], 0.1, redFrame);
  plain.box(DX, F + 0.975, PZ + 0.5, 0.8, 1.95, 0.02, 0x0b0707); for (const sx of [-1, 1]) plain.box(DX + sx * 0.4, F + 0.975, PZ + 0.25, 0.02, 1.95, 0.5, 0x241010); plain.box(DX, F + 1.95, PZ + 0.25, 0.8, 0.02, 0.5, 0x241010); plain.box(DX, F + 0.006, PZ + 0.25, 0.8, 0.012, 0.5, 0x3a1016);
  // the stage: a low carpeted platform with angled front corners and one step all the way round
  const platY = F + 0.36, stepY = F + 0.18; const stageG = new Geo();
  const prism = (pts: number[][], y0: number, y1: number) => { const n = pts.length; for (let i = 1; i < n - 1; i++) stageG.tri([pts[0][0], y1, pts[0][1]], [pts[i][0], y1, pts[i][1]], [pts[i + 1][0], y1, pts[i + 1][1]], W, [pts[0][0] / 2, pts[0][1] / 2, pts[i][0] / 2, pts[i][1] / 2, pts[i + 1][0] / 2, pts[i + 1][1] / 2]);
    for (let i = 0; i < n - 1; i++) { const p0 = pts[i], p1 = pts[i + 1], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); stageG.quad([p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], 0xb8a8a8, [0, 0, l / 2, (y1 - y0) / 2]);
      const dx = (p1[0] - p0[0]) / l, dz = (p1[1] - p0[1]) / l; const mm = new THREE.Matrix4().makeRotationY(Math.atan2(-dz, dx)).setPosition((p0[0] + p1[0]) / 2, y1 + 0.004, (p0[1] + p1[1]) / 2); plain.setMatrix(mm); plain.box(0, 0, 0, l, 0.012, 0.05, 0x2e0c14); plain.setMatrix(null); } };
  const up = [[2.85, PZ], [2.85, PZ - 0.8], [2.25, PZ - 1.4], [-2.5, PZ - 1.4], [-3.1, PZ - 0.8], [-3.1, PZ]], lo = [[3.2, PZ], [3.2, PZ - 0.95], [2.4, PZ - 1.75], [-2.65, PZ - 1.75], [-3.45, PZ - 0.95], [-3.45, PZ]];
  prism(lo, F, stepY); prism(up, stepY, platY);
  for (const [pts, top] of [[lo, stepY], [up, platY]] as [number[][], number][]) { const [x1, zc, xm] = [pts[0][0], pts[1][1], pts[2][0]], x0 = pts[5][0], xn = pts[3][0], zf2 = pts[2][1]; const h = top - F;
    colliders.push([(xm + xn) / 2, F + h / 2, (zf2 + PZ) / 2, xm - xn, h, PZ - zf2], [(x1 + x0) / 2, F + h / 2, (zc + PZ) / 2, x1 - x0, h, PZ - zc], [(x1 + x0) / 2 + (xm - x1 + xn - x0) / 4, F + h / 2, ((zc + zf2) / 2 + PZ) / 2, (x1 - x0 + xm - xn) / 2, h, PZ - (zc + zf2) / 2]); }
  { const sm = stageG.mesh(new M({ map: runnerTex, normalMap: mats.runner.normalMap, vertexColors: true, roughness: 1, side: THREE.DoubleSide }), false); sm.receiveShadow = true; root.add(sm); }
  // three carved arches: the centre one wider and taller
  const arches: [number, number, number][] = [[2.28, 1.15, 1.28], [0, 1.58, 1.5], [-2.47, 1.1, 1.3]];
  const curtains: THREE.Mesh[] = [];
  for (const [ax, aw, ah] of arches) {
    const r = aw / 2, pts: number[][] = [[ax - r, platY]]; for (let i = 0; i <= 14; i++) { const a2 = Math.PI - (i / 14) * Math.PI; pts.push([ax + Math.cos(a2) * r, platY + ah + Math.sin(a2) * r]); } pts.push([ax + r, platY]);
    for (let i = 0; i < pts.length - 1; i++) { const a2 = pts[i], b2 = pts[i + 1]; const dx = b2[0] - a2[0], dy = b2[1] - a2[1], l = Math.hypot(dx, dy); const n = Math.max(1, Math.round(l / 0.14)); const nx = (-dy / l) * 0.14, ny = (dx / l) * 0.14; G.band.quad([a2[0], a2[1], PZ - 0.03], [b2[0], b2[1], PZ - 0.03], [b2[0] + nx, b2[1] + ny, PZ - 0.03], [a2[0] + nx, a2[1] + ny, PZ - 0.03], W, [0, 0, n, 1]); }
    for (const sx of [-1, 1]) { wood.box(ax + sx * (r + 0.07), platY + ah, PZ - 0.06, 0.2, 0.09, 0.11, 0xe8c890); wood.box(ax + sx * (r + 0.07), platY + 0.05, PZ - 0.06, 0.2, 0.1, 0.11, 0xe8c890); }
    const cols = 30, rows2 = 10, pos: number[] = [], uvs: number[] = [], idx: number[] = [];
    for (let j = 0; j <= rows2; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows2, x = ax - r + u * aw; const top = platY + ah + Math.sqrt(Math.max(0, r * r - (x - ax) ** 2)); const y = platY + 0.02 + v * (top - platY - 0.02); pos.push(x, y, PZ - 0.09 - Math.sin(u * Math.PI * 11) * 0.035 * (0.5 + 0.5 * (1 - v))); uvs.push(u, v); }
    for (let j = 0; j < rows2; j++) for (let i = 0; i < cols; i++) { const a2 = j * (cols + 1) + i, b2 = a2 + 1, c2 = a2 + cols + 1, d2 = c2 + 1; idx.push(a2, c2, b2, b2, c2, d2); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); cg.setIndex(idx); cg.computeVertexNormals();
    const cm = new THREE.Mesh(cg, mats.curtain); cm.userData.base = Float32Array.from(pos); cm.userData.cols = cols; root.add(cm); curtains.push(cm);
    for (let i = 0; i < 10; i++) { const a0 = Math.PI * (0.9 - (i / 10) * 0.8), a1 = Math.PI * (0.9 - ((i + 1) / 10) * 0.8); const P = (a2: number, d: number) => [ax + Math.cos(a2) * (r - 0.02), platY + ah + Math.sin(a2) * (r - 0.02) - d, PZ - 0.14]; plain.quad(P(a0, 0), P(a1, 0), P(a1, 0.13 + 0.04 * (i % 2)), P(a0, 0.13 + 0.04 * ((i + 1) % 2)), 0xd9a81e); }
  }
  // pictures on the screen, positions measured from the photo (photo-left = local +x; heights are above the stage)
  const zs = PZ - 0.035, S = platY;
  iconPlane('medhaneAlem', 4.03, S + 1.95, zs, 0.6, Math.PI, 0.86, 0x1a1a1a);                 // Christ with the open book
  iconPlane('crucifixion', 3.37, S + 1.3, zs, 0.55, Math.PI, 0.72, 0x8a8a8a);                 // crucifixion
  iconPlane('thorns', 1.29, S + 2.25, zs, 0.78, Math.PI, 0.9, 0x1a1a1a);                     // Christ crowned with thorns
  iconPlane('mary', 1.29, S + 1.35, zs, 0.58, Math.PI, 0.82, 0xb8b8b8);                      // St Mary with the Child (blue)
  iconPlane('gabriel', 1.29, S + 0.6, zs, 0.56, Math.PI, 0.62, 0xb8b8b8);                    // angel picture behind the lace stand
  iconPlane('trinity', 0, S + 2.6, zs, 0.98, Math.PI, 0.7, 0x101010);                        // Holy Trinity above the centre arch
  iconPlane('mary', -1.34, S + 1.87, zs, 1.05, Math.PI, 1.72, 0x3a2a6a);                     // the tall St Mary banner
  iconPlane('medhaneAlem', -1.3, S + 0.56, zs - 0.03, 0.62, Math.PI, 0.9, 0xe8c890);        // portrait of Christ standing on the stage in its carved frame
  G.band.box(-1.3, S + 0.56, zs - 0.012, 0.86, 1.12, 0.02, W, 0.14);
  iconPlane('grace', -3.45, S + 1.4, zs, 0.7, Math.PI, 1.0, 0x1a1a1a);                       // St Mary in white
  iconPlane('michael', -3.45, S + 0.6, zs, 0.6, Math.PI, 0.56, 0x2a4a8a);                    // angel picture below it
  for (const sx of [-1, 1]) { const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.68), mats.tv); tv.position.set(sx * 2.97, S + 2.15, PZ - 0.07); tv.rotation.y = Math.PI; root.add(tv); plain.box(sx * 2.97, S + 2.15, PZ - 0.04, 1.28, 0.74, 0.05, 0x101012); }
  clockAt(2.1, S + 2.05, PZ - 0.04, 0); plain.box(-4.35, S + 2.0, PZ - 0.03, 0.34, 0.28, 0.02, 0xeeeeea); plain.box(-4.35, S + 2.0, PZ - 0.045, 0.02, 0.26, 0.01, 0x8a8a8a); plain.box(-4.35, S + 2.0, PZ - 0.045, 0.32, 0.02, 0.01, 0x8a8a8a);
  for (const sx of [-1, 1]) { plain.box(sx * (xi - 0.28), F + 2.3, PZ - 0.3, 0.34, 0.5, 0.3, 0x141416); plain.box(sx * (xi - 0.28), F + 2.03, PZ - 0.26, 0.38, 0.03, 0.36, 0xe8e8e4); }
  // black metal equipment shelf on the floor against the screen, left of the stage: mixer, amplifier, router
  { const ex = 4.12, ez = PZ - 0.42; for (const y of [0.3, 0.95, 1.5]) plain.box(ex, F + y, ez, 1.1, 0.03, 0.5, 0x151517); for (const [dx, dz] of [[-0.53, -0.23], [0.53, -0.23], [-0.53, 0.23], [0.53, 0.23]]) plain.box(ex + dx, F + 0.78, ez + dz, 0.035, 1.56, 0.035, 0x151517); plain.box(ex - 0.2, F + 1.0, ez, 0.5, 0.07, 0.36, 0x2a2a2e); plain.box(ex + 0.3, F + 1.06, ez, 0.4, 0.2, 0.3, 0x1e1e22); plain.box(ex - 0.1, F + 1.54, ez, 0.3, 0.05, 0.2, 0x0e0e10); for (let k = 0; k < 3; k++) plain.box(ex - 0.2 + k * 0.1, F + 1.66, ez, 0.012, 0.2, 0.012, 0x0a0a0a); colliders.push([ex, F + 0.8, ez, 1.15, 1.6, 0.55]); }
  // on the stage: the lace-draped stand before the left pillar; the round dotted-cloth table with the vase of white flowers beside the portrait; the folding metal stand; the microphone
  G.lace.box(1.07, platY + 0.5, PZ - 0.5, 0.7, 1.0, 0.45, W, 0.5); colliders.push([1.07, platY + 0.5, PZ - 0.5, 0.62, 1.0, 0.44]);
  { const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.72, 20), mats.dotted); tb.position.set(-1.7, platY + 0.36, PZ - 0.72); root.add(tb); colliders.push([-1.7, platY + 0.36, PZ - 0.72, 0.56, 0.72, 0.56]);
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.17, 10), mats.crystal); vase.position.set(-1.7, platY + 0.8, PZ - 0.72); root.add(vase);
    for (let i = 0; i < 9; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new M({ color: 0xfaf8f0, roughness: 0.8 })); fl.position.set(-1.8 + (i % 3) * 0.1, platY + 0.98 + (i % 2) * 0.08 + Math.floor(i / 3) * 0.03, PZ - 0.76 + (i % 4) * 0.03); root.add(fl); plain.beam([-1.7, platY + 0.86, PZ - 0.72], [fl.position.x, fl.position.y, fl.position.z], 0.008, 0x3f7a3a); } }
  const fsx = -2.95, fsz = PZ - 0.55; plain.box(fsx, platY + 0.5, fsz, 0.42, 0.02, 0.42, 0xd8dade); for (const [dx, dz] of [[-0.18, -0.18], [0.18, 0.18], [-0.18, 0.18], [0.18, -0.18]]) plain.beam([fsx + dx, platY, fsz + dz], [fsx - dx, platY + 0.5, fsz - dz], 0.018, 0xe8e8e8);
  plain.box(-2.75, platY + 0.78, PZ - 0.3, 0.022, 1.56, 0.022, 0x18181a); plain.box(-2.75, platY + 1.58, PZ - 0.36, 0.03, 0.03, 0.14, 0x0a0a0a); plain.box(-2.75, platY + 0.015, PZ - 0.3, 0.28, 0.03, 0.28, 0x18181a);
  // on the floor at the right corner of the stage: the big brocade-draped lectern with its orange cross, and the low red-cloth table beside it
  { const lx2 = -3.85, lz = PZ - 1.75; G.brocade.box(lx2, F + 0.62, lz, 0.8, 1.24, 0.62, W, 0.5, 0b001111); const lm = new THREE.Matrix4().makeRotationX(-0.45).setPosition(lx2, F + 1.32, lz - 0.02); G.brocade.setMatrix(lm); G.brocade.box(0, 0, 0, 0.86, 0.04, 0.76, W, 0.5); G.brocade.setMatrix(null);
    plain.setMatrix(lm); plain.box(0, 0.025, 0, 0.07, 0.006, 0.74, 0xd8642a); plain.box(0, 0.025, -0.1, 0.84, 0.006, 0.07, 0xd8642a); plain.setMatrix(null); plain.box(lx2, F + 0.6, lz - 0.315, 0.07, 1.2, 0.006, 0xd8642a); colliders.push([lx2, F + 0.65, lz, 0.84, 1.4, 0.7]);
    plain.box(-3.0, F + 0.2, PZ - 2.2, 0.6, 0.4, 0.42, 0x8a1c22); plain.box(-3.0, F + 0.405, PZ - 2.2, 0.62, 0.012, 0.44, 0xe6e2d8); colliders.push([-3.0, F + 0.2, PZ - 2.2, 0.62, 0.42, 0.46]);
    // left of the stage, on the floor: the low table with a white cloth over maroon, the white stool, and the bench along the side wall
    plain.box(3.1, F + 0.24, PZ - 1.75, 0.95, 0.48, 0.6, 0x7a1c26); plain.box(3.1, F + 0.487, PZ - 1.75, 0.8, 0.014, 0.62, 0xf4f2ec); colliders.push([3.1, F + 0.25, PZ - 1.75, 0.97, 0.5, 0.62]);
    plain.box(3.55, F + 0.55, PZ - 0.95, 0.3, 0.03, 0.3, 0xf4f4f0); for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) plain.box(3.55 + dx, F + 0.27, PZ - 0.95 + dz, 0.025, 0.54, 0.025, 0xf4f4f0);
    oak.box(xi - 0.3, F + 0.43, 3.6, 0.42, 0.05, 2.6, W, 1.2); oak.box(xi - 0.07, F + 0.7, 3.6, 0.04, 0.54, 2.6, W, 1.2); oak.box(xi - 0.3, F + 0.2, 3.6, 0.4, 0.4, 2.56, W, 1.2); colliders.push([xi - 0.3, F + 0.48, 3.6, 0.5, 0.96, 2.65]); }
  // ---------------------------------------------------------------- pews: long oak benches with solid curved ends and book racks; open floor before the stage
  const rows: number[] = []; for (let z = -4.3; z <= 1.5; z += 0.96) rows.push(z);
  const men: THREE.Vector3[] = [], women: THREE.Vector3[] = []; const endGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.05, 16, 1, false, 0, Math.PI); endGeo.rotateZ(Math.PI / 2); endGeo.rotateX(-Math.PI / 2);
  for (const z of rows) for (const sx of [-1, 1]) {
    const x0 = sx * 0.9, x1 = sx * (xi - 0.12), cx = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    oak.box(cx, F + 0.43, z, len, 0.05, 0.42, W, 1.2);
    { const bm = new THREE.Matrix4().makeRotationX(0.16).setPosition(cx, F + 0.68, z - 0.215); oak.setMatrix(bm); oak.box(0, 0, 0, len, 0.54, 0.035, W, 1.2); oak.setMatrix(null); }
    oak.box(cx, F + 0.965, z - 0.262, len, 0.04, 0.07, W, 1.2); oak.box(cx, F + 0.2, z + 0.17, len, 0.4, 0.03, W, 1.2);
    for (const ex of [x0, x1]) { oak.box(ex, F + 0.36, z - 0.03, 0.05, 0.72, 0.54, W, 1.2); oak.merge(endGeo, new THREE.Matrix4().makeTranslation(ex, F + 0.72, z - 0.03), W); }
    for (let k = 0; k < 3; k++) oak.box(cx + (k - 1) * len * 0.3, F + 0.6, z - 0.33, 0.5, 0.14, 0.06, W, 1.2);                       // hymn-book racks on the back
    colliders.push([cx, F + 0.48, z - 0.05, len + 0.06, 0.96, 0.56]);
    for (let k = 0; k < 4; k++) (sx > 0 ? men : women).push(new THREE.Vector3(sx * (1.35 + k * 0.82), F, z + 0.42));
  }
  oak.box(-(xi - 0.3), F + 0.43, 3.2, 0.42, 0.05, 2.6, W, 1.2); oak.box(-(xi - 0.07), F + 0.7, 3.2, 0.04, 0.54, 2.6, W, 1.2); oak.box(-(xi - 0.3), F + 0.2, 3.2, 0.4, 0.4, 2.56, W, 1.2); colliders.push([-(xi - 0.3), F + 0.48, 3.2, 0.5, 0.96, 2.65]);   // the bench along the right wall at the front
  // ---------------------------------------------------------------- open floor: the upholstered chair, a folding chair, the kebero
  wood.box(0, F + 0.46, 2.9, 0.54, 0.09, 0.52, 0x2a160c); wood.box(0, F + 0.92, 2.66, 0.52, 0.84, 0.07, 0x2a160c); for (const [dx, dz] of [[-0.23, -0.21], [0.23, -0.21], [-0.23, 0.21], [0.23, 0.21]]) wood.box(dx, F + 0.21, 2.9 + dz, 0.055, 0.42, 0.055, 0x1a0c06);
  plain.box(0, F + 0.52, 2.9, 0.46, 0.05, 0.44, 0xd8c8a4); plain.box(0, F + 0.95, 2.7, 0.42, 0.66, 0.03, 0x5a5048); colliders.push([0, F + 0.5, 2.85, 0.58, 1.0, 0.62]);
  plain.box(-1.5, F + 0.45, 3.5, 0.4, 0.03, 0.4, 0x141416); plain.box(-1.5, F + 0.72, 3.69, 0.4, 0.26, 0.02, 0x141416); for (const dx of [-0.19, 0.19]) { plain.beam([-1.5 + dx, F, 3.3], [-1.5 + dx, F + 0.86, 3.7], 0.02, 0x141416); plain.beam([-1.5 + dx, F, 3.7], [-1.5 + dx, F + 0.45, 3.32], 0.02, 0x141416); }
  plain.box(-0.95, F + 0.14, 4.0, 0.3, 0.28, 0.3, 0xf4f4f0);
  const k1 = keberoMesh(1.2); k1.position.set(-0.85, F + 0.38, 3.2); k1.rotation.set(0.25, 0.5, Math.PI / 2 - 0.3); root.add(k1);
  const k2 = keberoMesh(1.05); k2.position.set(1.6, F + 0.35, 3.7); k2.rotation.set(-0.15, 1.9, Math.PI / 2 - 0.2); root.add(k2); colliders.push([-0.85, F + 0.3, 3.2, 0.9, 0.6, 0.7], [1.6, F + 0.3, 3.7, 0.8, 0.6, 0.7]);
  for (let i = 0; i < 5; i++) { const m = maqomiyaMesh(); m.rotation.set(Math.PI / 2, 0, Math.PI / 2); m.position.set(3.9 - (i % 2) * 0.25, F + 0.475 + 0.012, 1.3 + i * 0.075); root.add(m); }       // prayer staffs lying on the front pew seat
  const umbrellas = new THREE.Group(); [0x8a1f3a, 0x2a2f7a, 0x1f6a46].forEach((c, i) => { const u = umbrellaMesh(c, false); u.position.set(xi - 0.2 - i * 0.07, F, 1.95 + i * 0.1); u.rotation.z = 0.1; umbrellas.add(u); }); root.add(umbrellas);
  // candle stands either side of the centre arch, and the censer on its stand
  const candles: Candle[] = []; const candleLights: THREE.PointLight[] = [];
  for (const [bx, by, bz] of [[3.1, F + 0.495, PZ - 1.75], [-3.0, F + 0.41, PZ - 2.2]]) {
    for (const dx of [-0.16, 0, 0.16]) { const hold = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 10), mats.brass); hold.position.set(bx + dx, by + 0.015, bz); root.add(hold); const cnd = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), mats.wax); cnd.position.set(bx + dx, by + 0.15, bz); root.add(cnd); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), mats.flame); fl.scale.y = 1.9; fl.position.set(bx + dx, by + 0.3, bz); fl.visible = false; root.add(fl); candles.push({ flame: fl, pos: fl.position.clone(), lit: false }); }
    const pl = new THREE.PointLight(0xffa850, 0, 6, 1.8); pl.position.set(bx, by + 0.4, bz - 0.1); root.add(pl); candleLights.push(pl); }
  const censer = censerMesh(); censer.position.set(fsx, platY + 0.51 + 0.2, fsz); root.add(censer);
  const ts = tsenatselMesh(); ts.position.set(fsx + 0.13, platY + 0.53, fsz + 0.1); ts.rotation.z = Math.PI / 2; root.add(ts); const hc = handCrossMesh(); hc.position.set(fsx - 0.13, platY + 0.53, fsz - 0.1); hc.rotation.x = -Math.PI / 2; root.add(hc);
  const camLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new M({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 0 })); camLed.position.set(0.36, F + 2.25, zb + 0.19); root.add(camLed);
  // ---------------------------------------------------------------- the lobby: lower floor, five carpeted steps up between paneled walls to the cross doors;
  //                                                                  basement doorway on the left, shoe shelves and coat nook on the right
  const lx = WINGX - T, lz0 = TZ0 + T, lTop = FL + 2.7, sx0 = 0.92, sz0 = -7.35, nS = 5, rise = (F - FL) / nS, run = (NZ0 - 0.55 - sz0) / nS;
  for (const sx of [-1, 1]) wall(cream, sx * lx, lz0, sx * lx, NZ0, [-sx, 0], FL, lTop, [], W, 1);
  const lwin = (sx: number) => ({ at: sx * (CH.TW + WINGX) / 2, w: 0.56, y0: FL + 0.5, y1: FL + 2.05, peak: FL + 2.42 });
  wall(cream, -lx, lz0, lx, lz0, [0, 1], FL, lTop, [{ at: 0, w: 1.15, y0: FL, y1: FL + 2.12 }, lwin(-1), lwin(1)], W, 1);
  for (const sx of [-1, 1]) { wall(cream, sx * sx0, NZ0, sx * lx, NZ0, [0, -1], FL, lTop, [], W, 1); wall(cream, sx * sx0, sz0, sx * sx0, NZ0, [sx, 0], FL, lTop, [], W, 1); wall(cream, sx * sx0, sz0, sx * sx0, NZ0, [-sx, 0], FL, F + 2.75, [], W, 1); wall(cream, sx * sx0, sz0, sx * (sx0 + 0.12), sz0, [0, -1], FL, lTop, [], W, 1); }
  wall(cream, -sx0, NZ0, sx0, NZ0, [0, -1], F, F + 2.75, [{ at: 0, w: 1.7, y0: F, y1: F + 2.05 }], W, 1);
  trimOutline(plain, (s, y) => [s, y, NZ0 - 0.014], [[-0.9, F], [-0.9, F + 2.12], [0.9, F + 2.12], [0.9, F]], 0.13, redFrame);
  G.paint.quad([-lx, lTop, lz0], [lx, lTop, lz0], [lx, lTop, NZ0], [-lx, lTop, NZ0], 0xeeeadc); G.paint.quad([-sx0, F + 2.75, sz0], [sx0, F + 2.75, sz0], [sx0, F + 2.75, NZ0], [-sx0, F + 2.75, NZ0], 0xeeeadc);
  G.lobby.quad([-lx, FL + 0.004, NZ0], [lx, FL + 0.004, NZ0], [lx, FL + 0.004, lz0], [-lx, FL + 0.004, lz0], W, [0, 0, 5, 3]);
  for (let i = 0; i < nS; i++) { const y = FL + (i + 1) * rise, z = sz0 + (i + 0.5) * run; const top = i === nS - 1; G.lobby.box(0, y - rise / 2, z, 2 * sx0, rise, run, W, 0.6); plain.box(0, y + 0.006, z - run / 2 + 0.03, 2 * sx0, 0.012, 0.06, 0xc8ccd0); colliders.push([0, (FL + y) / 2, z, 2 * sx0, y - FL, run]); void top; }
  carpet.quad([-sx0, F + 0.004, NZ0], [sx0, F + 0.004, NZ0], [sx0, F + 0.004, sz0 + nS * run], [-sx0, F + 0.004, sz0 + nS * run], W, [0, 0, 0.8, 0.25]);
  colliders.push([0, (FL + F) / 2, (sz0 + nS * run + NZ0) / 2, 2 * sx0, F - FL, NZ0 - (sz0 + nS * run)]);
  for (const sx of [-1, 1]) { colliders.push([sx * (sx0 + 0.06), FL + 1.5, (sz0 + NZ0) / 2, 0.12, 3, NZ0 - sz0]); plain.beam([sx * (sx0 - 0.07), FL + 0.95, sz0 - 0.1], [sx * (sx0 - 0.07), F + 0.95, sz0 + nS * run], 0.05, 0x6a3a1c, 0.09); plain.beam([sx * (sx0 - 0.02), FL + 0.02, sz0], [sx * (sx0 - 0.02), F + 0.02, sz0 + nS * run], 0.03, redFrame, 0.16); }
  plain.box(sx0 + 0.02, FL + 1.1, sz0 + 0.5, 0.02, 0.12, 0.16, 0x151515);                                              // light switch plate
  // left: the basement doorway (dark red frame); the stair beyond is not part of the game
  plain.box(lx - 0.02, FL + 1.05, -7.6, 0.06, 2.16, 1.0, redFrame); plain.box(lx - 0.035, FL + 1.02, -7.6, 0.05, 2.02, 0.84, 0x2a2e33);
  // right: tall shoe shelves under the slope of the upper stair, then the coat nook with its rail, hangers and table
  const shoes = new THREE.Group(); root.add(shoes); const sr = mulberry(3); const shx = -1.75, shz = NZ0 - 0.2;
  for (let k = 0; k < 9; k++) wood.box(shx, FL + 0.08 + k * 0.24, shz, 0.9, 0.025, 0.34, 0xd8b078); for (const dx of [-0.45, 0.45]) wood.box(shx + dx, FL + 1.05, shz, 0.03, 2.1, 0.34, 0xd8b078);
  for (let i = 0; i < 9; i++) for (const dx of [-0.07, 0.07]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), new M({ color: [0x1a1a1c, 0x3a2a20, 0x5a5a60, 0xf0f0f0, 0x2a3a5a][Math.floor(sr() * 5)], roughness: 0.7 })); sh.position.set(shx - 0.25 + (i % 3) * 0.25 + dx, FL + 0.14 + Math.floor(i / 3) * 0.24, shz); shoes.add(sh); }
  G.paint.quad([-sx0 - 0.13, FL + 1.3, NZ0 - 0.02], [-sx0 - 0.13, lTop, NZ0 - 1.5], [-2.25, lTop, NZ0 - 1.5], [-2.25, FL + 1.3, NZ0 - 0.02], 0xeeeadc);           // sloping soffit of the stair above
  colliders.push([shx, FL + 1.05, shz, 0.95, 2.1, 0.4]);
  plain.box(-2.45, FL + 1.85, -6.3, 0.03, 0.03, 1.4, 0xe8e8e8); for (let i = 0; i < 5; i++) { plain.box(-2.45, FL + 1.78, -6.9 + i * 0.3, 0.3, 0.02, 0.02, 0xf4f4f4); }
  plain.box(-2.35, FL + 0.74, -6.4, 0.5, 0.03, 1.5, 0xf2f2ee); for (const dz of [-0.7, 0.7]) plain.box(-2.35, FL + 0.37, -6.4 + dz, 0.45, 0.74, 0.03, 0xf2f2ee);
  [0x18181a, 0x2a2a30, 0xd8347a, 0x3a3a40].forEach((c, i) => plain.box(-2.38, FL + 0.84, -6.9 + i * 0.32, 0.4, 0.16, 0.3, c)); colliders.push([-2.35, FL + 0.4, -6.4, 0.55, 0.8, 1.55]);
  // ---------------------------------------------------------------- lights: chandelier, ceiling fan, recessed lights
  const chg = new THREE.Group(); chg.position.set(0, ceilTop - 0.02, 1.2);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), mats.brass); stem.position.y = -0.25; chg.add(stem); const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mats.brass); hub.position.y = -0.55; chg.add(hub);
  for (let tier = 0; tier < 2; tier++) { const n = tier ? 6 : 10, R = tier ? 0.24 : 0.42, y = tier ? -0.42 : -0.62; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; const armM = new THREE.Mesh(new THREE.TorusGeometry(R / 2, 0.008, 5, 10, Math.PI), mats.brass); armM.position.set(Math.cos(a) * R / 2, y, Math.sin(a) * R / 2); armM.rotation.set(Math.PI, -a, 0); chg.add(armM); const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), mats.bulb); b.scale.y = 1.6; b.position.set(Math.cos(a) * R, y + 0.07, Math.sin(a) * R); chg.add(b); const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), mats.crystal); cr.scale.y = 2; cr.position.set(Math.cos(a) * R, y - 0.09, Math.sin(a) * R); chg.add(cr); } }
  root.add(chg);
  const fanBlades = new THREE.Group(); { const hub2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), new M({ color: 0xf0f0ec })); hub2.position.set(0, ceilTop - 0.2, -0.9); root.add(hub2); fanBlades.position.copy(hub2.position); for (let k = 0; k < 3; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.012, 0.13), new M({ color: 0xf4f4f0 })); bl.position.set(Math.cos(k * 2.094) * 0.42, -0.04, Math.sin(k * 2.094) * 0.42); bl.rotation.y = -k * 2.094; fanBlades.add(bl); } root.add(fanBlades); }
  const chandelier = new THREE.PointLight(0xffe8c4, 0, 18, 1.4); chandelier.position.set(0, F + 2.5, 1.2); if (!low) { chandelier.castShadow = true; chandelier.shadow.mapSize.set(512, 512); chandelier.shadow.bias = -0.002; } root.add(chandelier);
  const fill = new THREE.PointLight(0xfff4e0, 0, 14, 1.5); fill.position.set(0, F + 2.5, -3.2); root.add(fill);
  const vest = new THREE.PointLight(0xfff0d0, 0, 8, 1.6); vest.position.set(0, FL + 2.3, -7.4); root.add(vest);
  const recess = new Geo(); for (const [x, z] of [[-2.6, -3.4], [2.6, -3.4], [-2.6, 0.2], [2.6, 0.2], [-2.6, 3.8], [2.6, 3.8]]) { const d = new THREE.CircleGeometry(0.12, 12); d.rotateX(Math.PI / 2); d.translate(x, slopeY(x) - 0.012, z); recess.merge(d, null, 0xffffff); }
  root.add(recess.mesh(mats.bulb, false));
  const add = (g: Geo, mat: THREE.Material) => { if (g.count) { const m = g.mesh(mat, false); m.receiveShadow = true; root.add(m); } };
  add(panel, mats.panel); add(cream, mats.cream); add(paint, mats.paint); add(ceil, mats.ceil); add(wood, mats.wood); add(oak, mats.oak); add(plain, mats.plain); add(carpet, mats.carpet); add(runner, mats.runner); add(G.lobby, mats.lobby); add(G.band, mats.band); add(G.brocade, mats.brocade); add(G.dotted, mats.dotted); add(G.lace, mats.lace);
  // ---------------------------------------------------------------- places
  const chanters = [new THREE.Vector3(2.0, F, 2.5), new THREE.Vector3(-2.2, F, 2.5), new THREE.Vector3(2.2, F, 3.4), new THREE.Vector3(-2.4, F, 3.4), new THREE.Vector3(1.9, F, 4.15), new THREE.Vector3(-2.0, F, 4.15), new THREE.Vector3(3.2, F, 3.0), new THREE.Vector3(-3.0, F, 3.9)];
  const spots: Record<string, THREE.Vector3> = {
    street: new THREE.Vector3(0, 0, -14.5), stairsBottom: new THREE.Vector3(0, 0, -12.4), landing: new THREE.Vector3(0, FL, -9.3), vestibule: new THREE.Vector3(0, FL, -7.9), shoeRack: new THREE.Vector3(-1.75, FL, -6.35), shoeRackR: new THREE.Vector3(-1.9, FL, -7.2),
    naveDoor: new THREE.Vector3(0, F, -5.9), aisleBack: new THREE.Vector3(0, F, -4.4), aisleMid: new THREE.Vector3(0, F, 0), aisleFront: new THREE.Vector3(0, F, 3.9), candleL: new THREE.Vector3(3.1, F, PZ - 2.6), candleR: new THREE.Vector3(-2.8, F, PZ - 2.95),
    censer: new THREE.Vector3(-2.6, platY, PZ - 1.05), camera: new THREE.Vector3(1.6, F, -4.6), kebero: new THREE.Vector3(-0.85, F, 2.5), curtain: new THREE.Vector3(0, platY, PZ - 0.7), priest: new THREE.Vector3(0.8, F, 4.2), deacon: new THREE.Vector3(0.75, platY, PZ - 1.1),
    umbrellas: new THREE.Vector3(xi - 1.0, F, 1.9), lectern: new THREE.Vector3(-3.85, F, PZ - 2.55), bell: new THREE.Vector3(0.75, platY, PZ - 1.1), mahlet: new THREE.Vector3(0.9, F, 3.3), staffs: new THREE.Vector3(3.2, F, 2.15),
  };
  let lightLevel = 0;
  const refs: InteriorRefs = {
    colliders, spots, candles, candleLights, chandelier, censer, censerLit: false, camLed, streamOn: false, shoes, umbrellas, keberos: [k1, k2], standing: { men, women, chanters }, naveDoorWant: 0,
    setCandles(n) { candles.forEach((c, i) => { c.lit = i < n; c.flame.visible = c.lit; }); },
    setLights(level) { lightLevel = level; },
    update(dt, time) {
      const t = time; const nL = candles.slice(0, 3).filter((c) => c.lit).length, nR = candles.slice(3).filter((c) => c.lit).length;
      const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
      candleLights[0].intensity = nL * 1.6 * fl; candleLights[1].intensity = nR * 1.6 * (1.7 - fl);
      for (const c of candles) if (c.lit) { c.flame.scale.y = 1.7 + 0.4 * Math.sin(t * 13 + c.pos.x * 30); c.flame.position.x = c.pos.x + Math.sin(t * 9 + c.pos.x * 20) * 0.003; }
      chandelier.intensity = 40 * lightLevel; fill.intensity = 12 * lightLevel; vest.intensity = 9 * Math.max(0.4, lightLevel);
      mats.bulb.emissiveIntensity = 0.2 + 1.6 * lightLevel; mats.ceil.emissiveIntensity = 0.3 + 0.5 * lightLevel;
      fanBlades.rotation.y = t * 2.4;
      censer.rotation.z = Math.sin(t * 1.6) * (refs.censerLit ? 0.12 : 0.02);
      (censer.getObjectByName('ember') as THREE.Mesh<any, THREE.MeshStandardMaterial>).material.emissiveIntensity = refs.censerLit ? 2 + Math.sin(t * 5) : 0;
      (camLed.material as THREE.MeshStandardMaterial).emissiveIntensity = refs.streamOn ? (Math.sin(t * 4) > 0 ? 4 : 0.5) : 0;
      for (const d of naveDoors) { const sx = (d.userData as any).sx as number; const cur = d.rotation.y * -sx / 1.5; const nx = cur + (refs.naveDoorWant - cur) * Math.min(1, dt * 4); d.rotation.y = -sx * nx * 1.5; }
      for (const cm of curtains) { const p = cm.geometry.attributes.position, b = cm.userData.base as Float32Array, cols = cm.userData.cols + 1; for (let i = 0; i < p.count; i++) { const v = 1 - Math.floor(i / cols) / 10; p.setZ(i, b[i * 3 + 2] + Math.sin(t * 0.9 + b[i * 3] * 3) * 0.012 * v); } p.needsUpdate = true; }
    },
  };
  return refs;
}

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
  const root = ch.interior; const { F, HW, NZ0, T, TW, TZ0, PZ } = CH;
  const xi = HW - T, zf = NZ0 + T, low = engine.quality === 'low';
  const M = THREE.MeshStandardMaterial;
  const panelTex = canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [226, 226, 222], 6, 31); for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect((i * w) / 8, 0, 1.5, h); } });
  const woodTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [196, 118, 58], 14, 37, 1.5); const r = mulberry(8); c.strokeStyle = 'rgba(90,40,10,0.22)'; for (let i = 0; i < 70; i++) { const x = r() * w; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 8 * (r() - 0.5), h * 0.3, x + 10 * (r() - 0.5), h * 0.7, x + 6 * (r() - 0.5), h); c.stroke(); } for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(60,25,5,0.5)'; c.fillRect((i * w) / 4, 0, 2, h); } });
  const oakTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [176, 120, 62], 12, 61, 1.5); const r = mulberry(18); c.strokeStyle = 'rgba(110,62,20,0.2)'; for (let i = 0; i < 80; i++) { const y = r() * h; c.lineWidth = 0.6 + r(); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 6 * (r() - 0.5), w * 0.7, y + 8 * (r() - 0.5), w, y + 5 * (r() - 0.5)); c.stroke(); } });
  const carpetTex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, [112, 30, 30], 10, 41, 0.5); const r = mulberry(12); for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, R = 14 + r() * 26; for (const [ox, oy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { c.strokeStyle = i % 3 ? '#a8884e' : '#c2a866'; c.lineWidth = 5 + r() * 3; c.beginPath(); c.arc(x + ox, y + oy, R, 0, 7); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(x + ox, y + oy, R * 0.5, 0, 7); c.stroke(); } } });
  const runnerTex = canvasTex(64, 64, (c, w, h) => speckle(c, w, h, [96, 18, 30], 12, 43, 0.4));
  const curtainTex = canvasTex(256, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, i % 2 ? '#e0851f' : '#b85a12'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#f2cf5a'; for (const [x, y] of [[64, 70], [192, 70], [128, 150], [64, 220], [192, 220]]) { c.fillRect(x - 3, y - 14, 6, 28); c.fillRect(x - 11, y - 6, 22, 6); c.beginPath(); c.arc(x, y - 3, 5, 0, 7); c.fill(); } }, { repeat: false });
  const tvTex = canvasTex(256, 144, (c, w, h) => { c.fillStyle = '#1f7fd6'; c.fillRect(0, 0, w, h); c.fillStyle = '#f6f8fb'; c.fillRect(22, 26, w - 44, h - 44); c.fillStyle = '#0e4f9a'; c.font = "700 15px 'Noto Sans Ethiopic', sans-serif"; c.textAlign = 'center'; c.fillText('መዝሙር', w / 2, 48); c.fillStyle = '#243040'; c.font = "11px 'Noto Sans Ethiopic', sans-serif"; ['መድኃኔ ዓለም ክብር ምስጋና ይገባሃል', 'እግዚአብሔር ይመስገን', 'ሃሌ ሉያ ሃሌ ሉያ', 'ስብሐት ለአብ ወወልድ ወመንፈስ ቅዱስ'].forEach((l, i) => c.fillText(l, w / 2, 68 + i * 16)); }, { repeat: false });
  const mats = {
    ceil: new M({ color: 0xf4f2ea, roughness: 0.95, emissive: 0xf2ead8, emissiveIntensity: 0.3 }), panel: new M({ map: panelTex, vertexColors: true, roughness: 0.6 }), paint: new M({ vertexColors: true, roughness: 0.9 }),
    wood: new M({ map: woodTex, vertexColors: true, roughness: 0.38 }), oak: new M({ map: oakTex, vertexColors: true, roughness: 0.42 }), carpet: new M({ map: carpetTex, roughness: 1 }), runner: new M({ map: runnerTex, roughness: 1 }),
    plain: new M({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), curtain: new M({ map: curtainTex, roughness: 0.42, metalness: 0.15, side: THREE.DoubleSide }),
    brass: brassMat(), tv: new M({ map: tvTex, emissive: 0xffffff, emissiveMap: tvTex, emissiveIntensity: 0.9, roughness: 0.3 }),
    bulb: new M({ color: 0xfff2d0, emissive: 0xffd9a0, emissiveIntensity: 3 }), crystal: new M({ color: 0xffffff, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.7 }),
    flame: new M({ color: 0xffe6a0, emissive: 0xffa030, emissiveIntensity: 5 }), wax: new M({ color: 0xf2ead8, roughness: 0.6 }),
  };
  for (const [m, k] of [[mats.carpet, 2.5], [mats.wood, 1.6], [mats.oak, 1.6], [mats.panel, 2.2], [mats.runner, 2.5]] as [THREE.MeshStandardMaterial, number][]) m.normalMap = normalFrom(m.map!, k);
  const fanBlades = new THREE.Group(); const ceil = new Geo(); const panel = new Geo(), paint = new Geo(), wood = new Geo(), plain = new Geo(), carpet = new Geo(), runner = new Geo();
  const yellow = new THREE.Color(0xe8dc8c), white = new THREE.Color(0xf2f2ee), pw = new THREE.Color(0xdcdcd6), W = new THREE.Color(0xffffff);
  const colliders: number[][] = [];
  const capY = F + 1.35, ceilEdge = F + 3.0, ceilRise = 0.7;
  // ---- nave shell (inner faces) ----
  for (const sx of [-1, 1]) {
    const lowHoles = CH.WIN_Z.filter((z) => z < PZ).map((z) => ({ at: z, w: CH.WIN_W, y0: F + 0.95, y1: capY }));
    const upHoles = CH.WIN_Z.filter((z) => z < PZ).map((z) => ({ at: z, w: CH.WIN_W, y0: capY, y1: F + 2.0, peak: F + 2.5 }));
    wall(panel, sx * xi, zf, sx * xi, PZ, [-sx, 0], F, capY, lowHoles, pw, 1);
    wall(paint, sx * xi, zf, sx * xi, PZ, [-sx, 0], capY, ceilEdge, upHoles, yellow);
    plain.box(sx * (xi - 0.02), capY, (zf + PZ) / 2, 0.04, 0.07, PZ - zf, white);
    plain.box(sx * (xi - 0.02), F + 0.06, (zf + PZ) / 2, 0.04, 0.12, PZ - zf, white);
    for (const z of CH.WIN_Z.filter((q) => q < PZ)) trimOutline(plain, (s, y) => [sx * (xi - 0.012), y, s], [[z - 0.39, F + 0.95], [z - 0.39, F + 2.0], [z, F + 2.5], [z + 0.39, F + 2.0], [z + 0.39, F + 0.95]], 0.09, white, true);
  }
  const doorHole = { at: 0, w: 1.5, y0: F, y1: F + 2.15 };
  wall(panel, -xi, zf, xi, zf, [0, 1], F, capY, [{ ...doorHole, y1: capY }, { at: -3.5, w: 0.7, y0: F + 0.95, y1: capY }, { at: 3.5, w: 0.7, y0: F + 0.95, y1: capY }], pw);
  wall(paint, -xi, zf, xi, zf, [0, 1], capY, ceilEdge, [{ ...doorHole, y0: capY }, { at: -3.5, w: 0.7, y0: capY, y1: F + 1.9, peak: F + 2.35 }, { at: 3.5, w: 0.7, y0: capY, y1: F + 1.9, peak: F + 2.35 }], yellow, 1, ceilRise);
  trimOutline(plain, (s, y) => [s, y, zf + 0.012], [[-0.8, F], [-0.8, F + 2.2], [0.8, F + 2.2], [0.8, F]], 0.1, white);
  // door jambs between vestibule and nave
  for (const sx of [-1, 1]) plain.quad([sx * 0.75, F, NZ0 - 0.02], [sx * 0.75, F, zf + 0.02], [sx * 0.75, F + 2.15, zf + 0.02], [sx * 0.75, F + 2.15, NZ0 - 0.02], white);
  plain.quad([-0.75, F + 2.15, NZ0], [0.75, F + 2.15, NZ0], [0.75, F + 2.15, zf], [-0.75, F + 2.15, zf], white);
  // ceiling
  ceil.quad([-xi, ceilEdge, zf], [0, ceilEdge + ceilRise, zf], [0, ceilEdge + ceilRise, PZ], [-xi, ceilEdge, PZ], white);
  ceil.quad([0, ceilEdge + ceilRise, zf], [xi, ceilEdge, zf], [xi, ceilEdge, PZ], [0, ceilEdge + ceilRise, PZ], white);
  // floor: patterned carpet + red runner
  carpet.quad([-xi, F + 0.004, PZ], [xi, F + 0.004, PZ], [xi, F + 0.004, zf], [-xi, F + 0.004, zf], W, [0, 0, (2 * xi) / 2.2, (PZ - zf) / 2.2]);
  runner.quad([-0.7, F + 0.012, PZ - 1.6], [0.7, F + 0.012, PZ - 1.6], [0.7, F + 0.012, zf], [-0.7, F + 0.012, zf], W, [0, 0, 2, 14]);
  // ---- sanctuary screen (Meqdes partition): warm wood paneling ----
  const wc = new THREE.Color(0xffffff);
  wall(wood, -xi, PZ, xi, PZ, [0, -1], F, ceilEdge, [], wc, 1.6, ceilRise);
  // platform in front of the screen
  const platY = F + 0.18; runner.box(0, F + 0.09, PZ - 0.8, 2 * xi, 0.18, 1.6, W, 0.8, 0b010010);
  // arches (decorated light-wood band) + curtains
  const arches: [number, number, number][] = [[-2.6, 1.25, 1.55], [0, 1.8, 1.75], [2.6, 1.25, 1.55]]; // x, width, straight height
  const curtains: THREE.Mesh[] = [];
  const bandTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e9cf9a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9a6a2a'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = '#9a6a2a'; c.fillRect(w / 2 - 2, 14, 4, 36); c.fillRect(w / 2 - 12, 26, 24, 4); });
  const bandMat = new M({ map: bandTex, roughness: 0.5, side: THREE.DoubleSide });
  const band = new Geo();
  for (const [ax, aw, ah] of arches) {
    const r = aw / 2, pts: number[][] = [[ax - r, platY]]; for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; pts.push([ax + Math.cos(a) * r, platY + ah + Math.sin(a) * r]); } pts.push([ax + r, platY]);
    // band of square tiles around the arch
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const n = Math.max(1, Math.round(l / 0.16)); const nx = (-dy / l) * 0.16, ny = (dx / l) * 0.16; band.quad([-a[0], a[1], PZ - 0.02], [-b[0], b[1], PZ - 0.02], [-(b[0] + nx), b[1] + ny, PZ - 0.02], [-(a[0] + nx), a[1] + ny, PZ - 0.02], W, [0, 0, n, 1]); }
    // curtain: pleated surface filling the arch
    const cols = 26, rows = 10, pos: number[] = [], uvs: number[] = [], idx: number[] = [];
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows, x = ax - r + u * aw; const top = platY + ah + Math.sqrt(Math.max(0, r * r - (x - ax) ** 2)); const y = platY + 0.02 + v * (top - platY - 0.02);
      pos.push(x, y, PZ - 0.07 - Math.sin(u * Math.PI * 9) * 0.035 * (0.5 + 0.5 * (1 - v))); uvs.push(u, v);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); cg.setIndex(idx); cg.computeVertexNormals();
    const cm = new THREE.Mesh(cg, mats.curtain); cm.userData.base = Float32Array.from(pos); cm.userData.cols = cols; root.add(cm); curtains.push(cm);
    // yellow valance with scallops
    for (let i = 0; i < 7; i++) { const x0 = ax - r * 0.82 + (i / 7) * r * 1.64, x1 = x0 + (r * 1.64) / 7, yt = platY + ah + r * 0.52; plain.tri([x1, yt, PZ - 0.12], [x0, yt, PZ - 0.12], [(x0 + x1) / 2, yt - 0.2, PZ - 0.12], 0xe9c53a); }
    plain.box(ax, platY + ah + r * 0.56, PZ - 0.12, r * 1.7, 0.1, 0.02, 0xe9c53a);
  }
  root.add(band.mesh(bandMat, false));
  // ---- icons, TVs and furnishings on the sanctuary screen (laid out from the reference photo; photo-left = local +x) ----
  const iconPlane = (kind: IconKind, x: number, y: number, z: number, w: number, rotY: number, hOver?: number) => {
    const h = hOver ?? w * 1.406; const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new M({ map: iconTexture(kind), roughness: 0.45 })); m.position.set(x, y, z); m.rotation.y = rotY; root.add(m);
    const fm = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z); wood.setMatrix(fm); wood.box(0, 0, -0.012, w + 0.07, h + 0.07, 0.02, 0x3a2416); wood.setMatrix(null);
  };
  const zs = PZ - 0.035;
  iconPlane('medhaneAlem', 3.5, F + 2.3, zs, 0.6, Math.PI);          // Christ with the open book, far left
  iconPlane('crucifixion', 3.0, F + 1.42, zs, 0.5, Math.PI);         // crucifixion beneath it
  iconPlane('thorns', 1.28, F + 2.72, zs, 0.72, Math.PI, 0.86);      // Christ crowned with thorns
  iconPlane('mary', 1.28, F + 1.72, zs, 0.55, Math.PI);              // St Mary with the Child, left of the centre arch
  iconPlane('gabriel', 1.28, F + 0.86, zs, 0.5, Math.PI, 0.62);
  iconPlane('trinity', 0, F + 3.2, zs, 0.9, Math.PI, 0.6);           // Holy Trinity above the centre arch
  iconPlane('mary', -1.3, F + 2.42, zs, 0.86, Math.PI, 1.62);        // the tall St Mary banner
  iconPlane('medhaneAlem', -1.3, F + 1.02, zs, 0.56, Math.PI);       // portrait of Christ beneath it
  iconPlane('grace', -3.42, F + 2.02, zs, 0.62, Math.PI);            // St Mary in white, far right
  iconPlane('michael', -3.42, F + 1.02, zs, 0.46, Math.PI, 0.56);
  const sideL: IconKind[] = ['michael', 'gabriel', 'george', 'mary'], sideR: IconKind[] = ['mary', 'medhaneAlem', 'crucifixion', 'george'];
  [-2.3, 0.3, 2.9, 5.2].forEach((z, i) => { iconPlane(sideL[i], xi - 0.03, F + 2.02, z, 0.58, -Math.PI / 2); iconPlane(sideR[i], -(xi - 0.03), F + 2.02, z, 0.58, Math.PI / 2); });
  iconPlane('gethsemane', 2.1, F + 2.35, zf + 0.035, 0.5, 0); iconPlane('mary', 2.2, F + 1.5, zf + 0.035, 0.56, 0);
  for (const sx of [-1, 1]) { const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.59), mats.tv); tv.position.set(sx * 2.42, F + 2.78, PZ - 0.06); tv.rotation.y = Math.PI; root.add(tv); plain.box(sx * 2.42, F + 2.78, PZ - 0.035, 1.12, 0.66, 0.04, 0x16181c); plain.box(sx * 3.78, F + 2.72, PZ - 0.22, 0.3, 0.46, 0.28, 0x1a1a1c); plain.box(sx * 3.78, F + 2.46, PZ - 0.18, 0.34, 0.03, 0.3, 0x2a2a2c); }
  for (const [cx2, cz2] of [[1.82, PZ - 0.04], [-1.2, zf + 0.04]]) { const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20), new M({ color: 0xf4f4f0, roughness: 0.4 })); clock.rotation.x = Math.PI / 2; clock.position.set(cx2, F + 2.62, cz2); root.add(clock); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20), new M({ color: 0x222222 })); rim.position.copy(clock.position); root.add(rim); }
  plain.box(-3.1, F + 2.5, PZ - 0.03, 0.32, 0.22, 0.02, 0xe8e8e4);
  // side door near the front on the right-hand wall (dark red frame) and the brown door at the back-left corner
  plain.box(-(xi - 0.02), F + 1.05, PZ - 2.05, 0.05, 2.14, 1.0, 0x5a1c1c); plain.box(-(xi - 0.045), F + 1.02, PZ - 2.05, 0.03, 2.02, 0.86, 0xb8875a);
  plain.box(-(xi - 0.07), F + 1.0, PZ - 1.68, 0.02, 0.05, 0.1, 0xc9a13a);
  plain.box(3.3, F + 1.05, zf + 0.02, 0.98, 2.14, 0.05, 0x4a2e1c); plain.box(3.3, F + 1.02, zf + 0.045, 0.84, 2.02, 0.03, 0x9a6a3e); plain.box(2.98, F + 1.0, zf + 0.07, 0.1, 0.05, 0.02, 0xc9a13a);
  // sound desk at the front-left, lectern with a green cloth and a microphone stand at the front-right
  plain.box(3.35, F + 0.45, 3.4, 1.0, 0.9, 0.55, 0x6a4a2e); plain.box(3.75, F + 0.8, 4.6, 0.4, 1.6, 0.9, 0x141416); for (const yy of [0.5, 0.95, 1.4]) plain.box(3.72, F + yy, 4.6, 0.42, 0.03, 0.92, 0x2a2a2e); plain.box(3.35, F + 0.94, 3.4, 0.6, 0.08, 0.36, 0x1a1a1c); plain.box(3.1, F + 0.93, 3.25, 0.2, 0.05, 0.14, 0x101012);
  for (let k = 0; k < 4; k++) plain.box(3.2 + k * 0.1, F + 1.02, 3.4, 0.012, 0.12, 0.012, 0x0a0a0a);
  plain.box(-3.0, F + 0.55, 4.0, 0.08, 1.1, 0.08, 0x3a2a1c); { const lm = new THREE.Matrix4().makeRotationX(-0.45).setPosition(-3.0, F + 1.14, 3.98); plain.setMatrix(lm); plain.box(0, 0, 0, 0.5, 0.03, 0.4, 0x1f5a3a); plain.box(0, 0.025, 0, 0.36, 0.02, 0.28, 0xf2ead8); plain.setMatrix(null); }
  plain.box(-2.3, F + 0.75, 4.25, 0.025, 1.5, 0.025, 0x18181a); plain.box(-2.3, F + 1.5, 4.2, 0.03, 0.03, 0.14, 0x0a0a0a); plain.box(-2.3, F + 0.02, 4.25, 0.3, 0.03, 0.3, 0x18181a);
  colliders.push([3.35, F + 0.5, 3.4, 1.0, 1.0, 0.6], [-3.0, F + 0.6, 4.0, 0.5, 1.2, 0.45]);
  // table on the stage at the right with a white cloth, a kettle and lilies
  plain.box(-3.25, platY + 0.38, PZ - 0.6, 0.9, 0.76, 0.6, 0xf4f2ec); plain.box(-3.4, platY + 0.86, PZ - 0.62, 0.16, 0.18, 0.16, 0xb8bcc2); plain.box(-3.4, platY + 0.97, PZ - 0.62, 0.05, 0.05, 0.05, 0x18181a);
  for (let i = 0; i < 6; i++) { const fl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 6), new M({ color: 0xfaf8f0, roughness: 0.7 })); fl.position.set(-3.0 + (i % 3) * 0.08, platY + 1.0 + (i % 2) * 0.08, PZ - 0.55 + (i % 2) * 0.06); fl.rotation.z = (i - 2.5) * 0.25; root.add(fl); }
  plain.box(-2.96, platY + 0.86, PZ - 0.52, 0.1, 0.2, 0.1, 0x2a5a3a);
  // ceiling fan toward the back, floor vents beside the runner
  { const hub2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 12), new M({ color: 0xf0f0ec })); hub2.position.set(0, ceilEdge + ceilRise - 0.2, -2.9); root.add(hub2); fanBlades.position.copy(hub2.position); for (let k = 0; k < 4; k++) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13), new M({ color: 0xf4f4f0 })); bl.position.set(Math.cos(k * Math.PI / 2) * 0.4, -0.04, Math.sin(k * Math.PI / 2) * 0.4); bl.rotation.y = -k * Math.PI / 2; fanBlades.add(bl); } root.add(fanBlades); }
  for (const z of [-3.2, -1.2, 0.8]) plain.box(0.95, F + 0.013, z, 0.14, 0.006, 0.36, 0xcfc8b8);
  // ---- pews: honey-oak benches with end panels, both sides of the aisle. The floor in front of the stage is left open:
  //      that is where the chanters stand with staffs, sistra and drums (as in the practice photo). ----
  const oak = new Geo(); const pewC = new THREE.Color(0xffffff);
  const rows: number[] = []; for (let z = -4.35; z <= 1.3; z += 0.98) rows.push(z);
  const men: THREE.Vector3[] = [], women: THREE.Vector3[] = [];
  for (const z of rows) for (const sx of [-1, 1]) {
    const x0 = sx * 0.9, x1 = sx * (xi - 0.3), cx = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    oak.box(cx, F + 0.44, z, len, 0.045, 0.4, pewC, 1.2);
    { const bm = new THREE.Matrix4().makeRotationX(0.14).setPosition(cx, F + 0.68, z - 0.2); oak.setMatrix(bm); oak.box(0, 0, 0, len, 0.52, 0.035, pewC, 1.2); oak.setMatrix(null); }
    oak.box(cx, F + 0.96, z - 0.245, len, 0.04, 0.06, pewC, 1.2);
    oak.box(cx, F + 0.22, z + 0.15, len, 0.42, 0.03, pewC, 1.2);
    for (const ex of [x0, x1]) { oak.box(ex, F + 0.42, z - 0.03, 0.045, 0.84, 0.5, pewC, 1.2); oak.box(ex, F + 0.9, z - 0.16, 0.045, 0.16, 0.24, pewC, 1.2); }
    colliders.push([cx, F + 0.46, z - 0.03, len + 0.06, 0.92, 0.5]);
    for (let k = 0; k < 4; k++) (sx > 0 ? men : women).push(new THREE.Vector3(sx * (1.3 + k * 0.72), F, z + 0.4));
  }
  // ---- the upholstered chair in the aisle before the stage, the lace-covered table and the flower table on the stage ----
  wood.box(0, F + 0.46, 2.75, 0.52, 0.09, 0.5, 0x3a2416); wood.box(0, F + 0.9, 2.52, 0.5, 0.8, 0.07, 0x3a2416); for (const [dx, dz] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) wood.box(dx, F + 0.21, 2.75 + dz, 0.05, 0.42, 0.05, 0x1a100a);
  plain.box(0, F + 0.52, 2.75, 0.44, 0.05, 0.42, 0xd8c8a4); plain.box(0, F + 0.92, 2.56, 0.4, 0.6, 0.03, 0x5a4636); colliders.push([0, F + 0.5, 2.7, 0.56, 1.0, 0.6]);
  plain.box(1.3, platY + 0.34, PZ - 0.55, 0.62, 0.68, 0.46, 0xf2efe6); plain.box(1.3, platY + 0.69, PZ - 0.55, 0.7, 0.015, 0.54, 0xfaf8f2);
  plain.box(-1.72, platY + 0.33, PZ - 0.5, 0.5, 0.66, 0.44, 0x241e3a); plain.box(-1.72, platY + 0.67, PZ - 0.5, 0.56, 0.02, 0.5, 0xd8c48a);
  for (let i = 0; i < 9; i++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), new M({ color: i % 2 ? 0xf8f4e4 : 0xf2d040, roughness: 0.8 })); fl.position.set(-1.84 + (i % 3) * 0.1, platY + 0.92 + (i % 2) * 0.07, PZ - 0.56 + (i % 4) * 0.035); root.add(fl); }
  plain.box(-1.74, platY + 0.78, PZ - 0.52, 0.11, 0.2, 0.11, 0x2f6a46);
  const ts = tsenatselMesh(); ts.position.set(1.42, platY + 0.71, PZ - 0.5); ts.rotation.z = Math.PI / 2; root.add(ts);
  const hc = handCrossMesh(); hc.position.set(1.12, platY + 0.72, PZ - 0.5); hc.rotation.x = -Math.PI / 2; root.add(hc);
  plain.box(1.75, F + 0.14, 3.6, 0.3, 0.28, 0.3, 0xf4f4f0);
  // ---- kebero drums, maqomiya, umbrellas ----
  const k1 = keberoMesh(1.15); k1.position.set(-1.05, F + 0.36, 3.45); k1.rotation.set(0.2, 0.5, Math.PI / 2 - 0.25); root.add(k1);
  const k2 = keberoMesh(1.0); k2.position.set(-2.1, F + 0.33, 2.3); k2.rotation.set(-0.15, 1.9, Math.PI / 2 - 0.2); root.add(k2); colliders.push([-1.05, F + 0.3, 3.45, 0.9, 0.6, 0.6], [-2.1, F + 0.3, 2.3, 0.8, 0.6, 0.6]);
  for (let i = 0; i < 6; i++) { const m = maqomiyaMesh(); m.position.set(xi - 0.12, F, 4.5 + i * 0.12); m.rotation.z = 0.13; m.rotation.y = i * 0.4; root.add(m); }
  const umbrellas = new THREE.Group(); const ucols = [0x8a1f3a, 0x2a2f7a, 0x1f6a46];
  ucols.forEach((c, i) => { const u = umbrellaMesh(c, false); u.position.set(xi - 0.18 - i * 0.07, F + 0.18, PZ - 0.3 - i * 0.16); u.rotation.z = 0.1; umbrellas.add(u); }); root.add(umbrellas);
  // ---- candle stands either side of the central curtain ----
  const candles: Candle[] = []; const candleLights: THREE.PointLight[] = [];
  for (const sx of [-1, 1]) {
    const bx = sx * 1.22, bz = PZ - 0.5;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, 1.15, 8), mats.brass); st.position.set(bx, platY + 0.575, bz); root.add(st);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 0.06, 12), mats.brass); base.position.set(bx, platY + 0.03, bz); root.add(base);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), mats.brass); arm.position.set(bx, platY + 1.12, bz); root.add(arm);
    for (const dx of [-0.19, 0, 0.19]) {
      const cnd = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.26, 6), mats.wax); cnd.position.set(bx + dx, platY + 1.27, bz); root.add(cnd);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), mats.flame); fl.scale.y = 1.9; fl.position.set(bx + dx, platY + 1.43, bz); fl.visible = false; root.add(fl);
      candles.push({ flame: fl, pos: fl.position.clone(), lit: false });
    }
    const pl = new THREE.PointLight(0xffa850, 0, 6, 1.8); pl.position.set(bx, platY + 1.5, bz - 0.1); root.add(pl); candleLights.push(pl);
  }
  // ---- censer on a stand ----
  const cst = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.3, 6), mats.brass); cst.position.set(-2.05, platY + 0.65, PZ - 0.5); root.add(cst);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.015, 0.015), mats.brass); hook.position.set(-1.95, platY + 1.3, PZ - 0.5); root.add(hook);
  const censer = censerMesh(); censer.position.set(-1.85, platY + 1.29, PZ - 0.5); root.add(censer);
  // ---- livestream: the camera looks down the aisle at the stage from above the entrance; a tripod camera and the laptop sit at the back ----
  const tri = new Geo(); for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.cos(a) * 0.28, 0, -Math.sin(a) * 0.28)).setPosition(-1.25 + Math.sin(a) * 0.16, F + 0.6, -4.95 + Math.cos(a) * 0.16); tri.setMatrix(m); tri.box(0, 0, 0, 0.025, 1.25, 0.025, 0x18181a); }
  tri.setMatrix(null); tri.box(-1.25, F + 1.32, -4.95, 0.11, 0.1, 0.2, 0x18181a); tri.box(-1.25, F + 1.32, -4.82, 0.07, 0.07, 0.08, 0x0a0a0c); tri.box(-1.25, F + 1.22, -4.95, 0.05, 0.1, 0.05, 0x18181a);
  tri.box(0, F + 2.42, zf + 0.12, 0.16, 0.05, 0.2, 0x2a2a2c); tri.box(0, F + 2.33, zf + 0.2, 0.12, 0.12, 0.16, 0xf0f0ec); tri.box(0, F + 2.33, zf + 0.29, 0.07, 0.07, 0.03, 0x0a0a0c);
  tri.box(-3.45, F + 0.36, -4.95, 0.7, 0.72, 0.45, 0x4a3a2c); tri.box(-3.45, F + 0.74, -4.95, 0.34, 0.02, 0.24, 0x2a2c30);
  root.add(tri.mesh(new M({ vertexColors: true, roughness: 0.5 })));
  const lap = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.21), new M({ color: 0x0a0a0c, emissive: 0x2a5a9a, emissiveIntensity: 0.6 })); lap.position.set(-3.45, F + 0.86, -5.07); lap.rotation.x = -0.25; root.add(lap);
  const camLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new M({ color: 0x220000, emissive: 0xff2020, emissiveIntensity: 0 })); camLed.position.set(0.05, F + 2.38, zf + 0.3); root.add(camLed);
  colliders.push([-1.25, F + 0.7, -4.95, 0.4, 1.4, 0.4], [-3.45, F + 0.4, -4.95, 0.7, 0.8, 0.45]);
  // ---- entry room (the full width of the tower and its wings): wood paneling, shoe racks on both sides,
  //      the door down to the basement on the left, coats hanging on the right ----
  const vx = CH.WINGX - T, vz0 = TZ0 + T, vTop = F + 2.7, vzm = (vz0 + NZ0) / 2;
  const wwin = (sx: number) => ({ at: sx * (TW + CH.WINGX) / 2, w: 0.56, y0: F + 0.5, y1: F + 2.05, peak: F + 2.42 });
  for (const sx of [-1, 1]) wall(wood, sx * vx, vz0, sx * vx, NZ0, [-sx, 0], F, vTop, [], wc, 1.6);
  wall(wood, -vx, vz0, vx, vz0, [0, 1], F, vTop, [{ at: 0, w: 1.15, y0: F, y1: F + 2.12 }, wwin(-1), wwin(1)], wc, 1.6);
  wall(wood, -vx, NZ0, vx, NZ0, [0, -1], F, vTop, [doorHole], wc, 1.6);
  for (const sx of [-1, 1]) { const cxw = sx * (TW + CH.WINGX) / 2; trimOutline(plain, (q, y) => [q, y, vz0 + 0.012], [[cxw - 0.28, F + 0.5], [cxw - 0.28, F + 2.05], [cxw, F + 2.42], [cxw + 0.28, F + 2.05], [cxw + 0.28, F + 0.5]], 0.09, white, true); }
  paint.quad([-vx, vTop, vz0], [vx, vTop, vz0], [vx, vTop, NZ0], [-vx, vTop, NZ0], white);
  plain.quad([-vx, F + 0.004, NZ0], [vx, F + 0.004, NZ0], [vx, F + 0.004, vz0], [-vx, F + 0.004, vz0], 0x6a5a4c);
  plain.box(0, F + 0.012, vzm, 1.3, 0.012, NZ0 - vz0 - 0.3, 0x5a1420);                                       // runner from the door
  // left: the basement door
  plain.box(vx - 0.02, F + 1.05, vzm + 0.35, 0.05, 2.14, 0.98, 0x3a2416); plain.box(vx - 0.045, F + 1.02, vzm + 0.35, 0.03, 2.02, 0.84, 0x8a5a34); plain.box(vx - 0.07, F + 1.0, vzm + 0.02, 0.02, 0.05, 0.1, 0xc9a13a);
  plain.box(vx - 0.03, F + 2.25, vzm + 0.35, 0.02, 0.14, 0.5, 0xf2efe6);                                      // small sign above it
  // right: coat rail with hooks, a shelf above it and a few coats
  plain.box(-vx + 0.03, F + 1.62, vzm + 0.3, 0.03, 0.1, 1.9, 0x5a3520); plain.box(-vx + 0.14, F + 1.86, vzm + 0.3, 0.26, 0.03, 1.9, 0x6a4526);
  for (let i = 0; i < 8; i++) plain.box(-vx + 0.07, F + 1.59, vzm - 0.55 + i * 0.24, 0.07, 0.03, 0.02, 0xb8b8b8);
  const coatCols = [0x18181a, 0x2a3a5a, 0x5a2a2a, 0x3a4a3a, 0xf2f0ea]; for (let i = 0; i < 5; i++) { plain.box(-vx + 0.13, F + 1.12, vzm - 0.45 + i * 0.36, 0.14, 0.92, 0.3, coatCols[i]); plain.box(-vx + 0.13, F + 1.6, vzm - 0.45 + i * 0.36, 0.1, 0.1, 0.2, coatCols[i]); }
  // shoe racks on both sides, by the front wall
  const shoes = new THREE.Group(); root.add(shoes); const sr = mulberry(3);
  for (const sx of [-1, 1]) {
    const rx2 = sx * (vx - 0.22), rz = vz0 + 0.85;
    for (const y of [0.1, 0.36, 0.62]) wood.box(rx2, F + y, rz, 0.36, 0.025, 1.3, 0x8a6a4a); for (const z of [-0.65, 0.65]) wood.box(rx2, F + 0.33, rz + z, 0.36, 0.66, 0.03, 0x8a6a4a);
    for (let i = 0; i < 7; i++) for (const dx of [-0.07, 0.07]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.24), new M({ color: [0x1a1a1c, 0x3a2a20, 0x5a5a60, 0xf0f0f0, 0x2a3a5a][Math.floor(sr() * 5)], roughness: 0.7 })); sh.position.set(rx2 + dx, F + [0.15, 0.41, 0.67][i % 3], rz - 0.5 + Math.floor(i / 3) * 0.42 + sr() * 0.08); shoes.add(sh); }
    colliders.push([rx2, F + 0.36, rz, 0.4, 0.74, 1.34]);
  }
  // the phone on a stand at the right end of the stage, beside the side door (the second stream angle)
  plain.box(-3.55, platY + 0.65, PZ - 1.3, 0.025, 1.3, 0.025, 0x18181a); plain.box(-3.55, platY + 0.02, PZ - 1.3, 0.34, 0.03, 0.34, 0x18181a); plain.box(-3.55, platY + 1.36, PZ - 1.31, 0.09, 0.17, 0.012, 0x0a0a0c);
  // ---- chandelier + recessed lights ----
  const chg = new THREE.Group(); chg.position.set(0, ceilEdge + ceilRise - 0.02, 0.4);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), mats.brass); stem.position.y = -0.25; chg.add(stem);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mats.brass); hub.position.y = -0.55; chg.add(hub);
  for (let tier = 0; tier < 2; tier++) { const n = tier ? 6 : 10, R = tier ? 0.24 : 0.42, y = tier ? -0.42 : -0.62; for (let i = 0; i < n; i++) { const a = (i / n) * 6.283; const armM = new THREE.Mesh(new THREE.TorusGeometry(R / 2, 0.008, 5, 10, Math.PI), mats.brass); armM.position.set(Math.cos(a) * R / 2, y, Math.sin(a) * R / 2); armM.rotation.set(Math.PI, -a, 0); chg.add(armM); const b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), mats.bulb); b.scale.y = 1.6; b.position.set(Math.cos(a) * R, y + 0.07, Math.sin(a) * R); chg.add(b); const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.022), mats.crystal); cr.scale.y = 2; cr.position.set(Math.cos(a) * R, y - 0.09, Math.sin(a) * R); chg.add(cr); } }
  root.add(chg);
  const chandelier = new THREE.PointLight(0xffe2b0, 0, 16, 1.4); chandelier.position.set(0, F + 2.55, 0.4); if (!low) { chandelier.castShadow = true; chandelier.shadow.mapSize.set(512, 512); chandelier.shadow.bias = -0.002; } root.add(chandelier);
  const fill = new THREE.PointLight(0xfff0d8, 0, 12, 1.5); fill.position.set(0, F + 2.6, -3.6); root.add(fill);
  const vest = new THREE.PointLight(0xffe2b0, 0, 7, 1.6); vest.position.set(0, F + 2.3, vzm); root.add(vest);
  const recess = new Geo(); for (const [x, z] of [[-2.4, -3], [2.4, -3], [-2.4, 3.4], [2.4, 3.4], [-2.4, 0.2], [2.4, 0.2]]) { const y = ceilEdge + ceilRise * (1 - Math.abs(x) / xi) - 0.01; const d = new THREE.CircleGeometry(0.11, 12); d.rotateX(Math.PI / 2); d.translate(x, y, z); recess.merge(d, null, 0xffffff); }
  root.add(recess.mesh(mats.bulb, false));
  const add = (g: Geo, mat: THREE.Material) => { if (g.count) { const m = g.mesh(mat, false); m.receiveShadow = true; root.add(m); } };
  add(ceil, mats.ceil); add(oak, mats.oak); add(panel, mats.panel); add(paint, mats.paint); add(wood, mats.wood); add(plain, mats.plain); add(carpet, mats.carpet); add(runner, mats.runner);
  // chanters stand before the curtain, either side of the aisle (as in the practice photo)
  const chanters = [new THREE.Vector3(1.9, F, 2.4), new THREE.Vector3(-1.9, F, 2.4), new THREE.Vector3(2.0, F, 3.3), new THREE.Vector3(-2.0, F, 3.3), new THREE.Vector3(2.1, F, 4.2), new THREE.Vector3(-2.6, F, 4.3), new THREE.Vector3(2.9, F, 2.9), new THREE.Vector3(-2.9, F, 3.0)];
  const spots: Record<string, THREE.Vector3> = {
    street: new THREE.Vector3(0, 0, -14.5), stairsBottom: new THREE.Vector3(0, 0, -12.4), landing: new THREE.Vector3(0, F, -9.3), vestibule: new THREE.Vector3(0, F, -7.0), shoeRack: new THREE.Vector3(1.75, F, -7.55), shoeRackR: new THREE.Vector3(-1.75, F, -7.55),
    aisleBack: new THREE.Vector3(0, F, -4.2), aisleMid: new THREE.Vector3(0, F, 0), aisleFront: new THREE.Vector3(0, F, 3.0), candleL: new THREE.Vector3(-1.22, platY, PZ - 1.0), candleR: new THREE.Vector3(1.22, platY, PZ - 1.0),
    censer: new THREE.Vector3(-1.85, platY, PZ - 1.05), camera: new THREE.Vector3(-3.0, F, -4.5), kebero: new THREE.Vector3(-1.05, F, 2.8), curtain: new THREE.Vector3(0, platY, PZ - 1.1),
    priest: new THREE.Vector3(0.7, F, 3.9), deacon: new THREE.Vector3(-0.9, platY, PZ - 1.2), umbrellas: new THREE.Vector3(xi - 0.8, platY, PZ - 0.9), backLeft: new THREE.Vector3(-2.6, F, -4.3), elderSeat: new THREE.Vector3(-1.6, F, -1.0), mahlet: new THREE.Vector3(0, F, 3.4), bell: new THREE.Vector3(-0.9, platY, PZ - 1.2),
  };
  let lightLevel = 0;
  const refs: InteriorRefs = {
    colliders, spots, candles, candleLights, chandelier, censer, censerLit: false, camLed, streamOn: false, shoes, umbrellas, keberos: [k1, k2], standing: { men, women, chanters },
    setCandles(n) { candles.forEach((c, i) => { c.lit = i < n; c.flame.visible = c.lit; }); },
    setLights(level) { lightLevel = level; },
    update(dt, time) {
      const t = time; const nL = candles.slice(0, 3).filter((c) => c.lit).length, nR = candles.slice(3).filter((c) => c.lit).length;
      const fl = 0.85 + 0.15 * Math.sin(t * 11) * Math.sin(t * 7.3);
      candleLights[0].intensity = nL * 1.6 * fl; candleLights[1].intensity = nR * 1.6 * (1.7 - fl);
      for (const c of candles) if (c.lit) { c.flame.scale.y = 1.7 + 0.4 * Math.sin(t * 13 + c.pos.x * 30); c.flame.position.x = c.pos.x + Math.sin(t * 9 + c.pos.x * 20) * 0.003; }
      chandelier.intensity = 34 * lightLevel; fill.intensity = 9 * lightLevel; vest.intensity = 7 * Math.max(0.35, lightLevel);
      mats.bulb.emissiveIntensity = 0.2 + 1.6 * lightLevel; mats.ceil.emissiveIntensity = 0.3 + 0.5 * lightLevel;
      fanBlades.rotation.y = t * 2.4;
      censer.rotation.z = Math.sin(t * 1.6) * (refs.censerLit ? 0.12 : 0.02);
      (censer.getObjectByName('ember') as THREE.Mesh<any, THREE.MeshStandardMaterial>).material.emissiveIntensity = refs.censerLit ? 2 + Math.sin(t * 5) : 0;
      (camLed.material as THREE.MeshStandardMaterial).emissiveIntensity = refs.streamOn ? (Math.sin(t * 4) > 0 ? 4 : 0.5) : 0;
      // faint movement in the curtains (air from the door)
      for (const cm of curtains) { const p = cm.geometry.attributes.position, b = cm.userData.base as Float32Array, cols = cm.userData.cols + 1; for (let i = 0; i < p.count; i++) { const v = 1 - Math.floor(i / cols) / 10; p.setZ(i, b[i * 3 + 2] + Math.sin(t * 0.9 + b[i * 3] * 3) * 0.012 * v); } p.needsUpdate = true; }
    },
  };
  return refs;
}

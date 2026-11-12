// Shared procedural PBR-ish materials (canvas-generated textures; no downloads).
import * as THREE from 'three/webgpu';
import { canvasTex, speckle, mulberry, normalFrom } from '../core/geo';

export type Season = 'summer' | 'autumn' | 'winter' | 'spring';

function sidingTex() {
  return canvasTex(128, 128, (c, w, h) => {
    speckle(c, w, h, [236, 236, 236], 8, 3);
    const n = 6; for (let i = 0; i < n; i++) { const y = (i * h) / n; const g = c.createLinearGradient(0, y, 0, y + h / n); g.addColorStop(0, 'rgba(0,0,0,0.30)'); g.addColorStop(0.12, 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(255,255,255,0.05)'); c.fillStyle = g; c.fillRect(0, y, w, h / n); }
  });
}
function vsidingTex() {
  return canvasTex(128, 128, (c, w, h) => {
    speckle(c, w, h, [236, 236, 236], 8, 4);
    const n = 5; for (let i = 0; i < n; i++) { const x = (i * w) / n; c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(x, 0, 2, h); c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(x + 2, 0, 2, h); }
  });
}
function stuccoTex() { return canvasTex(128, 128, (c, w, h) => speckle(c, w, h, [228, 228, 228], 26, 5, 0.5)); }
function shingleTex() {
  return canvasTex(128, 128, (c, w, h) => {
    speckle(c, w, h, [205, 205, 205], 30, 7, 0.5);
    for (let r = 0; r < 8; r++) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, r * 16, w, 2); for (let x = 0; x < 6; x++) c.fillRect(((x + (r % 2) * 0.5) * w) / 6, r * 16, 1.5, 16); }
  });
}
function concreteTex() { return canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [200, 198, 192], 16, 9); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); }); }
function asphaltTex() {
  return canvasTex(256, 256, (c, w, h) => {
    speckle(c, w, h, [92, 92, 94], 22, 11, 0.6);
    const r = mulberry(5); c.strokeStyle = 'rgba(30,30,30,0.35)'; c.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 50; y += (r() - 0.3) * 40; c.lineTo(x, y); } c.stroke(); }
    c.fillStyle = 'rgba(60,60,62,0.18)'; c.fillRect(r() * 150, r() * 150, 70, 46); // patch
  });
}
function gravelTex() { return canvasTex(128, 128, (c, w, h) => speckle(c, w, h, [150, 140, 124], 44, 13, 0.4)); }
function facadeTex() {
  // one bay (4 m) x one storey (3.6 m): brick with a window
  return canvasTex(128, 128, (c, w, h) => {
    speckle(c, w, h, [215, 212, 208], 12, 17);
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
    for (let y = 0; y < h; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 6) % 2 ? 0 : 8; x < w; x += 16) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 6); c.stroke(); } }
    c.fillStyle = '#d8d4cc'; c.fillRect(28, 26, 72, 70);
    const g = c.createLinearGradient(0, 30, 0, 92); g.addColorStop(0, '#39485a'); g.addColorStop(1, '#1c242e'); c.fillStyle = g; c.fillRect(32, 30, 64, 62);
    c.fillStyle = '#d8d4cc'; c.fillRect(62, 30, 4, 62); c.fillRect(32, 58, 64, 3);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(26, 96, 76, 4);
  });
}
function woodTex() { return canvasTex(128, 128, (c, w, h) => { speckle(c, w, h, [190, 170, 140], 16, 19); c.strokeStyle = 'rgba(60,40,20,0.25)'; for (let i = 0; i < 30; i++) { c.beginPath(); const x = Math.random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 4, h * 0.3, x - 4, h * 0.6, x + 2, h); c.stroke(); } for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect((i * w) / 8, 0, 1.5, h); } }); }
function chainTex() { return canvasTex(64, 64, (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(190,195,200,1)'; c.lineWidth = 2; for (let i = -64; i < 128; i += 16) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + 64, 64); c.stroke(); c.beginPath(); c.moveTo(i + 64, 0); c.lineTo(i, 64); c.stroke(); } }); }

export class Materials {
  siding = new THREE.MeshStandardMaterial({ map: sidingTex(), vertexColors: true, roughness: 0.82 });
  vsiding = new THREE.MeshStandardMaterial({ map: vsidingTex(), vertexColors: true, roughness: 0.8 });
  stucco = new THREE.MeshStandardMaterial({ map: stuccoTex(), vertexColors: true, roughness: 0.95 });
  roof = new THREE.MeshStandardMaterial({ map: shingleTex(), vertexColors: true, roughness: 0.92 });
  trim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  glass = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.08, metalness: 0.6, envMapIntensity: 1.5 });
  glassLit = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.2, metalness: 0.3, emissive: 0xffc070, emissiveIntensity: 0 });
  concrete = new THREE.MeshStandardMaterial({ map: concreteTex(), vertexColors: true, roughness: 0.9 });
  asphalt = new THREE.MeshStandardMaterial({ map: asphaltTex(), roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  gravel = new THREE.MeshStandardMaterial({ map: gravelTex(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  marking = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  facade = new THREE.MeshStandardMaterial({ map: facadeTex(), vertexColors: true, roughness: 0.85 });
  wood = new THREE.MeshStandardMaterial({ map: woodTex(), vertexColors: true, roughness: 0.85 });
  chain = new THREE.MeshStandardMaterial({ map: chainTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.7 });
  bark = new THREE.MeshStandardMaterial({ color: 0x4a3d33, roughness: 1 });
  leaves = new THREE.MeshStandardMaterial({ color: 0x3f8f34, roughness: 0.85 });
  needles = new THREE.MeshStandardMaterial({ color: 0x1f5a36, roughness: 0.9 });
  snow = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.85 });
  metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.7 });
  water = new THREE.MeshStandardMaterial({ color: 0x2f6a8a, roughness: 0.08, metalness: 0.3 });
  lamp = new THREE.MeshStandardMaterial({ color: 0x555555, emissive: 0xffd9a0, emissiveIntensity: 0 });
  constructor() {
    // relief from the textures themselves: lap siding, stucco grain, shingles, asphalt aggregate
    for (const [m, k] of [[this.siding, 3], [this.vsiding, 3], [this.stucco, 2.2], [this.roof, 3.2], [this.concrete, 1.4], [this.asphalt, 2.4], [this.gravel, 3], [this.facade, 2.6], [this.wood, 2]] as [THREE.MeshStandardMaterial, number][]) { m.normalMap = normalFrom(m.map!, k); m.normalScale.set(1, 1); }
  }
  season: Season = 'summer';
  snowAmount = 0;
  private roofBase = new THREE.Color(1, 1, 1);

  setSeason(s: Season) {
    this.season = s;
    const snow = s === 'winter' ? 1 : 0; this.snowAmount = snow;
    // roofs carry snow in winter (vertex colour is multiplied; push toward white through emissive-free tint)
    this.roof.color.copy(this.roofBase); this.roof.map!.needsUpdate = false;
    (this.roof as any).userData.snow = snow;
    this.leaves.visible = s !== 'winter';
    this.leaves.color.set(s === 'autumn' ? 0xe0a020 : s === 'spring' ? 0x8fd060 : 0x3f8f34);
    this.asphalt.color.set(s === 'winter' ? 0xdfe6ee : s === 'spring' ? 0x8a8a8a : 0xffffff);
    this.asphalt.roughness = s === 'winter' ? 0.55 : s === 'spring' ? 0.35 : 0.88;
    this.gravel.color.set(s === 'winter' ? 0xf2f5f9 : 0xffffff);
    this.concrete.color.set(s === 'winter' ? 0xf0f3f7 : 0xffffff);
    this.water.color.set(s === 'winter' ? 0xdfe8f0 : 0x3d5560); this.water.roughness = s === 'winter' ? 0.6 : 0.12;
  }
  /** 0 (day) .. 1 (night) */
  setNight(n: number) { this.glassLit.emissiveIntensity = n * 1.6; this.lamp.emissiveIntensity = n * 6; }
}

// The four deacons are always together: Isaac, Zekariah, Nigerte and Nebs. Q cycles who you control, 1-4 picks one directly; the others follow
// and ride along in the car. Also here: the car radio menu, crashes, and each deacon's ability.
import * as THREE from 'three/webgpu';
import type { Game } from './game';
import { Human, makeIsaac, makeZek, makeDeacon, Outfit } from './char/human';
import { Npc } from './char/npc';
import { handCrossMesh } from './church/interior';
import type { Car } from './vehicles/car';

export const RADIO: [string, string][] = [
  ['chant/mezmur_01', 'Mezmur 1'], ['chant/mezmur_02', 'Mezmur 2'], ['chant/kidase_opening', 'Kidase'], ['chant/mahlet_practice', 'Mahlet'], ['chant/meskel_demera', 'Meskel — Demera'],
  ['chant/siqlet', 'Siqlet'], ['chant/fasika_tensae', 'Fasika — Tensae'], ['music/menu', 'Menu theme'], ['music/solemn', 'Solemn'], ['music/festive', 'Festive'],
];
export type Who = 'isaac' | 'zek' | 'nigerte' | 'nebs';
const ORDER: Who[] = ['isaac', 'zek', 'nigerte', 'nebs'];
const NAME: Record<Who, string> = { isaac: 'Isaac', zek: 'Zekariah', nigerte: 'Nigerte', nebs: 'Nebs' };
const BASE_H: Record<Who, number> = { isaac: 1.84, zek: 1.78, nigerte: 1.5, nebs: 1.6 };
const SLOT: [number, number][] = [[0.95, 0.45], [-0.95, 0.45], [0, 1.25]];
interface Fol { pos: THREE.Vector3; yaw: number; speed: number }

export class Duo {
  active: Who = 'isaac'; humans = {} as Record<Who, Human>; fol = {} as Record<Who, Fol>; private inCar: Car | null = null;
  rage = 0; demon = false; private hitT = 0; private extras: THREE.Object3D[] = []; private qes: Npc | null = null; private heads: { m: THREE.Mesh; v: THREE.Vector3; t: number }[] = [];
  private brawl = 0; private stagger = 0; private vign: HTMLElement;
  holy = false; private holyFx: THREE.Group | null = null; private holyHeld: THREE.Object3D[] = [];
  rapture = false; private raptureFx: THREE.Group | null = null; private trumpetT = 0; private code: string[] = []; private codeT = 0; private lev = 0;
  radioI = -1; private el: HTMLElement; private bar: HTMLElement; private who: HTMLElement; private radioEl: HTMLElement; private radioT = 0; private hintT = 0; private confessing = false; private mutedVol = -1;

  constructor(private g: Game) {
    const el = document.createElement('div'); el.style.cssText = 'position:absolute;left:18px;bottom:250px;font:600 13px Inter,system-ui,sans-serif;color:#f6e7b8;text-shadow:0 1px 4px #000;pointer-events:none;line-height:1.5';
    el.innerHTML = '<div class="duo-who"></div><div style="margin-top:6px;width:170px;height:10px;border:1px solid #d9b03a;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden"><div class="duo-bar" style="height:100%;width:0;background:linear-gradient(90deg,#d9a01e,#c2271d)"></div></div><div style="font-weight:500;font-size:11px;opacity:.85;margin-top:3px">Zekariah — rage</div>';
    this.el = el; this.bar = el.querySelector('.duo-bar')!; this.who = el.querySelector('.duo-who')!; g.hud.root.append(el);
    this.radioEl = document.createElement('div'); this.radioEl.style.cssText = 'position:absolute;right:18px;bottom:120px;min-width:210px;padding:10px 12px;border:1px solid #d9b03a;border-radius:10px;background:rgba(12,40,30,.86);font:500 13px Inter,system-ui,sans-serif;color:#f3ead0;pointer-events:none;opacity:0;transition:opacity .3s'; g.hud.root.append(this.radioEl);
    this.vign = document.createElement('div'); this.vign.style.cssText = 'position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1s;background:radial-gradient(ellipse at center,rgba(60,0,0,0) 35%,rgba(90,0,0,.55) 78%,rgba(20,0,0,.9) 100%)'; g.hud.root.prepend(this.vign);
    this.humans.isaac = g.isaac; for (const w of ORDER) { this.fol[w] = { pos: new THREE.Vector3(), yaw: 0, speed: 0 }; if (w !== 'isaac') { this.humans[w] = this.make(w, g.outfit); g.engine.scene.add(this.humans[w].root); } }
    this.snapBuddy();
    window.addEventListener('keydown', (e) => this.key(e));
  }
  private key(e: KeyboardEvent) {
    const g = this.g; if (g.hud.titleOpen || g.hud.phoneOpen || e.repeat) return;
    const d = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (d >= 0) this.switchTo(ORDER[d]);
    if (e.code === 'KeyM') { if (this.mutedVol < 0) { this.mutedVol = g.audio.volume; g.audio.setVolume(0); g.audio.pauseAll(true); g.hud.toast('Sound off (M)', 2); } else { g.audio.pauseAll(false); g.audio.setVolume(this.mutedVol || 0.8); this.mutedVol = -1; g.hud.toast('Sound on (M)', 2); } }
    if (e.code === 'KeyO' && g.mode === 'foot' && g.input.enabled && !g.story.running) { g.setOutfit(g.outfit === 'deacon' ? 'netela' : 'deacon'); g.hud.toast(g.outfit === 'deacon' ? 'Deacon vestments' : 'Netela', 1.6); }
    if (e.code.startsWith('Arrow')) { if (this.codeT <= 0) this.code = []; this.code.push(e.code.slice(5)); this.codeT = 2.5; if (this.code.length > 4) this.code.shift(); if (this.code.join() === 'Up,Up,Down,Left') { this.code = []; this.setRapture(!this.rapture); } }
  }
  make(who: Who, o: Outfit): Human {
    const g = this.g; const h = who === 'isaac' ? makeIsaac(o, g.save.data.moustache, g.facePhoto) : who === 'zek' ? makeZek(o, g.zekPhoto) : who === 'nigerte' ? makeDeacon(o, g.photos.nigerte ?? null, 31, 1.5, 0x90644f, { width: 1.14, jaw: 1.3, chin: 0.9, cheek: 1.4, nose: 0.4, noseW: 1.5, lips: 1.05, brow: 0.6 }, 1.15) : makeDeacon(o, g.photos.nebs ?? null, 37, 1.6, 0x80604f, { width: 0.95, jaw: 0.8, chin: 1.12, cheek: 0.1, nose: 0.45, noseW: 1.15, lips: 0.9, brow: 0.6 }, 1.75);
    if (who === 'nigerte' && o !== 'deacon') { const head = h.bones.head; h.root.traverse((ob) => { const m = (ob as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (!m || !m.color) return; let p: THREE.Object3D | null = ob; while (p) { if (p === head) return; p = p.parent; } const c = m.color; if (c.r > 0.75 && c.g > 0.75 && c.b > 0.7) { const mm = m.clone(); mm.color.setHex(0x8cc9ea); (ob as THREE.Mesh).material = mm; } }); }   // his sky-blue gabi
    if (who === 'zek' && this.demon) this.demonize(h, true); return h;
  }
  /** called by Game.setOutfit after the active character was rebuilt */
  rebuildBuddy(o: Outfit) {
    this.endHoly(); this.humans[this.active] = this.g.isaac;
    for (const w of ORDER) if (w !== this.active) { const old = this.humans[w]; const parent = old.root.parent; const p = old.root.position.clone(), r = old.root.rotation.y; parent?.remove(old.root); old.dispose(); const h = this.make(w, o); this.humans[w] = h; parent?.add(h.root); h.root.position.copy(p); h.root.rotation.y = r; if (this.inCar) { h.seated = true; h.play('sit', 1, true); } }
    this.applyScale();
  }
  private followers() { return ORDER.filter((w) => w !== this.active); }
  snapBuddy() { const p = this.g.player; this.followers().forEach((w, i) => { const [r, b] = SLOT[i]; this.fol[w].pos.set(p.pos.x + Math.cos(p.yaw) * r + Math.sin(p.yaw) * b, p.pos.y, p.pos.z - Math.sin(p.yaw) * r + Math.cos(p.yaw) * b); this.fol[w].yaw = p.yaw; }); }

  /** GTA-style switch: control jumps to another deacon where he stands; the one you leave falls in behind */
  switch() { this.switchTo(ORDER[(ORDER.indexOf(this.active) + 1) % ORDER.length]); }
  switchTo(to: Who) {
    const g = this.g; if (to === this.active || g.mode !== 'foot' || !g.input.enabled) return; this.endHoly();
    const me = this.humans[this.active], other = this.humans[to]; const myPos = g.player.pos.clone(), myYaw = g.player.yaw; const f = this.fol[to];
    g.player.group.remove(me.root); g.engine.scene.remove(other.root); g.engine.scene.add(me.root); g.player.group.add(other.root); other.root.position.set(0, 0, 0); other.root.rotation.y = 0;
    g.player.teleport(f.pos.x, f.pos.y + 0.05, f.pos.z, f.yaw); this.fol[this.active].pos.copy(myPos); this.fol[this.active].yaw = myYaw; me.stop(); other.stop();
    g.isaac = other; this.active = to; this.applyScale(); g.rig.yaw = g.player.yaw; g.rig.snap(); g.hud.toast(`Deacon ${NAME[to]}`, 1.6);
  }
  private scaleOf(w: Who) { return this.demon ? (w === 'zek' ? 3.05 / BASE_H.zek : w === 'nigerte' ? 6.1 / BASE_H.nigerte : 1) : 1; }
  private applyScale() { for (const w of ORDER) this.humans[w].root.scale.setScalar(this.scaleOf(w)); const s = this.scaleOf(this.active); this.g.rig.height = 1.55 * (s > 1 ? s * 0.92 : 1); this.g.rig.maxDist = s > 3 ? 22 : s > 1 ? 12 : 9; this.g.rig.targetDist = s > 3 ? 16 : s > 1 ? 8 : Math.min(this.g.rig.targetDist, 5); }

  onEnterCar(car: Car) { const s = car.seat; this.endHoly(); this.followers().forEach((w, i) => { const h = this.humans[w]; this.g.engine.scene.remove(h.root); car.mesh.add(h.root); h.root.position.set(i === 2 ? s.x : -s.x, s.y - 0.52, i === 0 ? s.z : s.z - 0.95); h.root.rotation.y = Math.PI; h.seated = true; h.play('sit', 1, true); }); this.inCar = car; this.showRadio(); }
  onExitCar(car: Car) { const r = new THREE.Vector3(-1, 0, 0).applyQuaternion(car.quat), f = car.forward(); this.followers().forEach((w, i) => { const h = this.humans[w]; car.mesh.remove(h.root); this.g.engine.scene.add(h.root); h.seated = false; h.stop(); const p = this.fol[w].pos; p.copy(car.pos).addScaledVector(r, (i === 2 ? -1 : 1) * (car.spec.W / 2 + 0.75)).addScaledVector(f, i === 0 ? 0.4 : -0.9); p.y = this.g.world.height(p.x, p.z) + 0.1; }); this.inCar = null; this.radioEl.style.opacity = '0'; }

  // ---------------------------------------------------------------- radio: every recording Isaac supplied
  radio(dir: number) { const n = RADIO.length; this.radioI = this.radioI < 0 ? (dir > 0 ? 0 : n - 1) : this.radioI + dir; if (this.radioI >= n || this.radioI < 0) { this.radioI = -1; this.g.audio.chant(null); } else this.g.audio.chant(RADIO[this.radioI][0], 0.7); this.g.audio.radioIndex = this.radioI; this.showRadio(); }
  showRadio() { this.radioEl.innerHTML = `<div style="color:#f6e7b8;font-weight:700;margin-bottom:6px">♪ Radio &nbsp;<span style="font-weight:500;opacity:.8">R next · T previous</span></div>` + RADIO.map((r, i) => `<div style="padding:1px 0;${i === this.radioI ? 'color:#ffd75a;font-weight:700' : 'opacity:.75'}">${i === this.radioI ? '▶' : '&nbsp;&nbsp;'} ${r[1]}</div>`).join('') + `<div style="padding:1px 0;${this.radioI < 0 ? 'color:#ffd75a;font-weight:700' : 'opacity:.6'}">${this.radioI < 0 ? '▶' : '&nbsp;&nbsp;'} Off</div>`; this.radioEl.style.opacity = '1'; this.radioT = 6; }

  // ---------------------------------------------------------------- Zekariah: rage and the demon
  addRage(n: number) { if (this.demon) return; this.rage = Math.min(100, this.rage + n); if (this.rage >= 100 && this.hintT <= 0) { this.g.hud.toast("Zekariah's rage is full — press G", 5); this.hintT = 12; } }
  private demonize(h: Human, on: boolean) {
    for (const e of this.extras) e.parent?.remove(e); this.extras = [];
    h.root.traverse((o) => { const me = o as THREE.Mesh; const m = me.material as THREE.MeshStandardMaterial | undefined; if (!me.isMesh || !m || !(m as any).color) return;
      if (on) { if (!me.userData._om) me.userData._om = m; const d = m.clone(); d.map = null; d.normalMap = null; d.color.setHex(0x0d0303); d.roughness = 0.55; d.metalness = 0.15; d.emissive = new THREE.Color(0x5a0600); d.emissiveIntensity = 0.55; d.transparent = false; me.material = d; }
      else if (me.userData._om) { me.material = me.userData._om; delete me.userData._om; } });
    if (!on) return;
    const dark = new THREE.MeshStandardMaterial({ color: 0x080202, roughness: 0.5, emissive: 0x2a0200, emissiveIntensity: 0.6, side: THREE.DoubleSide }), glow = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xff3a00, emissiveIntensity: 9 }), bone = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.4 });
    const hd = new THREE.Group();
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), glow); eye.position.set(s * 0.031, 0.118, 0.066); eye.scale.set(1.5, 0.7, 0.6); hd.add(eye);
      let px = s * 0.055, py = 0.2, ang = s * 0.9; for (let k = 0; k < 5; k++) { const len = 0.085 - k * 0.008; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.022 - k * 0.004, 0.027 - k * 0.004, len, 7), dark); c.position.set(px + Math.sin(ang) * len / 2, py + Math.cos(ang) * len / 2, -0.01 - k * 0.012); c.rotation.z = -ang; hd.add(c); px += Math.sin(ang) * len; py += Math.cos(ang) * len; ang -= s * 0.42; }
      for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.03, 5), bone); t.position.set(s * (0.008 + k * 0.011), 0.028, 0.07 - k * 0.004); t.rotation.x = Math.PI; hd.add(t); }
    }
    const maw = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2a00, emissiveIntensity: 2.5 })); maw.scale.set(1.2, 0.5, 0.5); maw.position.set(0, 0.04, 0.066); hd.add(maw);
    h.bones.head.add(hd); this.extras.push(hd);
    const bd = new THREE.Group();
    for (const s of [-1, 1]) { const g2 = new THREE.BufferGeometry(); const P = [0, 0.1, -0.1, s * 0.5, 0.75, -0.3, s * 1.15, 0.5, -0.38, s * 0.95, 0.1, -0.33, s * 0.75, -0.2, -0.3, s * 0.5, 0.0, -0.24, s * 0.3, -0.35, -0.2]; g2.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g2.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 5, 3, 4, 5, 0, 5, 6]); g2.computeVertexNormals(); const wing = new THREE.Mesh(g2, dark); wing.name = 'wing' + s; bd.add(wing); }
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 5), dark); sp.position.set(0, 0.22 - k * 0.11, -0.13); sp.rotation.x = -1.1; bd.add(sp); }
    const lt = new THREE.PointLight(0xff2a00, 14, 14, 1.6); lt.position.set(0, 0.2, 0.4); bd.add(lt);
    h.bones.chest.add(bd); this.extras.push(bd);
    for (const side of ['handL', 'handR'] as const) { const b = (h.bones as any)[side] as THREE.Object3D | undefined; if (!b) continue; const cg = new THREE.Group(); for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.09, 5), bone); c.position.set((k - 1.5) * 0.018, -0.12, 0.01); c.rotation.x = Math.PI; cg.add(c); } b.add(cg); this.extras.push(cg); }
  }
  goDemon() {
    const g = this.g; if (this.demon || this.rage < 100 || g.mode !== 'foot') return; this.switchTo('zek'); if (this.active !== 'zek') return;
    this.demon = true; this.brawl = 0; this.demonize(g.isaac, true); this.applyScale(); this.vign.style.opacity = '1';
    g.hud.toast('Zekariah is gone. A demon stands in his place. Nisiha with Qesis Andualem — or Nigerte, grown to twenty feet — can end it.', 7);
    const ch = g.church; const q = new Npc('priest', 1, g.world.season === 'winter'); q.name = 'Qesis Andualem'; q.place(ch.toWorld(1.8, 0.05, -19), ch.faceYaw(0, -1)); q.act('holdCross'); g.engine.scene.add(q.human.root); this.qes = q;
  }
  private endDemon(msg: string) { const g = this.g; this.demon = false; this.rage = 0; this.brawl = 0; this.demonize(this.humans.zek, false); this.applyScale(); this.vign.style.opacity = '0'; if (this.qes) { g.engine.scene.remove(this.qes.human.root); this.qes.human.dispose(); this.qes = null; } if (!g.story.running || g.story.roaming) g.hud.setTarget(null); g.hud.toast(msg, 4.5); }
  private confess() {
    const g = this.g; if (this.confessing || !this.qes) return; this.confessing = true; const q = this.qes;
    (async () => { g.input.enabled = false; q.face(g.player.pos); q.act('bless'); g.isaac.play('sigdet', 3.4); g.hud.toast('Nisiha — "I have sinned, Abba. Forgive me."', 3.5); await g.wait(3.6); await g.hud.fade(1, 0.8);
      this.endDemon('"God has forgiven you. Go in peace."  —  Qesis Andualem'); await g.hud.fade(0, 0.8); g.input.enabled = true; this.confessing = false; })().catch(() => { g.input.enabled = true; this.confessing = false; });
  }
  private ripHead(n: Npc) {
    const hb = n.human.bones.head; if (!hb.visible) return; const wp = hb.getWorldPosition(new THREE.Vector3()); hb.visible = false; (n as any).downT = 1e9; n.human.root.rotation.x = -Math.PI / 2; n.human.root.position.y += 0.25;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.8 })); m.position.copy(wp); this.g.engine.scene.add(m);
    const p = this.g.player; this.heads.push({ m, v: new THREE.Vector3(-Math.sin(p.yaw) * 5 + (Math.random() - 0.5) * 3, 7, -Math.cos(p.yaw) * 5 + (Math.random() - 0.5) * 3), t: 0 }); this.g.isaac.play('reach', 0.8);
  }

  // ---------------------------------------------------------------- Nebs: in vestments, outside with cross and bell, he is lifted up in light
  private startHoly() {
    const g = this.g, h = this.humans.nebs; this.holy = true;
    const cross = handCrossMesh(); cross.scale.setScalar(1.5); h.hold('R', cross, [0, 0.1, 0.03], [0, 0, 0]); const bell = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.07, 12, 1, true), new THREE.MeshStandardMaterial({ color: 0xd9b03a, metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide })); h.hold('L', bell, [0, -0.1, 0.03], [0, 0, 0]); this.holyHeld = [cross, bell]; h.play('holdCross', 1, true);
    h.root.traverse((o) => { const me = o as THREE.Mesh; const m = me.material as THREE.MeshStandardMaterial | undefined; if (!me.isMesh || !m || !(m as any).emissive || me.userData._hm) return; me.userData._hm = m; const c = m.clone(); c.emissive = new THREE.Color(0xfff0c0); c.emissiveIntensity = 0.55; me.material = c; });
    const fx = new THREE.Group(); const fm = new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xffa020, emissiveIntensity: 7, transparent: true, opacity: 0.9 }); for (let i = 0; i < 16; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 7), fm); f.userData.a = (i / 16) * Math.PI * 2; fx.add(f); }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.014, 8, 28), fm); halo.rotation.x = Math.PI / 2; halo.name = 'halo'; fx.add(halo); const lt = new THREE.PointLight(0xffe2a0, 60, 26, 1.5); lt.position.y = 1.4; fx.add(lt); g.engine.scene.add(fx); this.holyFx = fx;
    g.audio.angels(true); g.hud.toast('Deacon Nebs is lifted up. The angels join the Kidase.', 4.5);
  }
  private endHoly() { if (!this.holy) return; const g = this.g, h = this.humans.nebs; this.holy = false; h.hold('R', null); h.hold('L', null); h.stop(); h.root.traverse((o) => { const me = o as THREE.Mesh; if (me.userData._hm) { me.material = me.userData._hm; delete me.userData._hm; } }); if (this.holyFx) { g.engine.scene.remove(this.holyFx); this.holyFx = null; } g.audio.angels(false); }

  // ---------------------------------------------------------------- Isaac: Up, Up, Down, Left. Everything passes away but the church
  setRapture(on: boolean) {
    const g = this.g; if (on === this.rapture) return; this.rapture = on;
    g.world.group.visible = !on; g.traffic.enabled = !on; g.peds.enabled = !on; if (on) { g.traffic.clear(true); g.peds.clear(); if (g.mode === 'car') g.exitCar(true); }
    if (on) {
      const ch = g.church; const fx = new THREE.Group(); const c0 = ch.toWorld(0, 0, 0); const gy = g.world.height(c0.x, c0.z);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1, emissive: 0x3a1a04, emissiveIntensity: 0.5 })); ground.rotation.x = -Math.PI / 2; ground.position.set(c0.x, gy - 0.06, c0.z); fx.add(ground);
      const gold = new THREE.PointLight(0xffe6a0, 140, 160, 1.3); gold.position.copy(ch.toWorld(0, 26, 0)); fx.add(gold);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 9, 260, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })); beam.position.copy(ch.toWorld(0, 135, 0)); fx.add(beam);
      g.engine.scene.add(fx); this.raptureFx = fx;
      for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; const p = ch.toWorld(Math.cos(a) * 15, 0, Math.sin(a) * 21); p.y = g.world.height(p.x, p.z) + 0.1; g.weather.addFire(p, 1.5); }
      g.audio.trumpets(); this.trumpetT = 9; g.hud.toast('Heaven and earth pass away. The church remains.', 6);
    } else { if (this.raptureFx) { g.engine.scene.remove(this.raptureFx); this.raptureFx = null; } g.weather.clearFires(); g.hud.toast('The world is restored.', 3); }
  }

  update(dt: number) {
    const g = this.g, inp = g.input, p = g.player; this.hitT -= dt; this.hintT -= dt; this.codeT -= dt; this.stagger -= dt; const T = g.time;
    if (inp.take('switch')) this.switch(); if (inp.take('rage')) this.goDemon();
    if (g.mode === 'car') { if (inp.take('radio')) this.radio(1); if (inp.take('radioPrev')) this.radio(-1); } else { inp.take('radio'); inp.take('radioPrev'); }
    if (this.radioT > 0) { this.radioT -= dt; if (this.radioT <= 0) this.radioEl.style.opacity = '0'; }
    // levitation: everyone during Isaac's event, Nebs alone during his
    this.lev += ((this.rapture ? 1 : 0) - this.lev) * Math.min(1, dt * 1.2);
    const levOf = (w: Who, i: number) => this.lev * (1.5 + 0.25 * Math.sin(T * 1.3 + i * 1.7)) + (w === 'nebs' && this.holy ? 1.15 + 0.12 * Math.sin(T * 1.6) : 0);
    this.humans[this.active].root.position.y = g.mode === 'foot' ? levOf(this.active, 0) / this.scaleOf(this.active) * this.scaleOf(this.active) : this.humans[this.active].root.position.y;
    // the other deacons keep beside you
    if (!this.inCar) {
      const inside = g.church.isInside(p.pos);
      this.followers().forEach((w, i) => {
        const f = this.fol[w], h = this.humans[w]; const [r, b] = SLOT[i]; const k = Math.max(1, this.scaleOf(w) * 0.6);
        const tx = p.pos.x + (Math.cos(p.yaw) * r + Math.sin(p.yaw) * b) * k, tz = p.pos.z + (-Math.sin(p.yaw) * r + Math.cos(p.yaw) * b) * k; const dx = tx - f.pos.x, dz = tz - f.pos.z, d = Math.hypot(dx, dz);
        if (this.demon && w === 'zek' && this.stagger > 0) { /* reeling from a blow */ }
        else if (d > 26 || Math.abs(p.pos.y - f.pos.y) > 4 || (g.mode === 'cutscene' && d > 6)) { f.pos.set(tx, p.pos.y, tz); f.yaw = p.yaw; f.speed = 0; }
        else if (d > 0.35) { const sp = Math.min(6.4, Math.max(1.2, d * 2.2)); const st = Math.min(d, sp * dt); f.pos.x += (dx / d) * st; f.pos.z += (dz / d) * st; let a = Math.atan2(-dx, -dz) - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += a * Math.min(1, dt * 9); f.speed += (sp - f.speed) * Math.min(1, dt * 8); }
        else { f.speed += (0 - f.speed) * Math.min(1, dt * 8); let a = p.yaw - f.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); f.yaw += a * Math.min(1, dt * 3); }
        const gy = inside || d < 2.5 ? p.pos.y : g.world.height(f.pos.x, f.pos.z) + 0.1; f.pos.y += (gy - f.pos.y) * Math.min(1, dt * 10);
        h.root.position.copy(f.pos); h.root.position.y += levOf(w, i + 1); h.root.rotation.y = f.yaw; h.update(dt, this.lev > 0.3 ? 0 : f.speed, true);
      });
    } else for (const w of this.followers()) this.humans[w].update(dt, 0, true);
    // Nebs
    const wantHoly = this.active === 'nebs' && g.outfit === 'deacon' && g.mode === 'foot' && !g.church.isInside(p.pos) && !this.demon;
    if (wantHoly && !this.holy) this.startHoly(); else if (!wantHoly && this.holy) this.endHoly();
    if (this.holy && this.holyFx) { const fx = this.holyFx; fx.position.copy(p.pos); for (const c of fx.children) { if (c.userData.a !== undefined) { const a = c.userData.a + T * 1.4; c.position.set(Math.cos(a) * 1.25, 0.25 + 0.12 * Math.sin(T * 9 + c.userData.a * 5), Math.sin(a) * 1.25); c.scale.y = 0.8 + 0.4 * Math.sin(T * 13 + c.userData.a * 7); } else if (c.name === 'halo') c.position.set(0, 1.15 + 1.6 + 0.42, 0); } }
    // Isaac's event
    if (this.rapture) { this.trumpetT -= dt; if (this.trumpetT <= 0) { g.audio.trumpets(); this.trumpetT = 11; } if (this.raptureFx) this.raptureFx.children[2].rotation.y = T * 0.2; }
    // crashes: pedestrians are knocked down, traffic is shunted; each one feeds Zekariah's rage
    const car = g.mode === 'car' ? g.activeCar : null;
    if (car && Math.abs(car.speed) > 2.5) {
      const f = car.forward(), sgn = Math.sign(car.speed) || 1;
      for (const e of g.peds.list) { const n = e.npc as any; if (n.downT > 0) continue; const dx = n.pos.x - car.pos.x, dz = n.pos.z - car.pos.z; const along = (dx * f.x + dz * f.z) * sgn, side = Math.abs(dx * f.z - dz * f.x); if (along > -1 && along < car.spec.L / 2 + 0.7 && side < car.spec.W / 2 + 0.35) { n.downT = 7; n.pos.x += f.x * sgn * 1.6; n.pos.z += f.z * sgn * 1.6; n.human.root.position.copy(n.pos); n.human.root.rotation.x = -Math.PI / 2; n.human.root.position.y += 0.2; g.audio.door(); this.addRage(22); const lv = car.body.linvel(); car.body.setLinvel({ x: lv.x * 0.8, y: lv.y, z: lv.z * 0.8 }, true); } }
      if (this.hitT <= 0) for (const a of g.traffic.ai) { const dx = a.car.pos.x - car.pos.x, dz = a.car.pos.z - car.pos.z; if (Math.hypot(dx, dz) < (car.spec.L + a.car.spec.L) / 2 - 0.5 && Math.abs(dx * f.z - dz * f.x) < (car.spec.W + a.car.spec.W) / 2) { a.v = 0; a.wait = 5; const lv = car.body.linvel(); car.body.setLinvel({ x: -lv.x * 0.35, y: lv.y, z: -lv.z * 0.35 }, true); const av = car.body.angvel(); car.body.setAngvel({ x: av.x, y: av.y + (Math.random() - 0.5) * 2.5, z: av.z }, true); g.audio.door(); g.audio.horn(); this.addRage(16); this.hitT = 1.2; break; } }
    }
    // the demon
    if (this.demon) {
      const zh = this.humans.zek; for (const s of [-1, 1]) { const wg = zh.root.getObjectByName('wing' + s); if (wg) wg.rotation.y = s * (0.25 + 0.3 * Math.sin(T * 3.2)); }
      if (this.qes) { this.qes.update(dt); if (!g.story.running || g.story.roaming) g.hud.setTarget({ x: this.qes.pos.x, z: this.qes.pos.z }); }
      if (g.mode === 'foot' && inp.enabled && !g.story.promptOwner && !this.confessing) {
        if (this.active === 'zek') {
          const near = this.qes && this.qes.pos.distanceTo(p.pos) < 4.2;
          let victim: Npc | null = null, best = 3.6; if (!near) for (const e of g.peds.list) { const d = e.npc.pos.distanceTo(p.pos); if (d < best && e.npc.human.bones.head.visible) { best = d; victim = e.npc; } }
          if (near) { g.hud.promptRaw('<b>E</b> Nisiha — confess to Qesis Andualem'); if (inp.take('interact')) this.confess(); }
          else if (victim) { g.hud.promptRaw('<b>E</b> Rip'); if (inp.take('interact')) this.ripHead(victim); }
        } else if (this.active === 'nigerte') {
          const zf = this.fol.zek; const d = Math.hypot(zf.pos.x - p.pos.x, zf.pos.z - p.pos.z);
          if (d < 7.5) { g.hud.promptRaw(`<b>E</b> Strike the demon down (${this.brawl}/4)`); if (inp.take('interact')) { this.brawl++; g.isaac.play('reach', 0.7); g.audio.door(); const dx = (zf.pos.x - p.pos.x) / (d || 1), dz = (zf.pos.z - p.pos.z) / (d || 1); zf.pos.x += dx * 3.5; zf.pos.z += dz * 3.5; this.stagger = 1.3; this.humans.zek.play('sigdet', 1.2); if (this.brawl >= 4) this.endDemon('Nigerte has subdued the demon. Zekariah is himself again.'); } }
        }
      }
    }
    for (const h of this.heads) { h.t += dt; h.v.y -= 16 * dt; h.m.position.addScaledVector(h.v, dt); h.m.rotation.x += dt * 9; const gy = g.world.height(h.m.position.x, h.m.position.z) + 0.11; if (h.m.position.y < gy) { h.m.position.y = gy; h.v.y *= -0.4; h.v.x *= 0.6; h.v.z *= 0.6; } }
    this.heads = this.heads.filter((h) => { if (h.t > 12) { g.engine.scene.remove(h.m); return false; } return true; });
    this.bar.style.width = `${this.rage}%`;
    this.who.innerHTML = ORDER.map((w, i) => `<span style="${w === this.active ? 'color:#ffd75a' : 'opacity:.7;font-weight:500'}">${i + 1} ${NAME[w]}</span>`).join(' &nbsp; ') + `<br><span style="font-weight:500;font-size:11px;opacity:.85">Q next · 1–4 pick · M sound · O vestments${this.demon ? ' · <b style="color:#ff6a4a">DEMON</b>' : this.rage >= 100 ? ' · <b>G rage</b>' : ''}</span>`;
    this.el.style.display = g.hud.titleOpen || g.mode === 'cutscene' || g.mode === 'photo' ? 'none' : '';
  }
}

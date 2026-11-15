// Two deacons, always together: Isaac and Zekariah. Q switches who you control (the other follows); also the car radio menu,
// collisions with pedestrians and traffic, Zekariah's rage meter, his demon form, and nisiha (confession) with the Qesis to end it.
import * as THREE from 'three/webgpu';
import type { Game } from './game';
import { Human, makeIsaac, makeZek, Outfit } from './char/human';
import { Npc } from './char/npc';
import type { Car } from './vehicles/car';

export const RADIO: [string, string][] = [
  ['chant/mezmur_01', 'Mezmur 1'], ['chant/mezmur_02', 'Mezmur 2'], ['chant/kidase_opening', 'Kidase'], ['chant/mahlet_practice', 'Mahlet'], ['chant/meskel_demera', 'Meskel — Demera'],
  ['chant/siqlet', 'Siqlet'], ['chant/fasika_tensae', 'Fasika — Tensae'], ['music/menu', 'Menu theme'], ['music/solemn', 'Solemn'], ['music/festive', 'Festive'],
];

export class Duo {
  active: 'isaac' | 'zek' = 'isaac'; buddy!: Human; bpos = new THREE.Vector3(); byaw = 0; private bspeed = 0; private inCar: Car | null = null;
  rage = 0; demon = false; private hitT = 0; private horns: THREE.Object3D | null = null; private qes: Npc | null = null; private heads: { m: THREE.Mesh; v: THREE.Vector3; t: number }[] = [];
  radioI = -1; private el: HTMLElement; private bar: HTMLElement; private who: HTMLElement; private radioEl: HTMLElement; private radioT = 0; private hintT = 0; private confessing = false;

  constructor(private g: Game) {
    const el = document.createElement('div'); el.style.cssText = 'position:absolute;left:18px;bottom:250px;font:600 13px Inter,system-ui,sans-serif;color:#f6e7b8;text-shadow:0 1px 4px #000;pointer-events:none';
    el.innerHTML = '<div class="duo-who"></div><div style="margin-top:6px;width:170px;height:10px;border:1px solid #d9b03a;border-radius:6px;background:rgba(0,0,0,.45);overflow:hidden"><div class="duo-bar" style="height:100%;width:0;background:linear-gradient(90deg,#d9a01e,#c2271d)"></div></div><div style="font-weight:500;font-size:11px;opacity:.85;margin-top:3px">Zekariah — rage</div>';
    this.el = el; this.bar = el.querySelector('.duo-bar')!; this.who = el.querySelector('.duo-who')!; g.hud.root.append(el);
    this.radioEl = document.createElement('div'); this.radioEl.style.cssText = 'position:absolute;right:18px;bottom:120px;min-width:210px;padding:10px 12px;border:1px solid #d9b03a;border-radius:10px;background:rgba(12,40,30,.86);font:500 13px Inter,system-ui,sans-serif;color:#f3ead0;pointer-events:none;opacity:0;transition:opacity .3s'; g.hud.root.append(this.radioEl);
    this.buddy = this.make('zek', g.outfit); g.engine.scene.add(this.buddy.root); this.snapBuddy();
  }
  make(who: 'isaac' | 'zek', o: Outfit): Human { const g = this.g; const h = who === 'isaac' ? makeIsaac(o, g.save.data.moustache, g.facePhoto) : makeZek(o, g.zekPhoto); if (who === 'zek' && this.demon) this.demonize(h, true); return h; }
  /** called by Game.setOutfit after the active character was rebuilt */
  rebuildBuddy(o: Outfit) { const parent = this.buddy.root.parent; const p = this.buddy.root.position.clone(), r = this.buddy.root.rotation.y; parent?.remove(this.buddy.root); this.buddy.dispose(); this.buddy = this.make(this.active === 'isaac' ? 'zek' : 'isaac', o); parent?.add(this.buddy.root); this.buddy.root.position.copy(p); this.buddy.root.rotation.y = r; if (this.inCar) { this.buddy.seated = true; this.buddy.play('drive', 1, true); } }
  snapBuddy() { const p = this.g.player; this.bpos.set(p.pos.x + Math.cos(p.yaw) * 0.9, p.pos.y, p.pos.z - Math.sin(p.yaw) * 0.9); this.byaw = p.yaw; }

  /** GTA-style switch: control jumps to the other deacon, who is standing right beside you */
  switch() {
    const g = this.g; if (g.mode !== 'foot' || !g.input.enabled) return;
    const me = g.isaac, other = this.buddy; const myPos = g.player.pos.clone(), myYaw = g.player.yaw; const held = me.held?.R ?? null;
    g.player.group.remove(me.root); g.engine.scene.remove(other.root); g.engine.scene.add(me.root); g.player.group.add(other.root); other.root.position.set(0, 0, 0); other.root.rotation.y = 0; other.root.scale.setScalar(1);
    g.player.teleport(this.bpos.x, this.bpos.y + 0.05, this.bpos.z, this.byaw); this.bpos.copy(myPos); this.byaw = myYaw; me.stop(); other.stop(); void held;
    g.isaac = other; this.buddy = me; this.active = this.active === 'isaac' ? 'zek' : 'isaac'; this.applyScale(); g.rig.yaw = g.player.yaw; g.rig.snap();
    g.hud.toast(this.active === 'isaac' ? 'Deacon Isaac' : 'Deacon Zekariah', 1.6);
  }
  private zekHuman() { return this.active === 'zek' ? this.g.isaac : this.buddy; }
  private applyScale() { const z = this.zekHuman(), i = this.active === 'zek' ? this.buddy : this.g.isaac; z.root.scale.setScalar(this.demon ? 3.05 / 1.78 : 1); i.root.scale.setScalar(1); this.g.rig.height = this.demon && this.active === 'zek' ? 3.2 : 1.55; }

  onEnterCar(car: Car) { const s = car.seat; this.g.engine.scene.remove(this.buddy.root); car.mesh.add(this.buddy.root); this.buddy.root.position.set(-s.x, s.y - 0.52, s.z); this.buddy.root.rotation.y = Math.PI; this.buddy.seated = true; this.buddy.play('sit', 1, true); this.inCar = car; this.showRadio(); }
  onExitCar(car: Car) { car.mesh.remove(this.buddy.root); this.g.engine.scene.add(this.buddy.root); this.buddy.seated = false; this.buddy.stop(); this.inCar = null; const r = new THREE.Vector3(-1, 0, 0).applyQuaternion(car.quat); this.bpos.copy(car.pos).addScaledVector(r, car.spec.W / 2 + 0.75); this.bpos.y = this.g.world.height(this.bpos.x, this.bpos.z) + 0.1; this.radioEl.style.opacity = '0'; }

  // ---------------------------------------------------------------- radio: every recording Isaac supplied
  radio(dir: number) { const n = RADIO.length; this.radioI = this.radioI < 0 ? (dir > 0 ? 0 : n - 1) : this.radioI + dir; if (this.radioI >= n || this.radioI < 0) { this.radioI = -1; this.g.audio.chant(null); } else this.g.audio.chant(RADIO[this.radioI][0], 0.7); this.g.audio.radioIndex = this.radioI; this.showRadio(); }
  showRadio() { this.radioEl.innerHTML = `<div style="color:#f6e7b8;font-weight:700;margin-bottom:6px">♪ Radio &nbsp;<span style="font-weight:500;opacity:.8">R next · T previous</span></div>` + RADIO.map((r, i) => `<div style="padding:1px 0;${i === this.radioI ? 'color:#ffd75a;font-weight:700' : 'opacity:.75'}">${i === this.radioI ? '▶' : '&nbsp;&nbsp;'} ${r[1]}</div>`).join('') + `<div style="padding:1px 0;${this.radioI < 0 ? 'color:#ffd75a;font-weight:700' : 'opacity:.6'}">${this.radioI < 0 ? '▶' : '&nbsp;&nbsp;'} Off</div>`; this.radioEl.style.opacity = '1'; this.radioT = 6; }

  // ---------------------------------------------------------------- rage and the demon form
  addRage(n: number) { if (this.demon) return; this.rage = Math.min(100, this.rage + n); if (this.rage >= 100 && this.hintT <= 0) { this.g.hud.toast("Zekariah's rage is full — press G", 5); this.hintT = 12; } }
  private demonize(h: Human, on: boolean) {
    h.root.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m && (m as any).emissive) { if (on) { (m as any)._e ??= m.emissive.getHex(); (m as any)._ei ??= m.emissiveIntensity; m.emissive.setHex(0x9a0a04); m.emissiveIntensity = 0.75; } else if ((m as any)._e !== undefined) { m.emissive.setHex((m as any)._e); m.emissiveIntensity = (m as any)._ei; } } });
    if (on) { const hg = new THREE.Group(); const hm = new THREE.MeshStandardMaterial({ color: 0x1a0a08, roughness: 0.4, emissive: 0x400000 }); for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16, 8), hm); c.position.set(s * 0.06, 0.25, 0.01); c.rotation.z = -s * 0.45; hg.add(c); } h.bones.head.add(hg); this.horns = hg; }
    else if (this.horns) { this.horns.parent?.remove(this.horns); this.horns = null; }
  }
  goDemon() {
    const g = this.g; if (this.demon || this.rage < 100 || g.mode !== 'foot') return; if (this.active !== 'zek') this.switch(); if (this.active !== 'zek') return;
    this.demon = true; this.demonize(g.isaac, true); this.applyScale(); g.hud.toast('Zekariah has lost himself. Only nisiha with Qesis Andualem can bring him back.', 6);
    const ch = g.church; const q = new Npc('priest', 1, g.world.season === 'winter'); q.name = 'Qesis Andualem'; q.place(ch.toWorld(1.8, 0.05, -17.5), ch.faceYaw(0, -1)); q.act('holdCross'); g.engine.scene.add(q.human.root); this.qes = q;
  }
  private confess() {
    const g = this.g; if (this.confessing || !this.qes) return; this.confessing = true; const q = this.qes;
    (async () => { g.input.enabled = false; q.face(g.player.pos); q.act('bless'); g.isaac.play('sigdet', 3.4); g.hud.toast('Nisiha — "I have sinned, Abba. Forgive me."', 3.5); await g.wait(3.6); await g.hud.fade(1, 0.8);
      this.demon = false; this.rage = 0; this.demonize(this.zekHuman(), false); this.applyScale(); g.engine.scene.remove(q.human.root); q.human.dispose(); this.qes = null; if (!g.story.running) g.hud.setTarget(null);
      await g.hud.fade(0, 0.8); g.hud.toast('"God has forgiven you. Go in peace."  —  Qesis Andualem', 4.5); g.input.enabled = true; this.confessing = false; })().catch(() => { g.input.enabled = true; this.confessing = false; });
  }
  private ripHead(n: Npc) {
    const hb = n.human.bones.head; if (!hb.visible) return; const wp = hb.getWorldPosition(new THREE.Vector3()); hb.visible = false; (n as any).downT = 1e9; n.human.root.rotation.x = -Math.PI / 2; n.human.root.position.y += 0.25;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: 0.8 })); m.position.copy(wp); this.g.engine.scene.add(m);
    const p = this.g.player; this.heads.push({ m, v: new THREE.Vector3(-Math.sin(p.yaw) * 5 + (Math.random() - 0.5) * 3, 7, -Math.cos(p.yaw) * 5 + (Math.random() - 0.5) * 3), t: 0 }); this.g.isaac.play('reach', 0.8);
  }

  update(dt: number) {
    const g = this.g, inp = g.input, p = g.player; this.hitT -= dt; this.hintT -= dt;
    if (inp.take('switch')) this.switch(); if (inp.take('rage')) this.goDemon();
    if (g.mode === 'car') { if (inp.take('radio')) this.radio(1); if (inp.take('radioPrev')) this.radio(-1); } else { inp.take('radio'); inp.take('radioPrev'); }
    if (this.radioT > 0) { this.radioT -= dt; if (this.radioT <= 0) this.radioEl.style.opacity = '0'; }
    // the other deacon keeps beside you
    if (!this.inCar) {
      const tx = p.pos.x + Math.cos(p.yaw) * 0.95 + Math.sin(p.yaw) * 0.5, tz = p.pos.z - Math.sin(p.yaw) * 0.95 + Math.cos(p.yaw) * 0.5; const dx = tx - this.bpos.x, dz = tz - this.bpos.z, d = Math.hypot(dx, dz);
      if (d > 22 || Math.abs(p.pos.y - this.bpos.y) > 4 || g.mode === 'cutscene' && d > 6) { this.bpos.set(tx, p.pos.y, tz); this.byaw = p.yaw; this.bspeed = 0; }
      else if (d > 0.35) { const sp = Math.min(6.4, Math.max(1.2, d * 2.2)); const st = Math.min(d, sp * dt); this.bpos.x += (dx / d) * st; this.bpos.z += (dz / d) * st; let a = Math.atan2(-dx, -dz) - this.byaw; a = Math.atan2(Math.sin(a), Math.cos(a)); this.byaw += a * Math.min(1, dt * 9); this.bspeed += (sp - this.bspeed) * Math.min(1, dt * 8); }
      else { this.bspeed += (0 - this.bspeed) * Math.min(1, dt * 8); let a = p.yaw - this.byaw; a = Math.atan2(Math.sin(a), Math.cos(a)); this.byaw += a * Math.min(1, dt * 3); }
      const inside = g.church.isInside(p.pos); const gy = inside || d < 2.5 ? p.pos.y : g.world.height(this.bpos.x, this.bpos.z) + 0.1; this.bpos.y += (gy - this.bpos.y) * Math.min(1, dt * 10);
      this.buddy.root.position.copy(this.bpos); this.buddy.root.rotation.y = this.byaw; this.buddy.update(dt, this.bspeed, true);
    } else this.buddy.update(dt, 0, true);
    // crashes: pedestrians are knocked down, traffic is shunted; each one feeds Zekariah's rage
    const car = g.mode === 'car' ? g.activeCar : null;
    if (car && Math.abs(car.speed) > 2.5) {
      const f = car.forward(), sgn = Math.sign(car.speed) || 1;
      for (const e of g.peds.list) { const n = e.npc as any; if (n.downT > 0) continue; const dx = n.pos.x - car.pos.x, dz = n.pos.z - car.pos.z; const along = (dx * f.x + dz * f.z) * sgn, side = Math.abs(dx * f.z - dz * f.x); if (along > -1 && along < car.spec.L / 2 + 0.7 && side < car.spec.W / 2 + 0.35) { n.downT = 7; n.pos.x += f.x * sgn * 1.6; n.pos.z += f.z * sgn * 1.6; n.human.root.position.copy(n.pos); n.human.root.rotation.x = -Math.PI / 2; n.human.root.position.y += 0.2; g.audio.door(); this.addRage(22); const lv = car.body.linvel(); car.body.setLinvel({ x: lv.x * 0.8, y: lv.y, z: lv.z * 0.8 }, true); } }
      if (this.hitT <= 0) for (const a of g.traffic.ai) { const dx = a.car.pos.x - car.pos.x, dz = a.car.pos.z - car.pos.z; if (Math.hypot(dx, dz) < (car.spec.L + a.car.spec.L) / 2 - 0.5 && Math.abs(dx * f.z - dz * f.x) < (car.spec.W + a.car.spec.W) / 2) { a.v = 0; a.wait = 5; const lv = car.body.linvel(); car.body.setLinvel({ x: -lv.x * 0.35, y: lv.y, z: -lv.z * 0.35 }, true); const av = car.body.angvel(); car.body.setAngvel({ x: av.x, y: av.y + (Math.random() - 0.5) * 2.5, z: av.z }, true); g.audio.door(); g.audio.horn(); this.addRage(16); this.hitT = 1.2; break; } }
    }
    // demon form
    if (this.demon) {
      if (this.qes) { this.qes.update(dt); if (!g.story.running || g.story.roaming) g.hud.setTarget({ x: this.qes.pos.x, z: this.qes.pos.z }); }
      if (g.mode === 'foot' && this.active === 'zek' && inp.enabled && !g.story.promptOwner && !this.confessing) {
        const near = this.qes && this.qes.pos.distanceTo(p.pos) < 3.6;
        let victim: Npc | null = null, best = 3.4; if (!near) for (const e of g.peds.list) { const d = e.npc.pos.distanceTo(p.pos); if (d < best && e.npc.human.bones.head.visible) { best = d; victim = e.npc; } }
        if (near) { g.hud.promptRaw('<b>E</b> Nisiha — confess to Qesis Andualem'); if (inp.take('interact')) this.confess(); }
        else if (victim) { g.hud.promptRaw('<b>E</b> Rip'); if (inp.take('interact')) this.ripHead(victim); }
      }
    }
    for (const h of this.heads) { h.t += dt; h.v.y -= 16 * dt; h.m.position.addScaledVector(h.v, dt); h.m.rotation.x += dt * 9; const gy = g.world.height(h.m.position.x, h.m.position.z) + 0.11; if (h.m.position.y < gy) { h.m.position.y = gy; h.v.y *= -0.4; h.v.x *= 0.6; h.v.z *= 0.6; } }
    this.heads = this.heads.filter((h) => { if (h.t > 12) { g.engine.scene.remove(h.m); return false; } return true; });
    this.bar.style.width = `${this.rage}%`; this.who.textContent = `${this.active === 'isaac' ? '● Isaac   ○ Zekariah' : '○ Isaac   ● Zekariah'}   ·   Q switch${this.demon ? '   ·   DEMON' : this.rage >= 100 ? '   ·   G rage' : ''}`;
    this.el.style.display = g.hud.titleOpen || g.mode === 'cutscene' || g.mode === 'photo' ? 'none' : '';
  }
}

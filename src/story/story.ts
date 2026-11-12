// Story engine: async chapter scripts with cancellable helpers (dialogue, objectives, cutscenes, NPC staging).
import * as THREE from 'three/webgpu';
import type { Game } from '../game';
import { Npc, NpcKind } from '../char/npc';
import type { Season } from '../world/materials';
import type { ChurchVariant } from '../church/church';
import type { Outfit } from '../char/human';
import type { Car, CarKind } from '../vehicles/car';
import { CHAPTERS } from './chapters';

export interface Line { sp?: string; spAm?: string; en: string; am?: string }
export interface ChapterDef { id: string; title: string; titleAm: string; desc: string; descAm: string; run: (c: Ctx) => Promise<void> }
class Cancelled extends Error {}
export interface SceneOpts { season: Season; month: number; day: number; hour: number; snowfall?: number; wind?: number; temp?: number; variant?: ChurchVariant; festival?: boolean; era?: 'modern' | 'old'; outfit?: Outfit; traffic?: boolean; clockPaused?: boolean; timeScale?: number; blizzard?: number }

export class Ctx {
  constructor(public g: Game, private story: Story, private token: number) {}
  get dead() { return this.story.token !== this.token; }
  check() { if (this.dead) throw new Cancelled(); }
  /** church-local -> world */
  L(x: number, y: number, z: number) { return this.g.church.toWorld(x, y, z); }
  spot(name: string) { const s = this.g.church.refs.spots[name]; return this.g.church.toWorld(s.x, s.y, s.z); }
  async wait(s: number) { if (this.g.auto) s = Math.min(s, 0.35); let t = 0; while (t < s) { await this.g.nextFrame(); this.check(); t += this.g.dt; } }
  async until(f: () => boolean) { while (!f()) { await this.g.nextFrame(); this.check(); } }
  text(en: string, am?: string) { return this.g.i18n.pick(en, am); }
  obj(en: string, am?: string) { this.g.hud.objective(this.text(en, am)); }

  async say(key: string, hold = false) {
    const l = this.story.dialog[key] ?? { en: key }; const g = this.g; this.check();
    g.hud.subtitle(g.i18n.pick(l.sp ?? '', l.spAm), l.en, l.am); g.input.take('skip'); g.input.take('interact');
    // spoken voice: Amharic if the device has an Amharic voice and that language is selected, otherwise English
    if (!g.auto) { const useAm = g.i18n.lang === 'am' && !!l.am; if (!(useAm && g.audio.speak(l.am!, 'am', l.sp ?? ''))) g.audio.speak(l.en, 'en', l.sp ?? 'narrator'); }
    const dur = this.g.auto ? 0.25 : hold ? 1e9 : 2.2 + l.en.length * 0.072; let t = 0;
    while (t < dur) { await g.nextFrame(); this.check(); t += g.dt; if (t > 0.35 && (g.input.take('skip') || g.input.take('interact'))) break; }
    g.hud.hideSubtitle(); g.audio.hush(); await this.wait(0.12);
  }
  async talk(...keys: string[]) { for (const k of keys) await this.say(k); }

  async scene(o: SceneOpts) {
    const g = this.g; g.weather.snowfall = o.snowfall ?? 0; g.weather.wind = o.wind ?? 0.2; g.weather.tempC = o.temp ?? 20; g.weather.blizzard = o.blizzard ?? 0;
    g.traffic.era = o.era ?? 'modern'; g.traffic.snow = o.season === 'winter'; g.traffic.enabled = o.traffic ?? true; g.peds.winter = o.season === 'winter'; g.peds.enabled = o.traffic ?? true;
    if (g.world.season !== o.season || g.traffic.ai.some((a) => a.car.spec.old !== (o.era === 'old'))) { g.traffic.clear(); g.peds.clear(); }
    g.setSeason(o.season); g.church.setVariant(o.variant ?? 'current', o.festival ?? false, o.season === 'winter');
    g.engine.setDateTime(o.month, o.day, o.hour); g.engine.clockPaused = o.clockPaused ?? false; g.engine.timeScale = o.timeScale ?? 20;
    if (o.outfit) g.setOutfit(o.outfit);
    g.applyWeather();
  }
  /** wait until the streamed world around the player is built */
  async settle(max = 12) { let t = 0; await this.wait(0.3); while (!this.g.world.ready() && t < max) { await this.wait(0.2); t += 0.2; } }

  npc(kind: NpcKind, seed: number, pos: THREE.Vector3, yaw = 0, name = ''): Npc { const n = new Npc(kind, seed, this.g.world.season === 'winter'); n.name = name; n.place(pos, yaw); this.g.engine.scene.add(n.human.root); this.story.npcs.push(n); return n; }
  removeNpc(n: Npc) { this.g.engine.scene.remove(n.human.root); n.human.dispose(); this.story.npcs = this.story.npcs.filter((x) => x !== n); }
  prop(o: THREE.Object3D) { this.g.engine.scene.add(o); this.story.props.push(o); return o; }
  removeProp(o: THREE.Object3D) { this.g.engine.scene.remove(o); this.story.props = this.story.props.filter((x) => x !== o); }

  /** go somewhere (on foot or driving) */
  async reach(p: THREE.Vector3, r = 2.5, needStop = false) {
    const g = this.g; g.hud.setTarget({ x: p.x, z: p.z }); this.story.marker(p);
    if (g.auto) { await this.wait(0.4); if (g.mode === 'car' && g.activeCar) { g.activeCar.place(p.x, g.world.height(p.x, p.z), p.z, g.activeCar.yaw); } else g.player.teleport(p.x, Math.max(p.y, g.world.height(p.x, p.z)) + 0.05, p.z); await this.wait(0.3); }
    await this.until(() => { const f = g.focusPos; return Math.hypot(f.x - p.x, f.z - p.z) < r && (!needStop || g.mode !== 'car' || Math.abs(g.activeCar!.speed) < 1.2); });
    g.hud.setTarget(null); this.story.marker(null);
  }
  /** walk up to a point and press Interact */
  async interact(p: THREE.Vector3, en: string, am?: string, r = 1.7, anim: string | null = 'reach', dur = 1.1) {
    const g = this.g; g.hud.setTarget({ x: p.x, z: p.z }); this.story.marker(p); g.input.take('interact');
    if (g.auto) { await this.wait(0.3); if (g.mode === 'car') g.exitCar(true); g.player.teleport(p.x + 0.4, p.y + 0.05, p.z + 0.3); await this.wait(0.2); g.input.press('interact'); }
    for (;;) { await g.nextFrame(); this.check(); const f = g.player.pos; const near = g.mode === 'foot' && Math.hypot(f.x - p.x, f.z - p.z) < r && Math.abs(f.y - p.y) < 2.2; this.story.promptOwner = near; if (near) g.hud.prompt(this.text(en, am)); if (near && g.input.take('interact')) break; }
    this.story.promptOwner = false; g.hud.prompt(null); g.hud.setTarget(null); this.story.marker(null);
    if (anim) { const dx = p.x - g.player.pos.x, dz = p.z - g.player.pos.z; if (Math.hypot(dx, dz) > 0.3) g.player.yaw = Math.atan2(-dx, -dz); g.isaac.play(anim, dur); g.input.enabled = false; await this.wait(dur * 0.8); g.input.enabled = true; }
  }
  async drive(car: Car) { const g = this.g; g.hud.setTarget({ x: car.pos.x, z: car.pos.z }); this.story.marker(car.pos.clone()); if (g.auto) { await this.wait(0.3); g.player.teleport(car.pos.x + 2, car.pos.y, car.pos.z); g.enterCar(car); } await this.until(() => g.activeCar === car); g.hud.setTarget(null); this.story.marker(null); }
  async onFoot() { if (this.g.auto) this.g.exitCar(true); await this.until(() => this.g.mode === 'foot'); }

  // ---- cutscenes ----
  async cut(fn: () => Promise<void>) {
    const g = this.g; const prev = g.mode; if (g.mode === 'car') g.exitCar(true); g.mode = 'cutscene'; g.input.enabled = false; g.hud.letterbox(true); g.hud.objective(''); g.hud.prompt(null);
    try { await fn(); } finally { if (!this.dead) { g.mode = prev === 'car' ? 'foot' : prev === 'cutscene' ? 'foot' : prev; g.input.enabled = true; g.hud.letterbox(false); g.scriptSpeed = 0; g.rig.snap(); g.input.clearPresses(); } }
  }
  async cam(fp: THREE.Vector3, fl: THREE.Vector3, tp: THREE.Vector3, tl: THREE.Vector3, secs: number, fov = 50) {
    const cam = this.g.engine.camera; let t = 0; cam.fov = fov; cam.updateProjectionMatrix(); const p = new THREE.Vector3(), l = new THREE.Vector3();
    if (this.g.auto) secs = Math.min(secs, 0.6);
    while (t < secs) { const k = THREE.MathUtils.smootherstep(t / secs, 0, 1); p.lerpVectors(fp, tp, k); l.lerpVectors(fl, tl, k); this.g.cutCam = { pos: p.clone(), look: l.clone() }; await this.g.nextFrame(); this.check(); t += this.g.dt; if (this.g.input.keys.has('Enter') && t > 0.5) t += this.g.dt * 6; }
    this.g.cutCam = { pos: tp.clone(), look: tl.clone() };
  }
  /** scripted player walk through points (no physics) */
  async walk(pts: THREE.Vector3[], speed = 1.5) {
    const g = this.g; if (g.auto) speed = 12; g.player.setCollides(false);
    for (const p of pts) { for (;;) { const d = new THREE.Vector3().subVectors(p, g.player.pos); const h = Math.hypot(d.x, d.z); if (h < 0.08) break; const st = Math.min(h, speed * g.dt); const np = g.player.pos.clone(); np.x += (d.x / h) * st; np.z += (d.z / h) * st; np.y += d.y * Math.min(1, st / h); let a = Math.atan2(-d.x, -d.z) - g.player.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); g.player.teleport(np.x, np.y, np.z, g.player.yaw + a * Math.min(1, g.dt * 9)); g.scriptSpeed = speed; await g.nextFrame(); this.check(); } }
    g.scriptSpeed = 0; g.player.setCollides(true);
  }
  async act(name: string, dur: number) { this.g.isaac.play(name, dur); await this.wait(this.g.auto ? 0.2 : dur); }
  place(p: THREE.Vector3, yaw: number) { this.g.player.teleport(p.x, p.y, p.z, yaw); this.g.rig.yaw = yaw + Math.PI; this.g.rig.yaw = yaw; this.g.rig.pitch = 0.16; this.g.rig.snap(); }
  async fadeOut(s = 0.8) { await this.g.hud.fade(1, s); this.check(); }
  async fadeIn(s = 0.8) { await this.g.hud.fade(0, s); this.check(); }
  async title(i: number) { const c = this.story.chapters[i]; await this.g.hud.card(this.text(c.title, c.titleAm), `${this.g.i18n.t('chapter')} ${i + 1}`, 3.6); this.check(); }

  car(kind: CarKind, color: number, p: { x: number; z: number; yaw: number }) { const c = this.g.traffic.spawnCar(kind, color, p.x, p.z, p.yaw, true); this.story.cars.push(c); return c; }
  /** a spot on a residential street roughly `dist` metres from the church in compass sector `sector` (0=N,1=E,2=S,3=W) */
  streetSpot(dist: number, sector: number) {
    const g = this.g, W = g.world, cd = W.data.church; let best = -1, bs = 1e9;
    W.data.nav.nodes.forEach((n, i) => { if (!W.adj[i].length) return; const dx = n[0] - cd.x, dz = n[1] - cd.z; const d = Math.hypot(dx, dz); const ang = (Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2); let da = Math.abs(ang - sector * Math.PI / 2); da = Math.min(da, Math.PI * 2 - da); if (!W.adj[i].some(([, r]) => W.data.roads[r].kind === 'residential' || W.data.roads[r].kind === 'tertiary')) return; const sc = Math.abs(d - dist) + da * 180; if (sc < bs) { bs = sc; best = i; } });
    const n = W.data.nav.nodes[Math.max(0, best)]; const [nb, ri] = W.adj[Math.max(0, best)].find(([, r]) => W.data.roads[r].kind !== 'service') ?? W.adj[Math.max(0, best)][0]; const o = W.data.nav.nodes[nb]; const l = Math.hypot(o[0] - n[0], o[1] - n[1]) || 1; const dx = (o[0] - n[0]) / l, dz = (o[1] - n[1]) / l; const r = W.data.roads[ri];
    const mx = n[0] + dx * Math.min(l * 0.5, 40), mz = n[1] + dz * Math.min(l * 0.5, 40);
    const road = new THREE.Vector3(mx - dz * -(r.w / 4), 0, mz + dx * -(r.w / 4)); road.y = W.height(road.x, road.z);
    const walk = new THREE.Vector3(mx + dz * (r.w / 2 + 2.45), 0, mz - dx * (r.w / 2 + 2.45)); walk.y = W.height(walk.x, walk.z) + 0.14;
    return { road, walk, yaw: Math.atan2(dx, dz), dir: new THREE.Vector3(dx, 0, dz) };
  }
  poi(kind: string, fallbackDist: number, sector: number) { const p = this.g.world.data.pois.find((q) => q.kind === kind); if (!p) return this.streetSpot(fallbackDist, sector); const nr = this.g.world.nearestRoad(p.x, p.z, true, 4); const x = nr.seg ? nr.px : p.x, z = nr.seg ? nr.pz : p.z; const road = new THREE.Vector3(x, this.g.world.height(x, z), z); const dx = p.x - x, dz = p.z - z, l = Math.hypot(dx, dz) || 1; const hw = nr.seg ? nr.seg.hw : 4; const walk = new THREE.Vector3(x + (dx / l) * (hw + 2.45), 0, z + (dz / l) * (hw + 2.45)); walk.y = this.g.world.height(walk.x, walk.z) + 0.14; return { road, walk, yaw: 0, dir: new THREE.Vector3(dx / l, 0, dz / l) }; }
  /** seat an NPC in the player's car (visual only) */
  seat(n: Npc, car: Car, idx = 0) { const s = car.seat; n.visible = true; this.g.engine.scene.remove(n.human.root); car.mesh.add(n.human.root); n.human.root.position.set(idx === 0 ? -s.x : idx === 1 ? s.x : -s.x, s.y - 0.52, idx === 0 ? s.z : s.z - 0.95); n.human.root.rotation.y = Math.PI; n.human.play('sit', 1, true); n.human.seated = true; this.story.seated.add(n); }
  unseat(n: Npc, car: Car, p: THREE.Vector3, yaw = 0) { car.mesh.remove(n.human.root); this.g.engine.scene.add(n.human.root); n.human.seated = false; n.human.stop(); this.story.seated.delete(n); n.place(p, yaw); }
  /** congregation standing in the church; returns the NPCs */
  congregation(count: number, seed = 40, opts: { candles?: boolean } = {}) {
    const refs = this.g.church.refs; const out: Npc[] = []; const men = refs.standing.men, women = refs.standing.women; const faceE = this.g.church.faceYaw(0, 1);
    for (let i = 0; i < count; i++) { const isM = i % 2 === 0; const list = isM ? men : women; const s = list[(i * 5 + (i >> 1) * 3) % list.length]; if (out.some((o) => (o as any)._s === s)) continue; const kinds: NpcKind[] = isM ? ['man', 'elder', 'man', 'kid'] : ['woman', 'elderWoman', 'woman', 'kid']; const n = this.npc(kinds[(i >> 1) % 4], seed + i, this.g.church.toWorld(s.x, s.y, s.z), faceE); (n as any)._s = s; n.fixedY = 1; if (opts.candles) this.giveCandle(n); out.push(n); }
    return out;
  }
  giveCandle(n: Npc | null) { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 6), new THREE.MeshStandardMaterial({ color: 0xf2e6c8 })); c.position.y = 0.12; const f = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), new THREE.MeshStandardMaterial({ color: 0xffe6a0, emissive: 0xffa030, emissiveIntensity: 6 })); f.scale.y = 1.8; f.position.y = 0.26; g.add(c, f); const h = n ? n.human : this.g.isaac; h.hold('R', g, [0, -0.1, 0.04], [0.2, 0, 0]); if (n) n.act('candle'); else this.g.isaac.play('candle', 1, true); return g; }
}

export class Story {
  chapters: ChapterDef[] = CHAPTERS; index = -1; roaming = false; token = 0; npcs: Npc[] = []; props: THREE.Object3D[] = []; cars: Car[] = []; seated = new Set<Npc>(); dialog: Record<string, Line> = {};
  promptOwner = false; private beacon: THREE.Mesh; running = false;
  constructor(private g: Game) {
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
    this.beacon.visible = false; this.beacon.renderOrder = 7; g.engine.scene.add(this.beacon);
  }
  async load() { try { this.dialog = await (await fetch(`${import.meta.env.BASE_URL}story/dialogue.json`)).json(); } catch (e) { console.warn('dialogue missing', e); } }
  marker(p: THREE.Vector3 | null) { this.beacon.visible = !!p; if (p) this.beacon.position.set(p.x, p.y + 15, p.z); }
  cleanup() {
    const g = this.g; for (const n of this.npcs) { n.human.root.parent?.remove(n.human.root); n.human.dispose(); } this.npcs = []; this.seated.clear();
    for (const p of this.props) g.engine.scene.remove(p); this.props = [];
    if (g.mode === 'car') g.exitCar(true);
    for (const c of this.cars) { g.traffic.keep.delete(c); } this.cars = []; g.traffic.clear(true);
    g.weather.clearFires(); g.weather.smokeSources = []; g.audio.chant(null); g.audio.hush(); g.audio.music(null); g.audio.keberoOn = g.audio.tsenatselOn = false; g.audio.setFire(0); g.audio.setCrowd(0);
    const r = g.church.refs; r.setCandles(0); r.censerLit = false; r.streamOn = false; r.umbrellas.visible = true; g.church.doorWant = 0;
    g.hud.objective(''); g.hud.prompt(null); g.hud.hideSubtitle(); g.hud.setTarget(null); g.hud.letterbox(false); g.hud.timer(''); this.marker(null); g.cutCam = null; g.input.enabled = true; g.scriptSpeed = 0; g.shoesOff = false; g.isaac.hold('R', null); g.isaac.hold('L', null); g.isaac.stop();
    g.player.setCollides(true); if (g.mode !== 'photo') g.mode = 'foot'; document.querySelector('.minigame')?.remove();
  }
  abort() { this.token++; this.running = false; this.cleanup(); }
  async start(i: number, withOpening: boolean) {
    this.abort(); const tk = this.token; this.index = i; this.roaming = false; this.running = true; const g = this.g; const c = new Ctx(g, this, tk); (c as any).opening = withOpening;
    try {
      await g.hud.fade(1, 0.4); await this.chapters[i].run(c); if (c.dead) return;
      g.save.unlock(Math.min(i + 1, this.chapters.length - 1)); g.audio.chime();
      await g.hud.card(g.i18n.t('complete'), g.i18n.pick(this.chapters[i].title, this.chapters[i].titleAm), 4);
      if (c.dead) return;
      if (i + 1 < this.chapters.length) this.start(i + 1, false); else { await g.hud.fade(1, 1); this.freeRoam(); }
    } catch (e) { if (!(e instanceof Cancelled)) { console.error('chapter error', e); g.hud.toast('Story error: ' + (e as Error).message, 6); this.freeRoam(); } }
  }
  async freeRoam() {
    this.abort(); const g = this.g; this.roaming = true; this.index = -1; const c = new Ctx(g, this, this.token);
    try { await c.scene({ season: 'summer', month: 7, day: 12, hour: 16, outfit: 'netela', temp: 24 }); const p = g.churchParking(6); c.car('sedan', 0x7d858c, p); c.place(c.spot('stairsBottom'), g.church.faceYaw(0, 1)); await g.hud.fade(0, 0.8); g.hud.toast(g.i18n.pick('Free roam — explore Brandon', 'ነፃ ጉዞ — ብራንደንን ያስሱ'), 4); } catch { /* cancelled */ }
  }
  update(dt: number) { for (const n of this.npcs) if (!this.seated.has(n)) n.update(dt, n.fixedY !== null ? undefined : (x, z) => this.g.world.height(x, z) + (this.g.world.onRoad(x, z) ? 0.05 : 0.14)); else n.human.update(dt, 0, true); if (this.beacon.visible) (this.beacon.material as THREE.MeshBasicMaterial).opacity = 0.16 + 0.08 * Math.sin(this.g.time * 3); }
}

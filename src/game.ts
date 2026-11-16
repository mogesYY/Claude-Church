// Top-level game object: owns all systems and the main loop.
import * as THREE from 'three/webgpu';
import { Engine } from './core/engine';
import { Input } from './core/input';
import { Physics } from './core/physics';
import { I18n } from './core/i18n';
import { Save } from './core/save';
import { Audio } from './core/audio';
import { Player } from './char/player';
import { CameraRig } from './core/camera';
import { World } from './world/world';
import { Weather } from './world/weather';
import { Park } from './world/park';
import type { Season } from './world/materials';
import { Church, CH } from './church/church';
import { Human, Outfit } from './char/human';
import { Duo } from './duo';
import { Pedestrians } from './char/npc';
import { Traffic } from './vehicles/traffic';
import type { Car } from './vehicles/car';
import { Hud } from './ui/hud';
import { Story } from './story/story';
import { PhotoMode } from './photo';

export class Game {
  engine!: Engine; phys!: Physics; input!: Input; player!: Player; rig!: CameraRig; world!: World; church!: Church; isaac!: Human;
  i18n = new I18n(); save = new Save(); audio = new Audio(); weather!: Weather; traffic!: Traffic; peds!: Pedestrians; hud!: Hud; story!: Story; photo!: PhotoMode;
  ready = false; auto = new URLSearchParams(location.search).has('auto');
  mode: 'foot' | 'car' | 'cutscene' | 'photo' = 'foot';
  activeCar: Car | null = null;
  time = 0; dt = 0.016; fps = 60;
  outfit: Outfit = 'netela';
  shoesOff = false; private shoePair!: THREE.Group; private meqdesT = 0; private shoeWarnT = 0;
  scriptSpeed = 0; lightOverride = -1; yardSide = 1;
  cutCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  debugCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  updaters: ((dt: number) => void)[] = [];
  focusPos = new THREE.Vector3();
  park!: Park; facePhoto: HTMLImageElement | null = null; zekPhoto: HTMLImageElement | null = null; photos: Record<string, HTMLImageElement | null> = {}; duo!: Duo; wantPause = false; private jump = false; private last = performance.now(); private waiters: (() => void)[] = []; private shaftT = 0; private wasInside = false; private lowFpsT = 0;

  async boot() {
    const canvas = document.getElementById('game') as HTMLCanvasElement; if (this.auto) document.body.classList.add('auto');
    this.engine = new Engine(canvas); await this.engine.init();
    this.phys = new Physics(); await this.phys.init();
    this.input = new Input(canvas);
    try { await Promise.race([Promise.all([document.fonts.load("700 54px 'Noto Sans Ethiopic'", 'መድኃኔ'), document.fonts.load("600 30px 'Noto Sans'")]), new Promise((r) => setTimeout(r, 4000))]); } catch { /* offline: system fonts */ }
    this.world = new World(this.engine, this.phys); await this.world.load();
    const cd = this.world.data.church;
    this.church = new Church(this.engine, this.phys);
    this.church.place(cd.x, this.world.height(cd.x, cd.z) + 0.02, cd.z, cd.yaw);
    this.world.reserved.push(this.church.lot());
    { // which side of the church has the open yard? (not the side with a street right beside it)
      const side = (sx: number) => { const p = this.church.toWorld(sx * 12, 0, 0); const n = this.world.nearestRoad(p.x, p.z, true, 1); return n.seg ? n.d : 99; }; this.yardSide = side(1) < 10 && side(-1) > side(1) ? -1 : 1; }
    // the trees around the church, placed from Street View: the big elm at the corner, the row along Queens Avenue, the thick growth to the north and behind
    this.world.addTrees([[7.4, -12.6, 1.55, 0], [7.4, -3.5, 1.3, 0], [7.5, 5.5, 1.25, 1], [-9.6, -1.5, 1.35, 0], [-11.6, 3.2, 1.2, 1], [-9.2, 7.5, 1.4, 0], [-11.8, 11, 1.2, 1], [-12.4, -7.5, 1.1, 1], [-4.5, 13.8, 1.3, 0], [3.5, 14.2, 1.2, 1], [-8.8, 14.5, 1.0, 2]].map(([x, z, sc, t]) => { const w = this.church.toWorld(x, 0, z); return [w.x, w.z, sc, t]; }));
    this.park = new Park(this.world, this.phys, this.engine.scene);
    this.weather = new Weather(this.engine);
    this.traffic = new Traffic(this.world, this.phys, this.engine.scene);
    this.peds = new Pedestrians(this.world, this.engine.scene);
    this.player = new Player(this.phys); this.engine.scene.add(this.player.group);
    this.rig = new CameraRig(this.engine.camera, this.phys);
    // Isaac's face: his own front photo projected onto the head (public/char/isaac_face.png, built by tools/make_face.py)
    this.facePhoto = await new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `${import.meta.env.BASE_URL}char/isaac_face.png`; setTimeout(() => res(null), 8000); });
    this.zekPhoto = await new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `${import.meta.env.BASE_URL}char/zekariah_face.png`; setTimeout(() => res(null), 8000); });
    for (const n of ['nigerte', 'nebs']) this.photos[n] = await new Promise<HTMLImageElement | null>((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = `${import.meta.env.BASE_URL}char/${n}_face.png`; setTimeout(() => res(null), 8000); });
    this.setOutfit('netela');
    this.shoePair = new THREE.Group(); for (const dx of [-0.07, 0.07]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.27), new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.7 })); s.position.set(dx, 0.04, 0); this.shoePair.add(s); }
    this.shoePair.position.copy(this.church.toWorld(-2.1, CH.FL, -5.98)); this.shoePair.rotation.y = this.church.group.rotation.y; this.shoePair.visible = false; this.engine.scene.add(this.shoePair);
    this.hud = new Hud(this); this.duo = new Duo(this); this.story = new Story(this); await this.story.load(); this.photo = new PhotoMode(this);
    this.applyQuality();
    // Esc while the mouse is captured only releases the capture (the browser keeps the key): treat that as "pause"
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.ready && !this.hud.phoneOpen && !this.hud.titleOpen && this.mode !== 'photo' && !document.querySelector('.minigame')) this.wantPause = true; });
    addEventListener('blur', () => { if (this.ready && !this.hud.titleOpen && this.mode !== 'photo' && !this.auto) this.wantPause = true; });
    this.phys.onStep.push((dt) => {
      if (this.mode === 'foot') { this.player.step(dt, this.input.state, this.rig.yaw, this.jump); this.jump = false; }
      if (this.mode === 'car' && this.activeCar) this.activeCar.step(dt, this.input.state.throttle, this.input.state.steer, this.input.state.brake);
      this.traffic.fixedStep(dt);
    });
    // start: title over the church front
    const sp = this.church.toWorld(0, 0, -12.4); this.tp(sp.x, sp.z, this.church.faceYaw(0, 1));
    this.setSeason('winter'); this.engine.setDateTime(1, 11, 8.85); this.engine.clockPaused = true; this.weather.snowfall = 0.3; this.weather.tempC = -18; this.applyWeather();
    this.cutCam = { pos: this.church.toWorld(0.6, 1.9, -31), look: this.church.toWorld(0, 7.5, -8) };
    this.engine.renderer.setAnimationLoop(() => this.frame());
    const q = new URLSearchParams(location.search);
    for (let i = 0; i < 40 && !this.world.ready(); i++) await this.wait(0.15);
    this.hud.loading(false); this.ready = true;
    if (q.has('chapter')) this.story.start(Math.max(0, Math.min(2, +q.get('chapter')! - 1)), true); else if (q.has('roam')) this.story.freeRoam(); else this.hud.showTitle();
  }

  // ------------------------------------------------------------------ helpers
  nextFrame() { return new Promise<void>((r) => this.waiters.push(r)); }
  async wait(s: number) { let t = 0; while (t < s) { await this.nextFrame(); t += this.dt; } }
  setOutfit(o: Outfit) { this.outfit = o; const held = this.isaac?.held ?? {}; const parent = this.isaac?.root.parent ?? this.player.group; const pos = this.isaac?.root.position.clone(), rot = this.isaac?.root.rotation.y ?? 0; if (this.isaac) { parent.remove(this.isaac.root); this.isaac.dispose(); } this.isaac = this.duo ? this.duo.make(this.duo.active, o) : new Duo0(this).isaac(o); parent.add(this.isaac.root); this.duo?.rebuildBuddy(o); if (pos) { this.isaac.root.position.copy(pos); this.isaac.root.rotation.y = rot; } if (held.R) this.isaac.hold('R', held.R, held.R.position.toArray() as any, [held.R.rotation.x, held.R.rotation.y, held.R.rotation.z]); if (this.mode === 'car') this.isaac.play('drive', 1, true); }
  setSeason(s: Season) { this.world.setSeason(s); this.park?.setSeason(s); this.engine.applyTime(true); }
  shoeSide = 1;
  setShoes(off: boolean) { this.shoesOff = off; this.shoePair.visible = off; const lp = this.church.toLocal(this.player.pos); this.shoePair.position.copy(this.church.toWorld(-2.1, CH.FL, -5.98)); }
  tp(x: number, z: number, yaw?: number) { this.player.teleport(x, this.world.height(x, z) + 0.05, z, yaw); if (yaw !== undefined) this.rig.yaw = yaw; this.rig.snap(); }
  cam(px?: number, py?: number, pz?: number, lx = 0, ly = 0, lz = 0) { this.debugCam = px === undefined ? null : { pos: new THREE.Vector3(px, py, pz), look: new THREE.Vector3(lx, ly, lz) }; }
  camLocal(px: number, py: number, pz: number, lx: number, ly: number, lz: number) { const a = this.church.toWorld(px, py, pz), b = this.church.toWorld(lx, ly, lz); this.cam(a.x, a.y, a.z, b.x, b.y, b.z); }
  applyQuality() { const q = this.engine.quality; this.world.loadRadius = q === 'ultra' ? 620 : q === 'high' ? 430 : 280; this.traffic.maxAi = q === 'ultra' ? 14 : q === 'high' ? 9 : 4; this.traffic.maxParked = q === 'low' ? 4 : 9; this.peds.max = q === 'ultra' ? 8 : q === 'high' ? 5 : 2; }
  applyWeather() { const w = this.weather; this.engine.fogDensity = 0.0007 + w.snowfall * 0.0022 + w.blizzard * 0.014; this.engine.fogColor.set(this.world.season === 'winter' ? 0xcfd8e4 : 0xa8b8cc); this.engine.setWetness(this.world.season === 'spring' ? 1 : this.world.season === 'winter' ? 0.3 : 0); this.engine.applyTime(true); }
  /** curb-side parking spot on the street in front of the church; `along` metres along the street */
  churchParking(along: number) {
    const cd = this.world.data.church; const fp = this.church.toWorld(0, 0, -22); const nr = this.world.nearestRoad(fp.x, fp.z, true, 2);
    if (!nr.seg) { const p = this.church.toWorld(along, 0, -20); return { x: p.x, z: p.z, yaw: this.church.group.rotation.y + Math.PI / 2 }; }
    const s = nr.seg; const l = Math.hypot(s.bx - s.ax, s.bz - s.az) || 1; const dx = (s.bx - s.ax) / l, dz = (s.bz - s.az) / l; let tx = cd.x - nr.px, tz = cd.z - nr.pz; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const x = nr.px + dx * along + tx * (s.hw - 1.25), z = nr.pz + dz * along + tz * (s.hw - 1.25);
    // face the direction of travel for the lane beside the church: right-hand side = church side
    const right = { x: -dz, z: dx }; const sign = right.x * tx + right.z * tz > 0 ? 1 : -1; return { x, z, yaw: Math.atan2(dx * sign, dz * sign) };
  }
  enterCar(car: Car) {
    if (this.mode !== 'foot') return; this.mode = 'car'; this.activeCar = car; car.occupied = true; car.parked = false; car.enableLamps(this.engine.quality !== 'low'); this.player.setCollides(false);
    this.player.group.remove(this.isaac.root); car.mesh.add(this.isaac.root); this.isaac.root.position.set(car.seat.x, car.seat.y - 0.52, car.seat.z); this.isaac.root.rotation.y = Math.PI; this.isaac.seated = true; this.isaac.play('drive', 1, true);
    const f = car.forward(); this.rig.yaw = Math.atan2(-f.x, -f.z); this.rig.pitch = 0.24; this.rig.snap(); this.audio.door(); if (this.engine.sunElevation < 0.05) car.headlights = true;
    this.duo.onEnterCar(car); if (!this.audio.chantPlaying) { this.duo.radioI = -1; this.duo.radio(1); }   // a mezmur comes on with the engine
  }
  exitCar(force = false) {
    const car = this.activeCar; if (!car) return; if (!force && Math.abs(car.speed) > 2.5) return; if (this.duo.radioI >= 0) { this.duo.radioI = -1; this.audio.radioIndex = -1; this.audio.chant(null); } this.duo.onExitCar(car);
    car.mesh.remove(this.isaac.root); this.player.group.add(this.isaac.root); this.isaac.root.position.set(0, 0, 0); this.isaac.root.rotation.y = 0; this.isaac.seated = false; this.isaac.stop();
    const left = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quat); const p = car.pos.clone().addScaledVector(left, car.spec.W / 2 + 0.75); const f = car.forward();
    this.player.teleport(p.x, Math.max(this.world.height(p.x, p.z), car.pos.y - 0.3) + 0.1, p.z, Math.atan2(-f.x, -f.z)); this.player.setCollides(true);
    car.occupied = false; car.parked = true; car.enableLamps(false); this.activeCar = null; this.mode = this.mode === 'car' ? 'foot' : this.mode; this.audio.setEngine(false); this.audio.door(); this.rig.yaw = this.player.yaw; this.rig.snap();
  }

  // ------------------------------------------------------------------ frame
  frame(force?: number) {
    const now = performance.now(); const dt = force ?? Math.min(0.1, (now - this.last) / 1000); this.last = now; this.dt = dt; this.time += dt;
    this.fps += (1 / Math.max(dt, 0.001) - this.fps) * 0.05;
    const inp = this.input; inp.update();
    // pause menu: Esc / Tab / P (or losing mouse capture) pauses everything; the story and the world stand still
    const canPause = !this.hud.titleOpen && this.mode !== 'photo' && this.ready;
    if (canPause && (inp.take('phone') || inp.take('back') || this.wantPause)) this.hud.togglePhone(this.wantPause ? true : undefined);
    this.wantPause = false;
    if (this.hud.phoneOpen && this.mode !== 'photo') { inp.clearPresses(); this.hud.update(0); this.engine.render(this.debugCam ? this.debugCam.look : this.mode === 'cutscene' && this.cutCam ? this.cutCam.look : this.focusPos); return; }
    const w = this.waiters; this.waiters = []; for (const r of w) r();
    const menu = this.hud.titleOpen;
    if (menu) { inp.take('jump'); inp.take('enter'); inp.take('interact'); inp.state.moveX = inp.state.moveY = inp.state.throttle = inp.state.steer = 0; }
    if (this.mode === 'photo') { this.photo.update(dt); }
    else if (!menu) {
      if (inp.take('jump')) this.jump = true;
      if (this.mode === 'foot') {
        const car = this.traffic.nearest(this.player.pos);
        // the shoe racks always work: shoes off going in, on again going out
        const sp = this.church.refs.spots; const lp = this.church.toLocal(this.player.pos); const atRack = inp.enabled && !this.story.promptOwner && Math.abs(lp.y - CH.FL) < 0.6 && (Math.hypot(lp.x - sp.shoeRack.x, lp.z - sp.shoeRack.z) < 1.25 || Math.hypot(lp.x - sp.shoeRackR.x, lp.z - sp.shoeRackR.z) < 1.25);
        if (atRack) { this.hud.prompt(this.shoesOff ? this.i18n.pick('Put your shoes on', 'ጫማህን አድርግ') : this.i18n.pick('Take off your shoes', 'ጫማህን አውልቅ')); if (inp.take('interact')) { this.isaac.play('shoes', 1.8); this.shoeSide = lp.x > 0 ? 1 : -1; this.setShoes(!this.shoesOff); } }
        else if (car && !this.story.promptOwner && inp.enabled) this.hud.promptRaw(`<b>F</b> ${this.i18n.t('enterCar')} — ${car.spec.name}`); else if (!this.story.promptOwner) this.hud.prompt(null);
        if (inp.take('enter') && car && inp.enabled) this.enterCar(car);
      } else if (this.mode === 'car' && this.activeCar) {
        const c = this.activeCar;
        if (inp.take('enter')) this.exitCar();
        if (inp.take('horn')) { this.audio.horn(); c.honk = 0.5; }
        if (inp.take('lights')) c.headlights = !c.headlights;
        if (inp.take('wipers')) c.wipersOn = !c.wipersOn;
        if (!this.story.promptOwner) this.hud.prompt(null);
      }
    }
    // physics
    const winter = this.world.season === 'winter';
    if (this.activeCar) { const main = this.world.nearestRoad(this.activeCar.pos.x, this.activeCar.pos.z, true, 1); const arterial = main.seg && this.world.data.roads[main.seg.ri].w > 10; this.activeCar.grip = winter ? (arterial ? 0.8 : 0.68) - this.weather.blizzard * 0.12 : this.world.season === 'spring' ? 0.9 : 1; (this.isaac as any).steer = inp.state.steer; }
    this.player.iceSlip = winter && !this.engine.interior ? 0.3 : 0;
    if (this.mode !== 'photo' || !this.photo.tracing) this.phys.update(dt);
    this.player.syncVisual(1);
    if (this.mode === 'car' && this.activeCar) { this.activeCar.sync(); this.focusPos.copy(this.activeCar.pos); this.player.teleport(this.activeCar.pos.x, this.activeCar.pos.y, this.activeCar.pos.z); } else this.focusPos.copy(this.player.group.position);
    // church rules: shoes off inside the nave; clergy may pass into the Meqdes
    const local = this.church.toLocal(this.player.pos);
    const inside = this.church.isInside(this.debugCam ? this.debugCam.pos : this.cutCam && this.mode === 'cutscene' ? this.cutCam.pos : this.mode === 'photo' ? this.engine.camera.position : this.player.pos);
    if (this.mode === 'foot') {
      const inNave = local.z > CH.NZ0 + 0.35 && Math.abs(local.x) < CH.HW && local.y > CH.F - 0.3 && local.z < CH.NZ1;
      if (inNave && !this.shoesOff) { const p = this.church.toWorld(-0.9, CH.FL, -7.9); this.player.teleport(p.x, p.y, p.z); if (this.time - this.shoeWarnT > 3) { this.hud.toast(this.i18n.t('shoesFirst'), 3); this.shoeWarnT = this.time; } }
      // (Isaac is a deacon: he may enter the Meqdes by the side doorway)
      if (!this.church.isInside(this.player.pos) && this.shoesOff && local.z < CH.TZ0 - 1.5) this.setShoes(false);
    }
    if (inside !== this.engine.interior) { this.engine.interior = inside; this.engine.applyTime(); this.shaftT = 0; }
    const night = 1 - THREE.MathUtils.smoothstep(this.engine.sunElevation, -0.08, 0.1);
    this.church.refs.setLights(this.lightOverride >= 0 ? this.lightOverride : 0.7 + 0.3 * night);
    this.church.update(dt, this.player.pos, this.time);
    // characters
    this.isaac.wind = this.engine.interior ? 0 : this.weather.wind; if (this.mode === 'car') this.isaac.play('drive', 1, true);
    this.isaac.update(dt, this.mode === 'foot' ? this.player.speed : this.mode === 'cutscene' ? this.scriptSpeed : 0, this.mode !== 'foot' || this.player.grounded);
    if (!menu) this.duo.update(dt);
    for (const u of this.updaters.slice()) u(dt);
    this.story.update(dt);
    const f = this.focusPos;
    const obstacles = [{ x: this.player.pos.x, z: this.player.pos.z, r: this.mode === 'car' ? 1.6 : 0.4 }, ...this.traffic.parked.filter((c) => c.occupied).map((c) => ({ x: c.pos.x, z: c.pos.z, r: 1.6 }))];
    this.traffic.update(dt, f.x, f.z, obstacles, night); this.peds.update(dt, f.x, f.z);
    this.world.update(f.x, f.z, dt); this.world.mats.setNight(night);
    // camera
    const cam = this.engine.camera;
    if (this.debugCam) { cam.position.copy(this.debugCam.pos); cam.lookAt(this.debugCam.look); }
    else if (this.mode === 'cutscene' || (this.cutCam && (this.hud.titleOpen || !this.ready))) { if (this.cutCam) { cam.position.copy(this.cutCam.pos); cam.lookAt(this.cutCam.look); } }
    else if (this.mode === 'car' && this.activeCar) { const fw = this.activeCar.forward(); this.rig.updateCar(dt, this.activeCar.pos, Math.atan2(-fw.x, -fw.z), this.activeCar.speed, menu ? 0 : inp.state.lookX, menu ? 0 : inp.state.lookY, inp.wheel); if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); } }
    else if (this.mode === 'foot') { this.rig.updateFoot(dt, this.player.group.position, menu ? 0 : inp.state.lookX, menu ? 0 : inp.state.lookY, inp.wheel, this.engine.interior); if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); } }
    inp.wheel = 0;
    // light shafts through the windows (inside, daytime)
    this.shaftT -= dt; if (this.shaftT <= 0) { this.shaftT = 20; const sd = this.engine.sunDir; const ls = this.church.toLocal(this.church.toWorld(0, 0, 0).add(sd)).sub(new THREE.Vector3(0, 0, 0)); const lx = this.church.toLocal(sd.clone().add(this.church.group.position)).x; void ls; const side = lx > 0 ? 1 : -1; const wins = CH.WIN_Z.filter((z) => z < CH.PZ).map((z) => ({ pos: this.church.toWorld(side * (CH.HW - 0.25), CH.F + 1.6, z), w: 0.7, h: 1.3 })); this.weather.setShafts(wins, sd, this.engine.interior && Math.abs(lx) > 0.25 ? 1 : 0); }
    const head = this.mode === 'foot' ? this.player.pos.clone().add(new THREE.Vector3(-Math.sin(this.player.yaw) * 0.15, 1.68, -Math.cos(this.player.yaw) * 0.15)) : null;
    this.weather.update(dt, cam, this.time, head, this.engine.interior);
    // audio
    if (this.mode === 'car' && this.activeCar) this.audio.setEngine(true, this.activeCar.speed, inp.state.throttle, winter || this.world.season === 'spring' ? 1 : 0);
    this.audio.update(dt, { wind: this.weather.wind + this.weather.blizzard * 0.5, interior: this.engine.interior, walking: this.mode === 'foot' && this.player.grounded ? this.player.speed : this.mode === 'cutscene' ? this.scriptSpeed : 0, snow: winter, day: night < 0.5 });
    this.hud.update(dt);
    // adaptive quality: if the frame rate stays very low, step the preset down once
    if (this.ready && this.fps < 20 && this.mode !== 'photo' && !new URLSearchParams(location.search).has('q')) { this.lowFpsT += dt; if (this.lowFpsT > 8 && this.engine.quality !== 'low') { this.engine.setQuality(this.engine.quality === 'ultra' ? 'high' : 'low'); this.applyQuality(); this.lowFpsT = 0; } } else this.lowFpsT = 0;
    if (this.mode === 'photo' && this.photo.tracing) return;
    this.engine.tick(dt); this.engine.render(this.debugCam ? this.debugCam.look : this.mode === 'cutscene' && this.cutCam ? this.cutCam.look : this.mode === 'photo' ? cam.position : f);
  }
}

import { makeIsaac as _mkIsaac } from './char/human';
/** used only for the very first build of Isaac, before the Duo exists */
class Duo0 { constructor(private g: Game) {} isaac(o: Outfit) { return _mkIsaac(o, this.g.save.data.moustache, this.g.facePhoto); } }

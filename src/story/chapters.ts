// The five chapters of one church year. Dialogue text lives in public/story/dialogue.json (editable, EN + AM).
// Rules kept throughout: reverent tone; the Tabot is only ever shown covered; only clergy pass the curtain.
import * as THREE from 'three/webgpu';
import type { ChapterDef, Ctx } from './story';
import type { Npc } from '../char/npc';
import { censerMesh, keberoMesh, maqomiyaMesh, umbrellaMesh } from '../church/interior';
import { CH } from '../church/church';
import { Geo, canvasTex, mulberry } from '../core/geo';

const F = CH.F;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------- shared props ----------
function demeraMesh() {
  const g = new THREE.Group(); const geo = new Geo(); const r = mulberry(7);
  for (let i = 0; i < 46; i++) { const a = r() * 6.283, rad = 0.25 + r() * 0.85, h = 2.6 + r() * 1.0; geo.beam([Math.cos(a) * rad, 0, Math.sin(a) * rad], [Math.cos(a) * rad * 0.12, h, Math.sin(a) * rad * 0.12], 0.035 + r() * 0.03, new THREE.Color().setHSL(0.08, 0.35, 0.18 + r() * 0.12)); }
  geo.box(0, 2.3, 0, 0.09, 4.6, 0.09, 0x5a3a22); geo.box(0, 4.25, 0, 0.9, 0.09, 0.09, 0x5a3a22); // central pole + cross
  for (let i = 0; i < 70; i++) { const a = r() * 6.283, y = 0.5 + r() * 3.6, rad = (1.05 - y * 0.24) * (0.8 + r() * 0.3); geo.box(Math.cos(a) * rad, y, Math.sin(a) * rad, 0.09, 0.09, 0.09, i % 5 ? 0xf2c81a : 0xf7e27a); } // adey abeba (yellow Meskel daisies)
  for (let i = 0; i < 30; i++) { const a = r() * 6.283; geo.beam([Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15], [Math.cos(a) * 1.3, 0.5 + r() * 0.3, Math.sin(a) * 1.3], 0.02, 0x3f7a3a); }
  g.add(geo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }))); return g;
}
function branchPile() { const geo = new Geo(); const r = mulberry(3); for (let i = 0; i < 9; i++) geo.beam([-0.6 + r() * 0.2, 0.06 + r() * 0.2, (r() - 0.5) * 0.4], [0.6 + r() * 0.2, 0.06 + r() * 0.25, (r() - 0.5) * 0.4], 0.04, new THREE.Color().setHSL(0.08, 0.35, 0.2 + r() * 0.1)); return geo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })); }
/** The Tabot is never shown: this is only its brocade covering, as carried on the priest's head. */
function coveredTabot() {
  const tex = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#7a1522'; c.fillRect(0, 0, w, h); c.fillStyle = '#d9b03a'; for (let y = 12; y < h; y += 26) for (let x = 12 + ((y / 26) % 2) * 13; x < w; x += 26) { c.fillRect(x - 1.5, y - 7, 3, 14); c.fillRect(x - 6, y - 3, 12, 3); } c.fillRect(0, h - 10, w, 10); });
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }); const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.4), m); const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.4, 0.32, 14, 1, true), m); drape.position.y = -0.18; drape.scale.z = 0.82; g.add(top, drape); return g;
}
function waterBasin() { const g = new THREE.Group(); const geo = new Geo(); geo.box(0, 0.4, 0, 1.5, 0.8, 1.0, 0xf2efe6); geo.box(0, 0.81, 0, 1.56, 0.02, 1.06, 0xc8a23a); g.add(geo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }))); const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.3, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide })); tub.position.y = 0.97; const w = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshStandardMaterial({ color: 0x4a7a9a, roughness: 0.05, metalness: 0.4 })); w.rotation.x = -Math.PI / 2; w.position.y = 1.08; g.add(tub, w); return g; }
function photoProp(color = 0xe8dcc0) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.01), new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: 0xffe0a0, emissiveIntensity: 0.25 })); m.position.y = 1.2; m.rotation.x = -0.3; g.add(m); return g; }

/** opening shot: slow push-in on the church front; `spring` mirrors it for the ending */
async function pushIn(c: Ctx, secs = 10) { await c.cam(c.L(0.6, 1.9, -31), c.L(0, 7.5, -8), c.L(0.2, 3.0, -19), c.L(0, 8.6, -7), secs, 42); }
/** everybody leaves through the front doors and spreads along the walk */
function exodus(c: Ctx, people: Npc[]) {
  c.g.church.doorWant = 1; const r = mulberry(9);
  people.forEach((n, i) => { n.fixedY = 1; n.human.stop(); n.idle = i % 3 === 0 ? 'talk' : ''; n.place(c.L(0, F, -6.6 + (i % 2) * 0.5), c.g.church.faceYaw(0, -1)); n.visible = false; n.human.root.visible = false;
    setTimeout(() => { if (c.dead) return; n.visible = true; n.speed = 1.0 + r() * 0.35; const side = (i % 2 ? 1 : -1) * (1.2 + r() * 6.5); n.walkTo(c.L((r() - 0.5) * 0.8, F, -9.2), c.L((r() - 0.5) * 1.2, 0.02, -12.6), c.L(side * 0.4, 0.02, -14.5 - r() * 2), c.L(side, 0.02, -15 - r() * 5)); }, i * 850); });
}
async function shoesStep(c: Ctx) { const g = c.g; if (g.shoesOff) return; c.obj('Remove your shoes at the rack inside the door', 'በሩ አጠገብ ጫማህን አውልቅ'); await c.interact(c.spot('shoeRack'), 'Remove shoes', 'ጫማ አውልቅ', 1.5, 'shoes', 1.8); g.setShoes(true); }
const yawTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(-(to.x - from.x), -(to.z - from.z));

// =====================================================================================================
async function kidan(c: Ctx) {
  const g = c.g, ch = g.church, R = ch.refs;
  await c.scene({ season: 'winter', month: 1, day: 11, hour: 8.72, snowfall: 0.3, wind: 0.25, temp: -18, outfit: 'netelaPuffer', timeScale: 14 });
  const car = c.car('sedan', 0x7d858c, g.churchParking(7));
  c.place(c.spot('stairsBottom'), ch.faceYaw(0, 1));
  const qes = c.npc('priest', 1, c.spot('priest'), ch.faceYaw(0, -1), 'Qes'); qes.fixedY = 1; qes.act('holdCross');
  g.cutCam = { pos: c.L(0.6, 1.9, -31), look: c.L(0, 7.5, -8) }; await c.settle();
  // ---- Opening: before dawn, light snow; the camera pushes in on the church front ----
  await c.cut(async () => {
    g.audio.bell(520, 0.5); c.fadeIn(2.5).catch(() => {}); g.hud.card(c.text('MEDHANE ALEM', 'መድኃኔ ዓለም'), c.text("A Deacon's Year · Brandon, Manitoba", 'የአንድ ዲያቆን ዓመት · ብራንደን፣ ማኒቶባ'), 6);
    await pushIn(c, 11);
    await c.cam(c.L(0.2, 3.0, -19), c.L(0, 8.6, -7), c.L(-2.6, 1.5, -15.2), c.L(0, 1.5, -12.4), 3, 42);
    await c.act('cross', 2.8);
    const up = c.walk([c.L(0, 0.3, -11.9), c.L(0, F, -9.9), c.L(0, F, -8.95)], 1.05);
    await c.cam(c.L(-2.6, 1.5, -15.2), c.L(0, 1.5, -12.4), c.L(-2.2, 2.6, -11.6), c.L(0, F + 1.5, -8.9), 5, 42); await up;
    await c.act('kiss', 2.4); g.audio.door();
  });
  c.place(c.L(0, F, -8.95), ch.faceYaw(0, 1));
  await c.title(0);
  // ---- inside: shoes, greet the Qes, prepare ----
  await shoesStep(c);
  c.obj('Greet the Qes at the front of the church', 'ቄሱን ሰላም በል');
  await c.interact(c.L(0.1, F, 2.2), 'Greet the Qes', 'ቄሱን ሰላም በል', 1.8, 'bow', 1.6); qes.face(g.player.pos);
  await c.talk('c1.qes.greet', 'c1.isaac.greet', 'c1.qes.tasks');
  c.obj('Light the candles on both stands', 'በሁለቱም መቅረዞች ላይ ሻማዎቹን አብራ');
  await c.interact(c.spot('candleL'), 'Light the candles', 'ሻማ አብራ'); R.setCandles(3);
  await c.interact(c.spot('candleR'), 'Light the candles', 'ሻማ አብራ'); R.setCandles(6);
  c.obj('Ready the censer', 'ጽናውን አዘጋጅ');
  await c.interact(c.spot('censer'), 'Light the charcoal and add incense', 'ከሰሉን አቀጣጥል፣ ዕጣን ጨምር'); R.censerLit = true;
  g.weather.smokeSources.push({ pos: ch.toWorld(-1.85, F + 0.18 + 0.72, CH.PZ - 0.5), rate: 5, acc: 0 });
  c.obj('Check the livestream camera at the back', 'የቀጥታ ስርጭት ካሜራውን ፈትሽ');
  await c.interact(c.spot('camera'), 'Start the @EOTCBrandon stream', 'ስርጭቱን ጀምር'); R.streamOn = true; g.hud.toast(c.text('Livestream is on', 'ቀጥታ ስርጭት ተጀምሯል'));
  await c.talk('c1.qes.ride', 'c1.isaac.ride');
  // ---- drive the elder to church through the snow ----
  const home = c.streetSpot(430, 1);
  const elder = c.npc('elder', 5, home.walk, 0, 'Ato Tesfaye'); elder.face(home.road); elder.act('wave');
  c.obj('Go outside and get in your car (F)', 'ወደ ውጭ ውጣና መኪናህ ውስጥ ግባ (F)'); await c.drive(car);
  g.hud.toast(c.text('W/S drive · A/D steer · Space brake · L lights · V wipers — the roads are icy', 'W/S መንዳት · A/D መሪ · Space ፍሬን — መንገዱ በረዶ ነው'), 8);
  c.obj('Drive to Ato Tesfaye’s house — brake early, it is slippery', 'ወደ አቶ ተስፋዬ ቤት ንዳ — ቀስ ብለህ'); await c.reach(home.road, 9, true);
  await c.talk('c1.elder.hello'); await c.fadeOut(0.5); c.seat(elder, car, 0); await c.fadeIn(0.5);
  await c.talk('c1.elder.car');
  const park = g.churchParking(7); const pv = V(park.x, g.world.height(park.x, park.z), park.z);
  c.obj('Drive back to the church before the Kidase begins', 'ቅዳሴ ከመጀመሩ በፊት ወደ ቤተ ክርስቲያን ተመለስ');
  let left = 240; const tick = (dt: number) => { left -= dt; g.hud.timer(left > 0 ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` : ''); }; g.updaters.push(tick);
  try { await c.reach(pv, 10, true); } finally { g.updaters.splice(g.updaters.indexOf(tick), 1); g.hud.timer(''); }
  await c.say(left > 0 ? 'c1.elder.ontime' : 'c1.elder.late');
  c.obj('Get out (F) and go in with Ato Tesfaye', 'ውረድ (F)፣ ከአቶ ተስፋዬ ጋር ግባ'); await c.onFoot();
  c.unseat(elder, car, c.L(1.2, 0.02, -15), ch.faceYaw(0, 1)); elder.fixedY = 1; elder.speed = 0.95;
  elder.walkTo(c.L(0.3, 0.02, -12.6), c.L(0.3, F, -9.2), c.L(0.2, F, -6.5), c.L(-0.4, F, -4.4), c.L(-1.6, F, -1.0)).then(() => { elder.yaw = ch.faceYaw(0, 1); elder.act('pray'); });
  await c.reach(c.spot('vestibule'), 1.6); await shoesStep(c);
  // ---- the Kidase ----
  const people = c.congregation(g.engine.quality === 'low' ? 8 : 16, 40);
  const chanters = R.standing.chanters.slice(0, 4).map((s, i) => { const n = c.npc(i < 2 ? 'deacon' : 'man', 80 + i, ch.toWorld(s.x, s.y, s.z), ch.faceYaw(s.x > 0 ? -0.6 : 0.6, 1)); n.fixedY = 1; n.human.hold('R', maqomiyaMesh(), [0, -1.02, 0.05]); n.act('chant'); return n; });
  qes.place(c.spot('curtain'), ch.faceYaw(0, -1)); qes.act('bless');
  c.obj('Take your place beside the Qes to serve', 'ለማገልገል ከቄሱ አጠገብ ቁም'); await c.reach(c.spot('deacon'), 1.0);
  await c.cut(async () => {
    c.place(c.spot('deacon'), ch.faceYaw(0.3, -1)); const cs = censerMesh(); g.isaac.hold('R', cs, [0, -0.02, 0.03]); g.isaac.play('censer', 1, true); (cs.getObjectByName('ember') as any).material.emissiveIntensity = 2.5;
    g.weather.smokeSources.push({ pos: ch.toWorld(-0.75, F + 0.75, CH.PZ - 1.75), rate: 9, acc: 0 });
    g.audio.chant('kidase_opening'); g.audio.tsenatselOn = true; g.audio.bell(660);
    await c.cam(c.L(0, F + 1.7, -4.9), c.L(0, F + 1.5, 5), c.L(0, F + 1.9, -1.5), c.L(0, F + 1.6, 5.5), 8, 55); c.say('c1.kidase.1').catch(() => {});
    await c.cam(c.L(3.2, F + 1.5, 2.2), c.L(-1, F + 1.4, 4.6), c.L(2.4, F + 1.6, 4.2), c.L(-1.2, F + 1.5, 5.2), 7, 45);
    c.say('c1.kidase.2').catch(() => {}); await c.cam(c.L(-3.4, F + 1.6, -2.5), c.L(1.5, F + 1.3, 0.5), c.L(-3.2, F + 1.7, 1.5), c.L(1.5, F + 1.3, 2.5), 7, 50);
    await c.cam(c.L(0.9, F + 1.75, 4.1), c.L(-0.9, F + 1.55, 5.0), c.L(0.6, F + 1.7, 4.4), c.L(-0.9, F + 1.5, 5.0), 5, 40);
    await c.fadeOut(1.2); g.audio.chant(null); g.audio.tsenatselOn = false; g.isaac.hold('R', null); g.isaac.stop();
    // ---- the congregation spills out of the front doors ----
    g.weather.snowfall = 0.15; g.engine.setDateTime(1, 11, 11.6); g.weather.smokeSources = [];
    for (const n of chanters) n.human.hold('R', null); c.place(c.L(-1.6, 0.02, -14.2), ch.faceYaw(0.3, 1)); g.isaac.play('talk', 1, true);
    exodus(c, [...people, ...chanters, elder]); g.audio.setCrowd(1); g.audio.bell(520);
    g.cutCam = { pos: c.L(4.5, 1.7, -19), look: c.L(0, 2.6, -9) }; await c.fadeIn(1);
    c.say('c1.end').catch(() => {}); await c.cam(c.L(4.5, 1.7, -19), c.L(0, 2.6, -9), c.L(1.2, 2.4, -24), c.L(0, 4.5, -8), 13, 45);
    await c.fadeOut(1); g.audio.setCrowd(0); g.isaac.stop();
  });
}

// =====================================================================================================
async function hamer(c: Ctx) {
  const g = c.g, ch = g.church;
  await c.scene({ season: 'summer', month: 6, day: 20, hour: 18.2, temp: 22, outfit: 'netela', timeScale: 10 });
  const car = c.car('hatchback', 0x2f5f8a, g.churchParking(7));
  c.place(c.spot('aisleBack'), ch.faceYaw(0, 1)); g.setShoes(true);
  const elder = c.npc('elder', 5, c.L(-1.6, F, -1.0), ch.faceYaw(1, 0.3), 'Ato Tesfaye'); elder.fixedY = 1; elder.act('talk');
  await c.settle(); await c.fadeIn(); await c.title(1);
  c.obj('Sit with Ato Tesfaye and listen', 'ከአቶ ተስፋዬ ጋር ተቀመጥና አዳምጥ'); await c.interact(c.L(-0.6, F, -1.0), 'Listen to the story', 'ታሪኩን አዳምጥ', 1.8, null);
  await c.talk('c2.elder.1', 'c2.elder.2', 'c2.isaac.1', 'c2.elder.3');
  // ---- flashback A: the brown tower years (autumn) ----
  await c.fadeOut(1.2);
  await c.scene({ season: 'autumn', month: 10, day: 6, hour: 15.5, temp: 9, variant: 'brownTower', era: 'old', outfit: 'casual', wind: 0.4 }); g.setShoes(false);
  c.place(c.L(-4, 0.02, -17), ch.faceYaw(0.2, 1)); const founder = c.npc('man', 21, c.L(1.5, 0.02, -14.5), ch.faceYaw(-0.5, -1), 'Founder'); founder.act('talk');
  const oldCar = c.car('oldwagon', 0x7a5a3a, g.churchParking(-8));
  await c.settle(); await c.fadeIn(1.2); g.hud.card(c.text('Years ago', 'ከዓመታት በፊት'), c.text('A small wooden church on 5th Street', 'በ5ኛው ጎዳና ላይ ያለች ትንሽ የእንጨት ቤተ ክርስቲያን'), 3.5);
  c.obj('Talk to the founder in front of the church', 'ከመሥራቹ ጋር ተነጋገር'); await c.interact(c.L(0.6, 0.02, -15.4), 'Talk', 'ተነጋገር', 2, null); await c.talk('c2.founder.1', 'c2.founder.2');
  c.obj('Carry the hymn books from the station wagon to the door (3)', 'የመዝሙር መጻሕፍቱን ከመኪናው ወደ በሩ አድርስ (3)');
  for (let i = 0; i < 3; i++) { await c.interact(oldCar.pos.clone(), 'Pick up a box', 'ሳጥን አንሳ', 3.2, 'reach'); g.isaac.play('carry', 1, true); await c.interact(c.L(0, F, -9.4), 'Set it down', 'አስቀምጥ', 1.6, null); g.isaac.stop(); g.audio.step(false); }
  await c.say('c2.founder.3');
  // ---- flashback B: the blue tower and the flag (winter) ----
  await c.fadeOut(1.2);
  await c.scene({ season: 'winter', month: 1, day: 19, hour: 13.5, temp: -22, variant: 'blueFlag', era: 'old', outfit: 'netelaPuffer', snowfall: 0.2 });
  c.removeNpc(founder); c.place(c.L(3, 0.02, -16.5), ch.faceYaw(-0.2, 1)); const mother = c.npc('woman', 23, c.L(-1.4, 0.02, -14.8), ch.faceYaw(0.4, -1), 'Emama'); mother.act('talk');
  await c.settle(); await c.fadeIn(1.2); g.hud.card(c.text('The blue tower', 'ሰማያዊው ግንብ'), c.text('The flag goes up for Timket', 'ለጥምቀት ሰንደቅ ዓላማው ተሰቀለ'), 3.5);
  await c.interact(c.L(-0.6, 0.02, -15.6), 'Talk', 'ተነጋገር', 2, null); await c.talk('c2.mother.1');
  c.obj('Shovel the wooden steps (3 spots)', 'የእንጨት ደረጃዎቹን ከበረዶ አጽዳ (3)');
  for (const p of [c.L(0, 0.05, -12.3), c.L(0.5, 0.6, -11.3), c.L(-0.4, F, -9.5)]) { await c.interact(p, 'Shovel', 'አካፋ', 1.5, null); g.isaac.play('shovel', 2.4); await c.wait(2.4); }
  await c.say('c2.mother.2');
  // ---- present: collect photos and stories across town ----
  await c.fadeOut(1.2);
  await c.scene({ season: 'summer', month: 6, day: 21, hour: 11, temp: 24, outfit: 'netela', timeScale: 10 }); c.removeNpc(mother);
  c.place(c.L(-1.5, 0.02, -15), ch.faceYaw(0, -1)); await c.settle(); await c.fadeIn();
  await c.say('c2.isaac.2');
  const stops: [ReturnType<Ctx['poi']>, string, string, 'elderWoman' | 'elder' | 'man' | 'woman'][] = [[c.poi('university', 900, 3), 'c2.photo.1', '1998', 'man'], [c.poi('grocery', 700, 0), 'c2.photo.2', '2004', 'elderWoman'], [c.streetSpot(520, 2), 'c2.photo.3', '2011', 'elder'], [c.streetSpot(380, 1), 'c2.photo.4', '2019', 'woman']];
  let n = 0; for (const [sp, key, year, kind] of stops) {
    const who = c.npc(kind, 30 + n, sp.walk, 0); who.face(sp.road); who.act('wave'); const ph = c.prop(photoProp()); ph.position.copy(sp.walk).add(V(0.5, 0, 0.3));
    c.obj(`Collect old photos and stories (${n}/4) — drive to the marker`, `የድሮ ፎቶዎችና ታሪኮች ሰብስብ (${n}/4)`); await c.reach(sp.road, 16, true); await c.interact(sp.walk, 'Ask about the old days', 'ስለ ድሮው ጠይቅ', 2.4, null);
    who.face(g.player.pos); who.act('talk'); await c.say(key); g.save.data.photos.push(year); c.removeProp(ph); g.audio.chime(); n++;
  }
  c.obj('Return to the church to edit the anniversary video', 'የምሥረታ በዓል ቪዲዮውን ለማዘጋጀት ወደ ቤተ ክርስቲያን ተመለስ');
  await c.reach(c.spot('stairsBottom'), 14, true); if (g.mode === 'car') { c.obj('Get out of the car (F)', 'ከመኪናው ውረድ (F)'); await c.onFoot(); }
  await c.reach(c.spot('vestibule'), 1.6); await shoesStep(c); await c.interact(c.L(-2.9, F, -4.3), 'Open the laptop', 'ላፕቶፑን ክፈት', 1.8, null);
  await videoEditor(c); await c.say('c2.end'); void car; await c.fadeOut();
}
/** mini-game: put the clips in order on the timeline */
function videoEditor(c: Ctx): Promise<void> {
  const g = c.g; const clips = [['1998', 'First prayers in a living room', 'በመኖሪያ ቤት የመጀመሪያ ጸሎት'], ['2004', 'The wooden church on 5th Street', 'በ5ኛው ጎዳና የእንጨት ቤተ ክርስቲያን'], ['2011', 'The blue tower and the flag', 'ሰማያዊው ግንብና ሰንደቅ ዓላማ'], ['2019', 'The gold dome is raised', 'የወርቅ ጉልላቱ ተሰቀለ'], ['Today', 'Sunday Kidase, live on @EOTCBrandon', 'የእሑድ ቅዳሴ በቀጥታ']];
  let order = [3, 0, 4, 2, 1]; let sel = -1; g.input.wantLock = false; document.exitPointerLock?.(); g.input.enabled = false;
  const el = document.createElement('div'); el.className = 'minigame'; el.style.cssText = 'position:absolute;inset:0;background:rgba(6,8,12,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:auto;padding:16px';
  g.hud.root.append(el);
  return new Promise<void>((res, rej) => {
    const iv = setInterval(() => { if (c.dead) { clearInterval(iv); el.remove(); g.input.wantLock = true; g.input.enabled = true; rej(new Error('cancelled')); } }, 300);
    const draw = () => {
      const ok = order.every((v, i) => v === i);
      el.innerHTML = `<div style="font-size:22px;color:#f6e7b8">${c.text('Anniversary video — arrange the clips from oldest to newest', 'የምሥረታ በዓል ቪዲዮ — ቅንጥቦቹን ከድሮ ወደ አሁን አስተካክል')}</div><div style="opacity:.7;font-size:14px">${c.text('Click two clips to swap them', 'ለመቀያየር ሁለት ቅንጥቦችን ይጫኑ')}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${order.map((v, i) => `<button data-i="${i}" class="${i === sel ? 'on' : ''}" style="width:150px;height:110px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;${ok ? 'border-color:#5ad07a' : ''}"><b style="font-size:20px">${ok ? clips[v][0] : '▶ ' + (i + 1)}</b><span style="font-size:13px">${c.text(clips[v][1], clips[v][2])}</span></button>`).join('')}</div>
      ${ok ? `<button data-done="1" style="font-size:18px">${c.text('Upload to @EOTCBrandon', 'ወደ @EOTCBrandon ጫን')}</button>` : `<div style="font-size:13px;opacity:.6">${c.text('Hint: living room → wooden church → blue tower → gold dome → today', 'ፍንጭ፦ መኖሪያ ቤት → የእንጨት ቤተ ክርስቲያን → ሰማያዊ ግንብ → የወርቅ ጉልላት → ዛሬ')}</div>`}`;
      el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const d = (b as HTMLElement).dataset; if (d.done) { clearInterval(iv); el.remove(); g.input.wantLock = true; g.input.enabled = true; g.audio.chime(); res(); return; } const i = +d.i!; if (sel < 0) sel = i; else { [order[sel], order[i]] = [order[i], order[sel]]; sel = -1; g.audio.step(false); } draw(); }));
    };
    if (g.auto) setTimeout(() => (window as any).__solveVideo?.(), 500);
    draw(); (window as any).__solveVideo = () => { order = [0, 1, 2, 3, 4]; draw(); (el.querySelector('[data-done]') as HTMLElement)?.click(); };
  });
}

// =====================================================================================================
async function meskel(c: Ctx) {
  const g = c.g, ch = g.church;
  await c.scene({ season: 'autumn', month: 9, day: 27, hour: 14, temp: 12, outfit: 'netela', wind: 0.35, timeScale: 12 });
  const car = c.car('pickup', 0xe8e8e4, g.churchParking(8)); c.place(c.L(-1, 0.02, -14.5), ch.faceYaw(0, -1));
  const qes = c.npc('priest', 1, c.L(1.5, 0.02, -14), ch.faceYaw(-1, -0.4), 'Qes'); qes.act('holdCross');
  await c.settle(); await c.fadeIn(); await c.title(2); await c.talk('c3.qes.1', 'c3.isaac.1');
  const site = c.L(8.5, 0.02, -9.5);
  // gather branches: piles in the neighbourhood (park / boulevards)
  const spots = [c.streetSpot(160, 0), c.streetSpot(240, 1), c.streetSpot(200, 2), c.streetSpot(300, 3)];
  let n = 0; for (const s of spots) { const pile = c.prop(branchPile()); pile.position.copy(s.walk).add(V(0, -0.1, 0)); c.obj(`Gather fallen branches for the Demera (${n}/4)`, `ለደመራ የወደቁ ቅርንጫፎችን ሰብስብ (${n}/4)`); await c.reach(s.road, 18, true); await c.interact(s.walk, 'Load the branches', 'ቅርንጫፎቹን ጫን', 2.2, 'shoes', 1.6); c.removeProp(pile); n++; }
  // the fire permit
  const hall = c.poi('cityhall', 800, 0); const clerk = c.npc('neighbour', 61, hall.walk, 0, 'Clerk'); clerk.face(hall.road);
  c.obj('Get the fire permit at City Hall', 'የእሳት ፈቃድ ከከተማ አስተዳደር አምጣ'); await c.reach(hall.road, 16, true); await c.interact(hall.walk, 'Ask for the open-air fire permit', 'የእሳት ፈቃድ ጠይቅ', 2.4, null); clerk.face(g.player.pos); clerk.act('talk'); await c.talk('c3.clerk.1', 'c3.isaac.2', 'c3.clerk.2'); g.audio.chime();
  c.obj('Bring everything back to the church yard', 'ሁሉንም ወደ ቤተ ክርስቲያኑ ግቢ አምጣ'); await c.reach(c.spot('stairsBottom'), 16, true); if (g.mode === 'car') { c.obj('Get out of the truck (F)', 'ከመኪናው ውረድ (F)'); await c.onFoot(); }
  // build + decorate
  c.obj('Stack the Demera in the yard', 'ደመራውን በግቢው ውስጥ ደርድር'); await c.interact(site, 'Build the Demera', 'ደመራውን ሥራ', 2.2, 'reach', 1.4);
  const demera = c.prop(demeraMesh()) as THREE.Group; demera.position.copy(site); demera.scale.setScalar(0.01); for (let t = 0; t < 1; t += g.dt / 1.5) { demera.scale.setScalar(Math.min(1, t)); await c.wait(0); } demera.scale.setScalar(1);
  ch.setVariant('current', true, false);
  for (const [i, p] of [c.L(6.9, 0.02, -9.5), c.L(10.1, 0.02, -9.5), c.L(8.5, 0.02, -11.1), c.L(8.5, 0.02, -7.9)].entries()) { c.obj(`Set out flags and adey abeba around it (${i}/4)`, `ሰንደቅ ዓላማና አደይ አበባ አስቀምጥ (${i}/4)`); await c.interact(p, 'Place flowers', 'አበባ አስቀምጥ', 1.4, 'shoes', 1.4); const fl = new Geo(); const r = mulberry(i + 1); for (let k = 0; k < 14; k++) fl.box((r() - 0.5) * 0.7, 0.12 + r() * 0.12, (r() - 0.5) * 0.7, 0.08, 0.08, 0.08, 0xf2c81a); const m = c.prop(fl.mesh(new THREE.MeshStandardMaterial({ vertexColors: true }))); m.position.copy(p); }
  await c.say('c3.qes.2');
  // ---- night: the celebration ----
  await c.fadeOut(1.2); g.engine.setDateTime(9, 27, 20.2); g.engine.clockPaused = true; g.traffic.enabled = false; g.peds.enabled = false; g.setOutfit('netela');
  const crowd: Npc[] = []; const kinds = ['man', 'woman', 'elder', 'elderWoman', 'kid', 'woman', 'man', 'kid'] as const; const count = g.engine.quality === 'low' ? 10 : 20;
  for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2 + 0.2, rad = 3.6 + (i % 3) * 0.7; const p = site.clone().add(V(Math.cos(a) * rad, 0.1, Math.sin(a) * rad)); const nn = c.npc(kinds[i % 8], 100 + i, p, 0); nn.face(site); nn.act(i % 4 === 0 ? 'clap' : i % 4 === 1 ? 'chant' : 'pray'); crowd.push(nn); }
  const drummer = c.npc('deacon', 91, site.clone().add(V(-2.4, 0.1, -1.6)), 0); drummer.face(site); const kb = keberoMesh(0.85); kb.rotation.z = Math.PI / 2; drummer.human.bones.chest.add(kb); kb.position.set(0, -0.22, 0.26); drummer.act('drum');
  qes.place(site.clone().add(V(0, 0.1, -2.3)), 0); qes.face(site); qes.act('bless'); c.place(site.clone().add(V(1.6, 0.1, -2.6)), yawTo(site.clone().add(V(1.6, 0, -2.6)), site));
  await c.cut(async () => {
    g.cutCam = { pos: site.clone().add(V(-7, 2.2, -8)), look: site.clone().add(V(0, 2, 0)) }; g.audio.chant('meskel_demera'); g.audio.keberoOn = true; g.audio.setCrowd(0.7); await c.fadeIn(1.2);
    c.say('c3.night.1').catch(() => {}); await c.cam(site.clone().add(V(-7, 2.2, -8)), site.clone().add(V(0, 2, 0)), site.clone().add(V(-4, 1.7, -5.5)), site.clone().add(V(0, 2.2, 0)), 9, 45);
    await c.say('c3.qes.3'); g.isaac.play('reach', 1.6); await c.wait(1.2);
    g.weather.addFire(site.clone().add(V(0, 0.3, 0)), 1.5); g.audio.setFire(1); g.audio.bell(520);
    c.say('c3.night.2').catch(() => {}); await c.cam(site.clone().add(V(-4, 1.7, -5.5)), site.clone().add(V(0, 2.2, 0)), site.clone().add(V(5.5, 2.6, -6.5)), site.clone().add(V(0, 2.6, 0)), 12, 45);
    // the Demera falls — everyone watches which way
    const dirs: [string, number, number][] = [['c3.fall.east', 0, 1], ['c3.fall.south', 1, 0], ['c3.fall.west', 0, -1]]; const pick = dirs[Math.floor(Math.random() * dirs.length)];
    const axis = ch.toWorld(pick[1], 0, pick[2]).sub(ch.toWorld(0, 0, 0)).normalize(); const rotAxis = new THREE.Vector3(axis.z, 0, -axis.x);
    for (let t = 0; t < 1; t += g.dt / 3) { demera.quaternion.setFromAxisAngle(rotAxis, (t * t) * 1.35); await c.wait(0); }
    g.audio.kebero(true, 1); for (const nn of crowd) nn.act('clap'); await c.say(pick[0]); await c.say('c3.end'); await c.wait(1.5);
    await c.fadeOut(1.5); g.audio.keberoOn = false; g.audio.setFire(0); g.audio.setCrowd(0); g.audio.chant(null);
  });
  void car;
}

// =====================================================================================================
async function timket(c: Ctx) {
  const g = c.g, ch = g.church, R = ch.refs;
  await c.scene({ season: 'winter', month: 1, day: 18, hour: 13, temp: -35, snowfall: 0.2, wind: 0.5, outfit: 'netelaPuffer', festival: true, timeScale: 8 });
  const car = c.car('suv', 0x1f2a24, g.churchParking(7)); c.place(c.L(-1.2, 0.02, -14.6), ch.faceYaw(0, -1));
  const qes = c.npc('priest', 1, c.L(1.2, 0.02, -14.2), ch.faceYaw(-1, -0.3), 'Qes'); qes.act('holdCross');
  await c.settle(); await c.fadeIn(); await c.title(3); await c.talk('c4.qes.1', 'c4.isaac.1');
  // plan the route (walk the corners)
  const A = c.L(0, 0.05, -22), B = c.L(-34, 0.05, -22), basinP = c.L(8.5, 0.02, -9.5);
  c.obj('Walk the procession route: mark the corner', 'የዑደቱን መንገድ ተመልከት፦ ማዕዘኑን ምልክት አድርግ'); await c.interact(B, 'Mark the turning point', 'መመለሻውን ምልክት አድርግ', 2.5, null); g.audio.chime();
  // arrange cars
  const drivers: Npc[] = []; for (const [i, off] of [-10, 15, 23].entries()) { const p = g.churchParking(off); const dc = c.car(i === 1 ? 'minivan' : 'pickup', [0x8a1a1a, 0x6a7078, 0x2f4a6a][i], p); const n = c.npc('man', 70 + i, V(p.x, 0, p.z).add(ch.toWorld(0, 0, 2.2).sub(ch.toWorld(0, 0, 0))), 0); n.pos.y = g.world.height(n.pos.x, n.pos.z) + 0.14; drivers.push(n); void dc; }
  for (const [i, d] of drivers.entries()) { c.obj(`Arrange rides home with the drivers (${i}/3)`, `ከሹፌሮቹ ጋር የመመለሻ ጉዞ አስተባብር (${i}/3)`); await c.interact(d.pos.clone(), 'Talk to the driver', 'ከሹፌሩ ጋር ተነጋገር', 2.2, null); d.face(g.player.pos); d.act('talk'); await c.say(`c4.driver.${i + 1}`); }
  // clear snow
  for (const [i, p] of [c.L(0, 0.05, -15.5), c.L(0, 0.05, -13), c.L(0.3, 0.7, -11.2), c.L(0, F, -9.4)].entries()) { c.obj(`Clear the snow from the path and steps (${i}/4)`, `ከመንገዱና ከደረጃው በረዶ አጽዳ (${i}/4)`); await c.interact(p, 'Shovel', 'አካፋ', 1.5, null); g.isaac.play('shovel', 2.2); await c.wait(2.2); }
  // umbrellas + vestments
  c.obj('Inside: ready the umbrellas and vestments', 'ውስጥ፦ ጃንጥላዎቹንና አልባሳቱን አዘጋጅ'); await c.reach(c.spot('vestibule'), 1.6); await shoesStep(c);
  await c.interact(c.spot('umbrellas'), 'Take out the velvet umbrellas', 'የከፋይ ጃንጥላዎቹን አውጣ', 1.8); R.umbrellas.visible = false; await c.say('c4.qes.2');
  // ---- the procession (Ketera) ----
  await c.fadeOut(1.2); g.setOutfit('deacon'); g.setShoes(false); g.traffic.enabled = false; g.peds.enabled = false; g.traffic.clear(); g.engine.setDateTime(1, 18, 15.6);
  const basin = c.prop(waterBasin()); basin.position.copy(basinP);
  qes.place(c.L(0, F, -8.9), ch.faceYaw(0, -1)); qes.fixedY = 1; qes.human.hold('R', null); const tabot = coveredTabot(); qes.human.bones.head.add(tabot); tabot.position.set(0, 0.3, 0); qes.act('holdCross'); qes.speed = 0.8;
  const um1 = c.npc('deacon', 81, c.L(0.75, F, -8.7), ch.faceYaw(0, -1)); um1.fixedY = 1; um1.human.hold('R', umbrellaMesh(0x8a1f3a, true), [0, -1.02, 0.02]); um1.act('umbrella'); um1.speed = 0.8;
  const drum = c.npc('deacon', 91, c.L(-0.9, 0.02, -13.6), ch.faceYaw(0, -1)); const kb = keberoMesh(0.85); kb.rotation.z = Math.PI / 2; drum.human.bones.chest.add(kb); kb.position.set(0, -0.22, 0.26); drum.act('drum'); drum.speed = 0.8;
  const crowd: Npc[] = []; const kinds = ['man', 'woman', 'elder', 'elderWoman', 'kid', 'woman'] as const; const cnt = g.engine.quality === 'low' ? 8 : 14;
  for (let i = 0; i < cnt; i++) { const nn = c.npc(kinds[i % 6], 120 + i, c.L(-3 + (i % 4) * 2, 0.02, -10.5 + Math.floor(i / 4) * 1.4 - 6), ch.faceYaw(0, -1)); nn.act(i % 2 ? 'clap' : 'chant'); nn.speed = 0.8; crowd.push(nn); }
  const umb = umbrellaMesh(0x2a2f7a, true); g.isaac.hold('R', umb, [0, -1.02, 0.02]); g.isaac.play('umbrella', 1, true); c.place(c.L(-0.8, F, -8.7), ch.faceYaw(0, -1)); ch.doorWant = 1;
  g.audio.chant('timket_procession'); g.audio.keberoOn = true; g.audio.tsenatselOn = true; g.player.maxSpeedOverride = 1.1;
  await c.fadeIn(1.2); g.hud.card(c.text('Ketera', 'ከተራ'), c.text('The Tabot goes out, covered, beneath the umbrellas', 'ታቦቱ ተሸፍኖ በጃንጥላ ሥር ይወጣል'), 4);
  const route = [c.L(0, 0.02, -12.6), A, B, A, c.L(0, 0.02, -14.5), basinP.clone().add(ch.toWorld(0, 0, -1.6).sub(ch.toWorld(0, 0, 0)))];
  const lead = (async () => { for (const p of route) { const gy = (q: THREE.Vector3) => q.clone().setY(q.y); await Promise.all([qes.walkTo(gy(p)), um1.walkTo(gy(p).add(ch.toWorld(0.75, 0, 0.2).sub(ch.toWorld(0, 0, 0)))), drum.walkTo(gy(p).add(ch.toWorld(-0.6, 0, -2.6).sub(ch.toWorld(0, 0, 0)))), ...crowd.map((nn, i) => nn.walkTo(gy(p).add(ch.toWorld(-2.4 + (i % 4) * 1.6, 0, 2.2 + Math.floor(i / 4) * 1.3).sub(ch.toWorld(0, 0, 0)))))]); } })();
  c.obj('Walk beside the Qes and keep the umbrella over the Tabot', 'ከቄሱ ጎን ተራመድ፤ ጃንጥላውን ከታቦቱ በላይ ያዝ');
  let done = false; lead.then(() => (done = true)).catch(() => (done = true)); let warn = 0;
  while (!done) { await c.wait(0.25); if (g.auto) { for (const nn of [qes, um1, drum, ...crowd]) nn.speed = 14; g.player.teleport(qes.pos.x + 1, qes.pos.y, qes.pos.z); } const d = g.player.pos.distanceTo(qes.pos); g.hud.setTarget({ x: qes.pos.x, z: qes.pos.z }); if (d > 4.5) { warn += 0.25; if (warn > 2) { g.hud.toast(c.text('Stay close to the Qes', 'ከቄሱ አትራቅ'), 2); warn = 0; } } }
  g.hud.setTarget(null); g.player.maxSpeedOverride = 0;
  await c.say('c4.qes.3');
  // ---- the blizzard: get the families home ----
  await c.fadeOut(1.2); g.audio.chant(null); g.audio.keberoOn = g.audio.tsenatselOn = false; g.isaac.hold('R', null); g.isaac.stop(); g.setOutfit('netelaPuffer'); tabot.visible = false; qes.human.bones.head.remove(tabot);
  for (const nn of [...crowd, um1, drum]) c.removeNpc(nn); qes.place(c.L(1.5, 0.02, -14), ch.faceYaw(-1, -0.4)); qes.act('holdCross');
  g.engine.setDateTime(1, 18, 18.3); g.weather.snowfall = 1; g.weather.blizzard = 1; g.weather.wind = 1; g.applyWeather();
  const fam1 = c.npc('woman', 141, V(0, 0, 0)), kid1 = c.npc('kid', 142, V(0, 0, 0)), fam2 = c.npc('elderWoman', 143, V(0, 0, 0)), kid2 = c.npc('man', 144, V(0, 0, 0));
  c.place(c.L(-1.5, 0.02, -15.5), ch.faceYaw(0, -1)); c.seat(fam1, car, 0); c.seat(kid1, car, 2); await c.fadeIn(1);
  await c.talk('c4.storm.1'); c.obj('Blizzard! Get in the SUV (F) — lights (L) and wipers (V) on', 'ዐውሎ ነፋስ! መኪናው ውስጥ ግባ (F) — መብራት (L)፣ መጥረጊያ (V)'); await c.drive(car); car.headlights = true; car.wipersOn = true;
  const h1 = c.streetSpot(380, 2), h2 = c.streetSpot(520, 3);
  c.obj('Drive the first family home — slowly', 'የመጀመሪያውን ቤተሰብ ወደ ቤት አድርስ — ቀስ ብለህ'); await c.reach(h1.road, 9, true); await c.fadeOut(0.4); c.unseat(fam1, car, h1.walk, 0); c.unseat(kid1, car, h1.walk.clone().add(V(0.6, 0, 0.4)), 0); fam1.act('wave'); await c.fadeIn(0.4); await c.say('c4.family.1');
  c.obj('Go back for the second family', 'ለሁለተኛው ቤተሰብ ተመለስ'); const pk = g.churchParking(7); await c.reach(V(pk.x, 0, pk.z), 11, true); await c.fadeOut(0.4); c.seat(fam2, car, 0); c.seat(kid2, car, 2); await c.fadeIn(0.4);
  c.obj('Drive the second family home', 'ሁለተኛውን ቤተሰብ ወደ ቤት አድርስ'); await c.reach(h2.road, 9, true); await c.fadeOut(0.4); c.unseat(fam2, car, h2.walk, 0); c.unseat(kid2, car, h2.walk.clone().add(V(0.6, 0, 0.4)), 0); fam2.act('wave'); await c.fadeIn(0.4); await c.say('c4.family.2');
  c.obj('Return to the church', 'ወደ ቤተ ክርስቲያን ተመለስ'); await c.reach(V(pk.x, 0, pk.z), 11, true);
  // ---- Timket morning: the blessing of the water ----
  await c.fadeOut(1.5); if (g.mode === 'car') g.exitCar(true); g.setOutfit('deacon');
  g.weather.snowfall = 0.12; g.weather.blizzard = 0; g.weather.wind = 0.15; g.engine.setDateTime(1, 19, 8.75); g.engine.clockPaused = true; g.applyWeather();
  qes.place(basinP.clone().add(ch.toWorld(0, 0, -1.3).sub(ch.toWorld(0, 0, 0))), 0); qes.face(basinP); qes.act('bless'); const ring: Npc[] = [];
  for (let i = 0; i < cnt + 4; i++) { const a = (i / (cnt + 4)) * Math.PI * 1.5 + 0.9, rad = 3.2 + (i % 3) * 0.75; const p = basinP.clone().add(V(Math.cos(a) * rad, 0.1, Math.sin(a) * rad)); const nn = c.npc(kinds[i % 6], 160 + i, p, 0); nn.face(basinP); nn.act('pray'); ring.push(nn); }
  const ip = basinP.clone().add(ch.toWorld(1.3, 0, -1.5).sub(ch.toWorld(0, 0, 0))); c.place(ip, yawTo(ip, basinP)); g.isaac.play('pray', 1, true);
  await c.cut(async () => {
    g.cutCam = { pos: basinP.clone().add(V(-6, 2.4, -7)), look: basinP.clone().add(V(0, 1.4, 0)) }; g.audio.chant('timket_blessing'); await c.fadeIn(2);
    g.hud.card(c.text('Timket', 'ጥምቀት'), c.text('Epiphany morning, −35 °C', 'የጥምቀት ጠዋት፣ −35 °C'), 4);
    await c.cam(basinP.clone().add(V(-6, 2.4, -7)), basinP.clone().add(V(0, 1.4, 0)), basinP.clone().add(V(-3, 1.7, -4.5)), basinP.clone().add(V(0, 1.3, 0)), 9, 42);
    await c.say('c4.bless.1'); g.audio.bell(660);
    const sp = (async () => { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 1.5 + 0.9; g.weather.sprinkle(basinP.clone().add(V(0, 1.3, 0)), V(Math.cos(a), 0, Math.sin(a))); for (const nn of ring) if (i === 3) nn.act('clap'); await c.wait(0.9); } })();
    c.say('c4.bless.2').catch(() => {}); await c.cam(basinP.clone().add(V(-3, 1.7, -4.5)), basinP.clone().add(V(0, 1.3, 0)), basinP.clone().add(V(4.5, 2.2, -5)), basinP.clone().add(V(0, 1.5, 0)), 9, 42); await sp;
    g.audio.setCrowd(0.6); await c.say('c4.end'); await c.cam(basinP.clone().add(V(4.5, 2.2, -5)), basinP.clone().add(V(0, 1.5, 0)), c.L(0.2, 3.0, -19), c.L(0, 8.6, -7), 8, 42);
    await c.fadeOut(1.5); g.audio.setCrowd(0); g.audio.chant(null);
  });
}

// =====================================================================================================
async function fasika(c: Ctx) {
  const g = c.g, ch = g.church, R = ch.refs;
  await c.scene({ season: 'spring', month: 4, day: 8, hour: 8.5, temp: 3, wind: 0.3, outfit: 'casual', timeScale: 14 });
  const car = c.car('hatchback', 0x2f5f8a, g.churchParking(7)); c.place(c.L(-1.5, 0.02, -15), ch.faceYaw(0, -1));
  await c.settle(); await c.fadeIn(); await c.title(4); await c.say('c5.isaac.1');
  // Holy Week: university, the fast, serving
  const uni = c.poi('university', 950, 3); const friend = c.npc('neighbour', 201, uni.walk, 0, 'Classmate'); friend.face(uni.road);
  c.obj('Drive to Brandon University for your morning exam', 'ለጠዋት ፈተና ወደ ብራንደን ዩኒቨርሲቲ ንዳ'); await c.reach(uni.road, 16, true);
  await c.interact(uni.walk, 'Talk to your classmate', 'ከጓደኛህ ጋር ተነጋገር', 2.4, null); friend.face(g.player.pos); friend.act('talk'); await c.talk('c5.friend.1', 'c5.isaac.2', 'c5.friend.2');
  await c.fadeOut(0.8); g.engine.setDateTime(4, 10, 14.5); await c.fadeIn(0.8); g.hud.card(c.text('Good Friday', 'ስቅለት'), c.text('Siqlet — a day of prostrations', 'የስግደት ቀን'), 3.5);
  c.obj('Drive back to the church for Siqlet', 'ለስቅለት ወደ ቤተ ክርስቲያን ተመለስ'); await c.reach(c.spot('stairsBottom'), 16, true); if (g.mode === 'car') { c.obj('Get out of the car (F)', 'ከመኪናው ውረድ (F)'); await c.onFoot(); }
  g.setOutfit('netela'); const qes = c.npc('priest', 1, c.spot('curtain'), ch.faceYaw(0, -1), 'Qes'); qes.fixedY = 1; qes.act('holdCross'); const few = c.congregation(8, 220); for (const n of few) n.act('pray');
  await c.reach(c.spot('vestibule'), 1.6); await shoesStep(c);
  c.obj('Join the sigdet (prostrations) in the aisle — 3 times', 'በመካከለኛው መተላለፊያ ስግደት ስገድ — 3 ጊዜ'); await c.reach(c.spot('aisleFront'), 1.3);
  for (let i = 0; i < 3; i++) { await c.interact(c.spot('aisleFront'), `Bow down (${i + 1}/3)`, `ስገድ (${i + 1}/3)`, 2, null); g.player.yaw = ch.faceYaw(0, 1); g.input.enabled = false; g.isaac.play('sigdet', 3.2); for (const n of few) n.human.play('sigdet', 3.2); await c.wait(3.3); for (const n of few) n.act('pray'); g.input.enabled = true; }
  await c.talk('c5.qes.1', 'c5.isaac.3');
  // ---- the vigil ----
  await c.fadeOut(1.5); for (const n of few) c.removeNpc(n); g.setOutfit('deacon'); g.engine.setDateTime(4, 11, 23.4); g.engine.clockPaused = true; g.traffic.enabled = false; g.peds.enabled = false;
  const people = c.congregation(g.engine.quality === 'low' ? 12 : 30, 300, { candles: false }); R.setCandles(6); R.setLights(0.12); g.lightOverride = 0.12;
  const chanters = R.standing.chanters.slice(0, 4).map((s, i) => { const n = c.npc('deacon', 280 + i, ch.toWorld(s.x, s.y, s.z), ch.faceYaw(s.x > 0 ? -0.6 : 0.6, 1)); n.fixedY = 1; n.act('chant'); return n; });
  c.place(c.spot('aisleBack'), ch.faceYaw(0, 1)); g.audio.chant('fasika_vigil', 0.6);
  await c.fadeIn(1.5); g.hud.card(c.text('The Vigil', 'የትንሣኤ ሌሊት'), c.text('Holy Saturday, near midnight', 'ቅዳሜ ሌሊት'), 4);
  c.obj('Receive the light from the Qes', 'ብርሃኑን ከቄሱ ተቀበል'); await c.interact(c.L(0, F, 4.4), 'Light your candle', 'ሻማህን አብራ', 1.8, 'reach'); c.giveCandle(null);
  c.obj('Pass the light to the congregation (4)', 'ብርሃኑን ለምእመናን አስተላልፍ (4)');
  for (let i = 0; i < 4; i++) { const n = people[(i * 3) % people.length]; await c.interact(n.pos.clone(), 'Share the light', 'ብርሃኑን አካፍል', 1.6, null); const upto = Math.floor(((i + 1) / 4) * people.length); for (let k = 0; k < upto; k++) if (!people[k].human.held.R) c.giveCandle(people[k]); g.audio.tsenatsel(0.5); }
  for (const n of [...people, ...chanters]) if (!n.human.held.R) c.giveCandle(n);
  c.obj('Return to the front to serve', 'ለማገልገል ወደ ፊት ተመለስ'); await c.reach(c.spot('deacon'), 1.1);
  await c.cut(async () => {
    c.place(c.spot('deacon'), ch.faceYaw(0.3, -1)); g.isaac.play('candle', 1, true);
    await c.cam(c.L(0, F + 1.8, -4.8), c.L(0, F + 1.4, 5), c.L(0, F + 2.2, 0), c.L(0, F + 1.5, 5.6), 9, 55);
    g.audio.chant(null); await c.wait(1.2); g.audio.bell(520); await c.wait(0.8); g.audio.bell(660); qes.act('bless');
    await c.say('c5.tensae.1'); g.lightOverride = 1; g.audio.chant('fasika_tensae'); g.audio.keberoOn = true; g.audio.tsenatselOn = true; for (const n of people) if (Math.random() < 0.5) n.human.play('clap', 6);
    await c.say('c5.tensae.2'); await c.cam(c.L(-3.4, F + 1.6, -2.5), c.L(1.5, F + 1.3, 1), c.L(3.2, F + 1.8, 3), c.L(-1.5, F + 1.4, 0), 10, 50);
    // ---- spring dawn: the congregation pours out; the opening shot, mirrored ----
    await c.fadeOut(1.5); g.engine.setDateTime(4, 12, 6.45); g.lightOverride = -1; R.setCandles(0); for (const n of [...people, ...chanters]) n.human.hold('R', null); g.isaac.hold('R', null); g.setOutfit('netela');
    c.place(c.L(0, 0.02, -13.2), ch.faceYaw(0, -1)); g.isaac.stop(); exodus(c, [...people, ...chanters]); g.audio.setCrowd(1);
    g.cutCam = { pos: c.L(0.2, 3.0, -19), look: c.L(0, 8.6, -7) }; await c.fadeIn(2);
    c.say('c5.end').catch(() => {}); await c.cam(c.L(0.2, 3.0, -19), c.L(0, 8.6, -7), c.L(0.6, 1.9, -31), c.L(0, 7.5, -8), 14, 42);
    await credits(c); await c.fadeOut(2); g.audio.keberoOn = g.audio.tsenatselOn = false; g.audio.setCrowd(0); g.audio.chant(null);
  });
  void car;
}
async function credits(c: Ctx) {
  const g = c.g; const el = document.createElement('div'); el.className = 'minigame'; el.style.cssText = 'position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;pointer-events:none;overflow:hidden';
  el.innerHTML = `<div style="text-align:center;text-shadow:0 2px 10px #000;transform:translateY(100%);animation:cr 22s linear forwards;padding-bottom:10vh"><style>@keyframes cr{to{transform:translateY(-120vh)}}</style>
  <div style="font-family:'Cormorant Garamond','Noto Sans Ethiopic',serif;font-size:54px;color:#f6e7b8">${c.text('MEDHANE ALEM', 'መድኃኔ ዓለም')}</div><div style="font-size:20px;margin-bottom:40px">${c.text("A Deacon's Year", 'የአንድ ዲያቆን ዓመት')}</div>
  <p>${c.text('For the community of', 'ለ')}<br><b>${c.text('Ethiopian Orthodox Tewahedo Medhane Alem Church', 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ መድኃኔ ዓለም ቤተ ክርስቲያን')}</b><br>1260 5th Street, Brandon, Manitoba</p>
  <p style="margin-top:34px">${c.text('Story, photographs and guidance', 'ታሪክ፣ ፎቶዎችና መመሪያ')}<br><b>Deacon Isaac</b> · @EOTCBrandon</p>
  <p style="margin-top:34px">${c.text('Built with three.js, Rapier and OpenStreetMap contributors', 'በ three.js፣ Rapier እና OpenStreetMap የተሠራ')}</p>
  <p style="margin-top:44px;font-size:26px;color:#f6e7b8">ክርስቶስ ተንሥአ እሙታን<br><span style="font-size:17px;color:#fff">Kristos tensa’e ke’mutan</span></p></div>`;
  g.hud.root.append(el); try { await c.wait(c.g.auto ? 1 : 21); } finally { el.remove(); }
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'kidan', title: 'Kidan — The Covenant', titleAm: 'ኪዳን', desc: 'A snowy Sunday: prepare the church, bring an elder to the Kidase, and serve.', descAm: 'በረዷማ እሑድ፦ ቤተ ክርስቲያኑን አዘጋጅ፣ አረጋዊ አምጣ፣ አገልግል።', run: kidan },
  { id: 'hamer', title: 'Hamer — Founding Memories', titleAm: 'ሐመር — የምሥረታ ትዝታ', desc: 'How the community began in Brandon. Gather photos and stories; edit the anniversary video.', descAm: 'ማኅበረሰቡ በብራንደን እንዴት እንደ ጀመረ። ፎቶዎችና ታሪኮች ሰብስብ።', run: hamer },
  { id: 'meskel', title: 'Meskel — The Finding of the Cross', titleAm: 'መስቀል', desc: 'Late September: build and light the Demera.', descAm: 'መስከረም፦ ደመራውን ሥራና አብራ።', run: meskel },
  { id: 'timket', title: 'Timket — Epiphany', titleAm: 'ጥምቀት', desc: '−35 °C and a blizzard coming: the procession, the drive home, the blessing of water.', descAm: '−35 °C፦ ዑደት፣ ወደ ቤት ጉዞ፣ የውኃ ቡራኬ።', run: timket },
  { id: 'fasika', title: 'Fasika — Resurrection', titleAm: 'ፋሲካ', desc: 'Holy Week, the all-night vigil, and a spring dawn.', descAm: 'ሰሙነ ሕማማት፣ የሌሊት ጸሎት፣ የጸደይ ንጋት።', run: fasika },
];

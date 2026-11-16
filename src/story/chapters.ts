// Three short levels: a Sunday Kidase (with Mahlet), Meskel at Dinsdale Park, and Fasika. Dialogue text lives in public/story/dialogue.json (EN + AM).
// Rules kept throughout: reverent tone; the Tabot is only ever shown covered; only clergy pass the curtain.
import * as THREE from 'three/webgpu';
import type { ChapterDef, Ctx } from './story';
import type { Npc } from '../char/npc';
import { censerMesh, keberoMesh, maqomiyaMesh, umbrellaMesh } from '../church/interior';
import { CH } from '../church/church';
import { Geo, canvasTex, mulberry } from '../core/geo';

const F = CH.F, FL = CH.FL;
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
async function pushIn(c: Ctx, secs = 10) { await c.cam(c.L(0.6, 1.9, -32.3), c.L(0, 7.5, -8), c.L(0.2, 3.0, -20.3), c.L(0, 8.6, -7), secs, 42); }
/** everybody leaves through the front doors and spreads along the walk */
function exodus(c: Ctx, people: Npc[]) {
  c.g.church.doorWant = 1; const r = mulberry(9);
  people.forEach((n, i) => { n.fixedY = 1; n.human.stop(); n.idle = i % 3 === 0 ? 'talk' : ''; n.place(c.L(0, FL, -8.0 + (i % 2) * 0.5), c.g.church.faceYaw(0, -1)); n.visible = false; n.human.root.visible = false;
    setTimeout(() => { if (c.dead) return; n.visible = true; n.speed = 1.0 + r() * 0.35; const side = (i % 2 ? 1 : -1) * (1.2 + r() * 6.5); n.walkTo(c.L((r() - 0.5) * 0.8, FL, -9.3), c.L((r() - 0.5) * 1.2, 0.02, -12.6), c.L(side * 0.4, 0.02, -14.5 - r() * 2), c.L(side, 0.02, -15 - r() * 5)); }, i * 850); });
}
async function shoesStep(c: Ctx) {
  const g = c.g; if (g.shoesOff) return; const rack = c.spot('shoeRack');
  c.obj('Take off your shoes at a rack in the entry room', 'በመግቢያው ክፍል ጫማህን አውልቅ'); g.hud.setTarget({ x: rack.x, z: rack.z });
  if (g.auto) { await c.wait(0.3); g.player.teleport(rack.x, rack.y + 0.05, rack.z); g.setShoes(true); }
  await c.until(() => g.shoesOff); g.hud.setTarget(null); await c.wait(1.5);
}
const yawTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(-(to.x - from.x), -(to.z - from.z));
function torchMesh() { const g = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 })); st.position.y = 0.3; const fl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xff8a20, emissiveIntensity: 6 })); fl.scale.y = 1.6; fl.position.y = 0.84; g.add(st, fl); return g; }
function processionalCross() { const g = new THREE.Group(); const geo = new Geo(); const c = 0xd0a83a; geo.box(0, 0.75, 0, 0.03, 1.5, 0.03, 0x6a4a2a); geo.box(0, 1.72, 0, 0.05, 0.46, 0.03, c); geo.box(0, 1.76, 0, 0.36, 0.05, 0.03, c); const m = new THREE.Matrix4().makeRotationZ(Math.PI / 4).setPosition(0, 1.76, 0); geo.setMatrix(m); geo.box(0, 0, 0, 0.2, 0.2, 0.025, c); geo.setMatrix(null); for (const [dx, dy] of [[0.18, 0], [-0.18, 0], [0, 0.23], [0, -0.2]]) geo.box(dx, 1.76 + dy, 0, dx ? 0.05 : 0.14, dx ? 0.14 : 0.05, 0.03, c); g.add(geo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.85, roughness: 0.3 }))); return g; }
/** fade to Dinsdale Park by the river (about 2 km north of the church) */
async function goPark(c: Ctx, car: any | null) {
  const g = c.g; await c.fadeOut(0.8); g.traffic.enabled = false; g.peds.enabled = false; g.traffic.clear(); g.hud.setTarget(null);
  const p = g.park.P(0, 52); if (car && g.activeCar === car) car.place(p.x, g.park.y, p.z, Math.PI); else c.place(g.park.P(2, 46), 0);
  await c.wait(0.4); await c.fadeIn(0.8); g.hud.card(c.text('Dinsdale Park', 'ዲንስዴል ፓርክ'), c.text('By the Assiniboine River', 'በአሲኒቦይን ወንዝ ዳር'), 3.2);
}
function tentMesh() { const g = new THREE.Group(); const geo = new Geo(); for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) geo.box(x, 1.15, z, 0.06, 2.3, 0.06, 0xd8d8d8); const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.0, 4, 1, true), new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.9, side: THREE.DoubleSide })); top.rotation.y = Math.PI / 4; top.position.y = 2.8; const band = new Geo(); for (const [k, col] of [0x12893f, 0xf2c81a, 0xc8232a].entries()) for (const sx of [-1, 1]) { band.box(0, 2.22 - k * 0.07, sx * 1.6, 3.2, 0.07, 0.02, col); band.box(sx * 1.6, 2.22 - k * 0.07, 0, 0.02, 0.07, 3.2, col); } g.add(geo.mesh(new THREE.MeshStandardMaterial({ vertexColors: true })), band.mesh(new THREE.MeshStandardMaterial({ vertexColors: true })), top); return g; }
/** Mahlet: two rows of chanters facing each other before the stage with maqomiya; one carries the kebero. */
function mahlet(c: Ctx, count: number, seed = 80) {
  const ch = c.g.church, R = ch.refs; const out: Npc[] = [];
  R.standing.chanters.slice(0, count).forEach((s, i) => { const n = c.npc(i === 0 ? 'deacon' : i % 3 === 0 ? 'elder' : i % 2 ? 'man' : 'deacon', seed + i, ch.toWorld(s.x, s.y, s.z), ch.faceYaw(s.x > 0 ? -1 : 1, 0.25)); n.fixedY = 1;
    if (i === 1) { const kb = keberoMesh(0.85); kb.rotation.z = Math.PI / 2; n.human.bones.chest.add(kb); kb.position.set(0, -0.22, 0.26); n.act('drum'); } else { n.human.hold('R', maqomiyaMesh(), [0, -1.15, 0.05]); n.act('chant'); } out.push(n); });
  return out;
}
/** a point on the street grid no farther than `dist` metres from the church (missions stay in the neighbourhood) */
const near = (c: Ctx, dist: number, sector: number) => c.streetSpot(dist, sector);

// =====================================================================================================
// LEVEL 1 — KIDASE: a Sunday morning. Prepare the church, serve beside the priest, then join the Mahlet.
async function kidan(c: Ctx) {
  const g = c.g, ch = g.church, R = ch.refs;
  await c.scene({ season: 'winter', month: 1, day: 11, hour: 8.72, snowfall: 0.3, wind: 0.25, temp: -18, outfit: 'netelaPuffer', timeScale: 14 });
  c.car('sedan', 0x7d858c, g.churchParking(7));
  c.place(c.spot('stairsBottom'), ch.faceYaw(0, 1));
  const qes = c.npc('priest', 1, c.spot('priest'), ch.faceYaw(0, -1), 'Qesis Andualem'); qes.fixedY = 1; qes.act('holdCross');
  g.cutCam = { pos: c.L(0.6, 1.9, -32.3), look: c.L(0, 7.5, -8) }; await c.settle();
  await c.cut(async () => {
    g.audio.music('solemn'); c.fadeIn(2.5).catch(() => {}); g.hud.card(c.text('MEDHANE ALEM', 'መድኃኔ ዓለም'), c.text("A Deacon's Year · Brandon, Manitoba", 'የአንድ ዲያቆን ዓመት · ብራንደን፣ ማኒቶባ'), 6);
    await pushIn(c, 9);
    await c.cam(c.L(0.2, 3.0, -20.3), c.L(0, 8.6, -7), c.L(-2.6, 1.5, -16.5), c.L(0, 1.5, -13.7), 3, 42);
    await c.act('cross', 2.8); await c.act('bow', 1.8);
    const up = c.walk([c.L(0, 0.3, -13.2), c.L(0, FL, -11.2), c.L(0, FL, -10.25)], 1.05);
    await c.cam(c.L(-2.6, 1.5, -16.5), c.L(0, 1.5, -13.7), c.L(-2.2, 2.4, -13.1), c.L(0, FL + 1.5, -10.2), 5, 42); await up;
    await c.act('kiss', 2.4); g.audio.door();
  });
  c.place(c.L(0, FL, -8.1), ch.faceYaw(0, 1));
  await c.title(0);
  await shoesStep(c);
  c.obj('Go up the steps and bow toward the sanctuary', 'ደረጃውን ወጥተህ ወደ መቅደሱ ስገድ'); await c.interact(c.spot('aisleBack'), 'Bow', 'ስገድ', 1.6, null); g.player.yaw = ch.faceYaw(0, 1); await c.act('cross', 2.4); await c.act('bow', 1.8);
  c.obj('Greet Qesis Andualem: kiss the cross he holds', 'ቀሲስ አንዷለምን ሰላም በል፦ መስቀሉን ሳም');
  await c.interact(c.spot('priest').add(ch.toWorld(0, 0, -1.0).sub(ch.toWorld(0, 0, 0))), 'Kiss the cross', 'መስቀሉን ሳም', 1.8, null); qes.face(g.player.pos); qes.human.play('reach', 2.2); await c.act('kiss', 2.2);
  await c.talk('c1.qes.greet', 'c1.isaac.greet', 'c1.qes.tasks');
  c.obj('Light the candles on both stands', 'በሁለቱም መቅረዞች ላይ ሻማዎቹን አብራ');
  await c.interact(c.spot('candleL'), 'Light the candles', 'ሻማ አብራ'); R.setCandles(3);
  await c.interact(c.spot('candleR'), 'Light the candles', 'ሻማ አብራ'); R.setCandles(6);
  c.obj('Prepare the censer', 'ጽናውን አዘጋጅ'); await c.interact(c.spot('censer'), 'Prepare the censer', 'ጽናውን አዘጋጅ'); R.censerLit = true;
  g.weather.smokeSources.push({ pos: ch.toWorld(-2.95, F + 1.15, CH.PZ - 0.55), rate: 5, acc: 0 });
  c.obj('Start the livestream at the back of the church', 'በኋላ ያለውን ቀጥታ ስርጭት ጀምር');
  await c.interact(c.spot('camera'), 'Start the @EOTCBrandon stream', 'ስርጭቱን ጀምር', 1.9); R.streamOn = true; g.hud.toast(c.text('Livestream is on — the camera above the doors is live', 'ቀጥታ ስርጭት ተጀምሯል'));
  g.audio.music(null);
  // ---- the Kidase ----
  await c.fadeOut(0.8); g.setOutfit('deacon');   // all four deacons vest for the Kidase
  const people = c.congregation(g.engine.quality === 'low' ? 14 : g.engine.quality === 'ultra' ? 48 : 40, 40);
  const chanters = mahlet(c, 4);
  qes.place(c.spot('curtain'), ch.faceYaw(0, -1)); qes.human.hold('R', null); const qc = censerMesh(); qes.human.hold('R', qc, [0, -0.02, 0.03]); (qc.getObjectByName('ember') as any).material.emissiveIntensity = 2.5; qes.act('censer');
  g.weather.smokeSources.push({ pos: ch.toWorld(0.25, F + 1.2, CH.PZ - 1.0), rate: 9, acc: 0 });
  g.audio.chant('kidase_opening'); await c.fadeIn(0.8);
  c.obj('Take your place beside Qesis Andualem to serve', 'ለማገልገል ከቀሲስ አንዷለም አጠገብ ቁም'); await c.reach(c.spot('deacon'), 1.2);
  await c.cut(async () => { c.place(c.spot('deacon'), ch.faceYaw(0.3, -1)); c.say('c1.kidase.1').catch(() => {});
    await c.cam(c.L(0, F + 1.7, -4.9), c.L(0, F + 1.5, 5), c.L(0, F + 1.9, -0.5), c.L(0, F + 1.6, 5.5), 9, 55);
    await c.cam(c.L(3.2, F + 1.5, 1.6), c.L(-1, F + 1.4, 4.6), c.L(2.6, F + 1.6, 4.4), c.L(-1.2, F + 1.5, 5.2), 7, 45); await c.say('c1.kidase.2'); });
  c.obj('Hold the tuaf (candle) beside Qesis Andualem for the Gospel', 'ለወንጌል ንባብ ከቀሲስ አንዷለም አጠገብ ጧፍ ያዝ'); await c.interact(c.spot('deacon'), 'Take the candle', 'ጧፉን ያዝ', 1.6, 'reach'); c.giveCandle(null);
  qes.human.hold('R', null); qes.act('holdCross'); await c.talk('c1.gospel');
  c.obj('Ring the qachil for "Igzio"', 'ለ«እግዚኦ» ቃጭሉን ደውል'); await c.interact(c.spot('bell'), 'Ring the qachil', 'ቃጭሉን ደውል', 1.6, 'reach'); await c.say('c1.igzio'); for (const n of [...people, ...chanters]) n.human.play('bow', 3.4); await c.act('bow', 3.2);
  g.isaac.hold('R', null);
  // ---- Mahlet: staff, sistrum and drum before the stage ----
  g.audio.chant('mahlet_practice'); g.hud.card(c.text('Mahlet', 'ማኅሌት'), c.text('Staff, sistrum and drum', 'መቋሚያ፣ ጸናጽል፣ ከበሮ'), 3.5);
  c.obj('Take a maqomiya from the front pew', 'ከፊተኛው ወንበር መቋሚያ ውሰድ'); await c.interact(c.spot('staffs'), 'Take a prayer staff', 'መቋሚያ ውሰድ', 1.8); g.isaac.hold('R', maqomiyaMesh(), [0, -1.15, 0.05]);
  c.obj('Join the row of chanters', 'ወደ መዘምራኑ ሰልፍ ግባ'); await c.reach(c.spot('mahlet'), 1.0); g.player.yaw = ch.faceYaw(-1, 0.2); g.isaac.play('chant', 1, true);
  for (let i = 0; i < 3; i++) { await c.interact(c.spot('mahlet'), `Keep time with the staff (${i + 1}/3)`, `መቋሚያውን በምት ምታ (${i + 1}/3)`, 2.2, null); g.isaac.play('bow', 0.9); await c.wait(0.9); g.isaac.play('chant', 1, true); }
  await c.talk('c2.qes.mahlet');
  await c.cut(async () => {
    await c.fadeOut(1.2); g.audio.chant(null); g.isaac.hold('R', null); g.isaac.stop(); g.setOutfit('netelaPuffer');
    g.weather.snowfall = 0.15; g.engine.setDateTime(1, 11, 11.6); g.weather.smokeSources = [];
    for (const n of chanters) n.human.hold('R', null); c.place(c.L(-1.6, 0.02, -15.5), ch.faceYaw(0.3, 1)); g.isaac.play('talk', 1, true);
    exodus(c, [...people, ...chanters]); g.audio.music('festive');
    g.cutCam = { pos: c.L(4.5, 1.7, -20.3), look: c.L(0, 2.6, -10.3) }; await c.fadeIn(1);
    c.say('c1.end').catch(() => {}); await c.cam(c.L(4.5, 1.7, -20.3), c.L(0, 2.6, -10.3), c.L(1.2, 2.4, -25.3), c.L(0, 4.5, -8), 13, 45);
    await c.fadeOut(1); g.audio.music(null); g.isaac.stop();
  });
}

// =====================================================================================================
// LEVEL 2 — MESKEL: the finding of the True Cross. Everything is prepared in the church yard.
async function meskel(c: Ctx) {
  const g = c.g, ch = g.church; const YS = -1; // branch piles are scattered on the north and front lawns
  await c.scene({ season: 'autumn', month: 9, day: 27, hour: 15, temp: 12, outfit: 'netela', wind: 0.35, timeScale: 12 });
  const car = c.car('pickup', 0xe8e8e4, g.churchParking(8)); c.place(c.L(-1, 0.02, -15.8), ch.faceYaw(0, -1));
  const qes = c.npc('priest', 1, c.L(1.5, 0.02, -15.3), ch.faceYaw(-1, -0.4), 'Qesis Andualem'); qes.act('holdCross');
  await c.settle(); await c.fadeIn(); await c.title(1); await c.talk('c3.qes.1', 'c3.isaac.1');
  const site = g.park.P(-26, -8, 0.02);   // Dinsdale Park: the lawn beside the gravel turnaround
  c.obj('Get in the truck (F) — the Demera is built at Dinsdale Park', 'መኪናው ውስጥ ግባ (F) — ደመራው በዲንስዴል ፓርክ ይሠራል'); await c.drive(car);
  await goPark(c, car);
  c.obj('Get out of the truck (F)', 'ከመኪናው ውረድ (F)'); await c.onFoot(); qes.place(site.clone().add(V(3, 0.1, 2)), 0); qes.face(g.player.pos);
  c.obj('Raise the Demera on the lawn', 'ደመራውን በሜዳው ላይ ትከል'); await c.interact(site, 'Build the Demera', 'ደመራውን ሥራ', 2.2, 'reach', 1.4);
  const demera = c.prop(demeraMesh()) as THREE.Group; demera.position.copy(site); demera.scale.setScalar(0.01); for (let t = 0; t < 1; t += g.dt / 1.5) { demera.scale.setScalar(Math.min(1, t)); await g.nextFrame(); c.check(); } demera.scale.setScalar(1);
  ch.setVariant('current', true, false);
  for (const [i, p] of [site.clone().add(V(-1.6, 0, 0)), site.clone().add(V(1.6, 0, 0))].entries()) { c.obj(`Dress it with adey abeba, the yellow Meskel daisies (${i}/2)`, `በአደይ አበባ አስጊጠው (${i}/2)`); await c.interact(p, 'Place flowers', 'አበባ አስቀምጥ', 1.4, 'shoes', 1.4); const fl = new Geo(); const r = mulberry(i + 1); for (let k = 0; k < 14; k++) fl.box((r() - 0.5) * 0.7, 0.12 + r() * 0.12, (r() - 0.5) * 0.7, 0.08, 0.08, 0.08, 0xf2c81a); const m = c.prop(fl.mesh(new THREE.MeshStandardMaterial({ vertexColors: true }))); m.position.copy(p); }
  await c.say('c3.qes.2');
  // ---- evening: the celebration ----
  await c.fadeOut(1.2); g.engine.setDateTime(9, 27, 19.9); g.engine.clockPaused = true; g.traffic.enabled = false; g.peds.enabled = false; g.setOutfit('netela');
  const crowd: Npc[] = []; const kinds = ['man', 'woman', 'elder', 'elderWoman', 'kid', 'woman', 'man', 'kid'] as const; const count = g.engine.quality === 'low' ? 10 : 20;
  const ringPos = (i: number, turn: number) => { const a = (i / count) * Math.PI * 2 + turn, rad = 3.7 + (i % 3) * 0.7; return site.clone().add(V(Math.cos(a) * rad, 0.1, Math.sin(a) * rad)); };
  for (let i = 0; i < count; i++) { const nn = c.npc(kinds[i % 8], 100 + i, ringPos(i, 0), 0); nn.face(site); nn.act(i % 3 === 0 ? 'chant' : 'wereb'); if (i % 5 === 2) nn.human.hold('R', torchMesh(), [0, -0.3, 0.04]); crowd.push(nn); }
  const drummer = c.npc('deacon', 91, site.clone().add(V(-2.4, 0.1, -1.6)), 0); drummer.face(site); const kb = keberoMesh(0.85); kb.rotation.z = Math.PI / 2; drummer.human.bones.chest.add(kb); kb.position.set(0, -0.22, 0.26); drummer.act('drum');
  qes.place(site.clone().add(V(0, 0.1, -2.5)), 0); qes.face(site); qes.human.hold('R', null); qes.human.hold('R', processionalCross(), [0, -1.0, 0.04]); qes.act('umbrella');
  const start = site.clone().add(V(2.9, 0.1, -2.9)); c.place(start, yawTo(start, site)); g.isaac.hold('R', torchMesh(), [0, -0.3, 0.04]); g.isaac.play('candle', 1, true);
  g.audio.chant('meskel_demera'); await c.fadeIn(1.2);
  g.hud.card(c.text('Demera', 'ደመራ'), c.text('The eve of Meskel', 'የመስቀል ዋዜማ'), 3.5); await c.say('c3.night.1');
  // the faithful circle the Demera three times, singing, before it is lit
  let turn = 0, laps = 0, lastA = Math.atan2(g.player.pos.z - site.z, g.player.pos.x - site.x), acc = 0;
  const spin = (dt: number) => { turn += dt * 0.32; crowd.forEach((nn, i) => { const p = ringPos(i, turn); nn.pos.copy(p); nn.yaw = Math.atan2(-(-Math.sin((i / count) * Math.PI * 2 + turn)), -(Math.cos((i / count) * Math.PI * 2 + turn))); nn.human.root.position.copy(p); }); const a = Math.atan2(g.player.pos.z - site.z, g.player.pos.x - site.x); let d = a - lastA; d = Math.atan2(Math.sin(d), Math.cos(d)); lastA = a; if (g.player.pos.distanceTo(site) < 9) acc += d; laps = Math.floor(Math.abs(acc) / (Math.PI * 2)); };
  g.updaters.push(spin);
  try { for (let k = 0; k < 3; k++) { c.obj(`Walk around the Demera with the people, torch in hand (${k}/3)`, `ችቦ ይዘህ ከሕዝቡ ጋር ደመራውን ዙር (${k}/3)`); if (g.auto) { acc += Math.PI * 2.05; await c.wait(0.3); } await c.until(() => laps > k); } } finally { g.updaters.splice(g.updaters.indexOf(spin), 1); }
  for (const nn of crowd) nn.face(site);
  await c.say('c3.qes.3');
  c.obj('Light the Demera with your torch', 'ደመራውን በችቦህ ለኩስ'); await c.interact(site.clone().add(V(1.7, 0, -1.7)), 'Light the Demera', 'ደመራውን ለኩስ', 2.4, 'reach', 1.6);
  await c.cut(async () => {
    g.weather.addFire(site.clone().add(V(0, 0.3, 0)), 1.5); g.audio.setFire(1); for (const nn of crowd) nn.act('clap');
    c.say('c3.night.2').catch(() => {}); await c.cam(site.clone().add(V(-4, 1.7, -5.5)), site.clone().add(V(0, 2.2, 0)), site.clone().add(V(5.5, 2.6, -6.5)), site.clone().add(V(0, 2.6, 0)), 11, 45);
    // the Demera falls — everyone watches which way
    const dirs: [string, number, number][] = [['c3.fall.east', 0, 1], ['c3.fall.south', 1, 0], ['c3.fall.west', 0, -1]]; const pick = dirs[Math.floor(Math.random() * dirs.length)];
    const axis = ch.toWorld(pick[1], 0, pick[2]).sub(ch.toWorld(0, 0, 0)).normalize(); const rotAxis = new THREE.Vector3(axis.z, 0, -axis.x);
    for (let t = 0; t < 1; t += g.dt / 3) { demera.quaternion.setFromAxisAngle(rotAxis, (t * t) * 1.35); await g.nextFrame(); c.check(); }
    await c.say(pick[0]); await c.say('c3.end'); await c.wait(1.5);
    await c.fadeOut(1.5); g.audio.setFire(0); g.audio.chant(null);
  });
}

// =====================================================================================================
// LEVEL 3 — FASIKA: Holy Week, the vigil, and the Resurrection.
async function fasika(c: Ctx) {
  const g = c.g, ch = g.church, R = ch.refs;
  await c.scene({ season: 'spring', month: 4, day: 10, hour: 14.5, temp: 3, wind: 0.3, outfit: 'netela', timeScale: 14 });
  c.car('hatchback', 0x2f5f8a, g.churchParking(7)); c.place(c.L(-1.5, 0.02, -16.3), ch.faceYaw(0, 1));
  await c.settle(); await c.fadeIn(); await c.title(2); await c.say('c5.isaac.1');
  // Siqlet: Good Friday prostrations
  g.hud.card(c.text('Siqlet', 'ስቅለት'), c.text('Good Friday — a day of prostrations', 'የስግደት ቀን'), 3.5);
  const qes = c.npc('priest', 1, c.spot('curtain'), ch.faceYaw(0, -1), 'Qesis Andualem'); qes.fixedY = 1; qes.act('holdCross'); const few = c.congregation(10, 220); for (const n of few) n.act('pray');
  c.obj('Go in for the Siqlet service', 'ለስቅለት አገልግሎት ግባ'); await c.reach(c.spot('vestibule'), 1.6); await shoesStep(c); g.audio.chant('siqlet');
  c.obj('Join the sigdet in the open floor before the stage', 'ከመድረኩ ፊት ባለው ቦታ ስግደት ስገድ'); await c.reach(c.spot('aisleFront'), 1.3);
  for (let i = 0; i < 3; i++) { await c.interact(c.spot('aisleFront'), `Bow down: "Kiryalayson" (${i + 1}/3)`, `ስገድ፦ «ኪርያላይሶን» (${i + 1}/3)`, 2, null); g.player.yaw = ch.faceYaw(0, 1); g.input.enabled = false; g.isaac.play('sigdet', 3.2); for (const n of few) n.human.play('sigdet', 3.2); await c.wait(3.3); for (const n of few) n.act('pray'); g.input.enabled = true; }
  await c.talk('c5.qes.1', 'c5.isaac.3'); g.audio.chant(null);
  // ---- the vigil ----
  await c.fadeOut(1.5); for (const n of few) c.removeNpc(n); g.setOutfit('deacon'); g.engine.setDateTime(4, 11, 23.4); g.engine.clockPaused = true; g.traffic.enabled = false; g.peds.enabled = false;
  const people = c.congregation(g.engine.quality === 'low' ? 14 : g.engine.quality === 'ultra' ? 48 : 40, 300); R.setCandles(6); g.lightOverride = 0.12;
  const chanters = mahlet(c, 6, 280);
  c.place(c.spot('aisleBack'), ch.faceYaw(0, 1)); g.audio.music('solemn');
  await c.fadeIn(1.5); g.hud.card(c.text('The Vigil', 'የትንሣኤ ሌሊት'), c.text('Holy Saturday, toward midnight', 'ቅዳሜ ሌሊት'), 4);
  c.obj('Receive the light from Qesis Andualem', 'ብርሃኑን ከቀሲስ አንዷለም ተቀበል'); await c.interact(c.L(0, F, 4.4), 'Light your tuaf', 'ጧፍህን አብራ', 1.9, 'reach'); c.giveCandle(null);
  c.obj('Pass the light to the people', 'ብርሃኑን ለሕዝቡ አስተላልፍ'); await c.interact(c.spot('aisleMid'), 'Share the light', 'ብርሃኑን አካፍል', 2.0, null);
  for (const n of people) if (!n.human.held.R) c.giveCandle(n);
  c.obj('Return to the front to serve', 'ለማገልገል ወደ ፊት ተመለስ'); await c.reach(c.spot('deacon'), 1.1);
  await c.cut(async () => {
    c.place(c.spot('deacon'), ch.faceYaw(0.3, -1)); g.isaac.play('candle', 1, true);
    await c.cam(c.L(0, F + 1.8, -4.8), c.L(0, F + 1.4, 5), c.L(0, F + 2.2, 0), c.L(0, F + 1.5, 5.6), 9, 55);
    g.audio.music(null); await c.wait(2); qes.act('bless');
    await c.say('c5.tensae.1'); g.lightOverride = 1; g.audio.chant('fasika_tensae'); for (const n of people) if (Math.random() < 0.5) n.human.play('clap', 8);
    await c.talk('c5.tensae.2', 'c5.tensae.3', 'c5.tensae.4', 'c5.tensae.5');
    await c.cam(c.L(-3.4, F + 1.6, -2.5), c.L(1.5, F + 1.3, 1), c.L(3.2, F + 1.8, 3), c.L(-1.5, F + 1.4, 0), 9, 50);
    // ---- spring dawn: the congregation pours out; the opening shot, mirrored ----
    await c.fadeOut(1.5); g.engine.setDateTime(4, 12, 6.45); g.lightOverride = -1; R.setCandles(0); for (const n of [...people, ...chanters]) n.human.hold('R', null); g.isaac.hold('R', null); g.setOutfit('netela');
    c.place(c.L(0, 0.02, -14.5), ch.faceYaw(0, -1)); g.isaac.stop(); exodus(c, [...people, ...chanters]);
    g.cutCam = { pos: c.L(0.2, 3.0, -20.3), look: c.L(0, 8.6, -7) }; await c.fadeIn(2);
    c.say('c5.end').catch(() => {}); await c.cam(c.L(0.2, 3.0, -20.3), c.L(0, 8.6, -7), c.L(0.6, 1.9, -32.3), c.L(0, 7.5, -8), 14, 42);
    await credits(c); await c.fadeOut(2); g.audio.chant(null);
  });
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
  { id: 'kidan', title: 'Kidase — Sunday Morning', titleAm: 'ቅዳሴ', desc: 'Prepare the church, serve beside the priest, and join the Mahlet.', descAm: 'ቤተ ክርስቲያኑን አዘጋጅ፣ ከካህኑ አጠገብ አገልግል፣ ማኅሌቱን ተቀላቀል።', run: kidan },
  { id: 'meskel', title: 'Meskel — The Finding of the Cross', titleAm: 'መስቀል', desc: 'Build and light the Demera at Dinsdale Park.', descAm: 'በዲንስዴል ፓርክ ደመራውን ሥራና አብራ።', run: meskel },
  { id: 'fasika', title: 'Fasika — Resurrection', titleAm: 'ፋሲካ', desc: 'Good Friday, the vigil, and the dawn of the Resurrection.', descAm: 'ስቅለት፣ የሌሊት ጸሎት፣ የትንሣኤ ንጋት።', run: fasika },
];

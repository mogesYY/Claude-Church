/**
 * osm_to_world.ts — converts OpenStreetMap data around 1260 5th St, Brandon MB into game world data.
 *
 * Input (first that exists):
 *   reference/map/brandon.osm.json   (Overpass JSON — tools/fetch_osm.sh)
 *   reference/map/brandon.osm        (XML export from openstreetmap.org)
 *   otherwise an APPROXIMATE Brandon street grid is generated (flagged source:"fallback").
 *
 * Output: public/world/world.json  (roads, areas, nav graph, POIs, chunk index)
 *         public/world/c_<i>_<j>.json (buildings, trees, poles per 256 m chunk — streamed at runtime)
 *
 * World frame: origin = the church, +x east, +z south, metres.
 */
import fs from 'node:fs';
import path from 'node:path';

type Pt = [number, number];
interface Road { id: number; kind: string; name: string; w: number; lanes: number; oneway: boolean; pts: Pt[]; sidewalk: boolean; surface: string }
interface Building { id: number; pts: Pt[]; levels: number; kind: string; name: string; num: string; gen?: boolean }
interface Area { kind: string; name: string; pts: Pt[] }
interface OsmEl { type: string; id: number; lat?: number; lon?: number; nodes?: number[]; tags?: Record<string, string> }

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MAP = path.join(ROOT, 'reference/map');
const OUT = path.join(ROOT, 'public/world');
const CHUNK = 256;
/** best-guess coordinates of 1260 5th St (used only if OSM has no address match) */
const CHURCH_GUESS = { lat: 49.8322, lon: -99.9456 };
const RADIUS = Number(process.env.RADIUS ?? 620); // metres kept around the church — only what the story needs

// ---------- helpers ----------
function mulberry(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r1 = (n: number) => Math.round(n * 10) / 10;
function pip(p: Pt, poly: Pt[]) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function segDist(p: Pt, a: Pt, b: Pt) { const dx = b[0] - a[0], dz = b[1] - a[1]; const l2 = dx * dx + dz * dz || 1e-9; let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); }
function centroid(pts: Pt[]): Pt { let x = 0, z = 0; for (const p of pts) { x += p[0]; z += p[1]; } return [x / pts.length, z / pts.length]; }
function area(pts: Pt[]) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(a / 2); }

// ---------- load OSM ----------
function parseXml(xml: string): OsmEl[] {
  const els: OsmEl[] = [];
  const tagRe = /<tag k="([^"]*)" v="([^"]*)"/g;
  const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const re = /<(node|way)\s([^>]*?)(\/>|>([\s\S]*?)<\/\1>)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attr = (k: string) => new RegExp(`\\b${k}="([^"]*)"`).exec(m![2])?.[1];
    const el: OsmEl = { type: m[1], id: Number(attr('id')) };
    if (m[1] === 'node') { el.lat = Number(attr('lat')); el.lon = Number(attr('lon')); }
    const body = m[4] ?? '';
    if (body) {
      const tags: Record<string, string> = {}; let t: RegExpExecArray | null; tagRe.lastIndex = 0;
      while ((t = tagRe.exec(body))) tags[unesc(t[1])] = unesc(t[2]);
      if (Object.keys(tags).length) el.tags = tags;
      if (m[1] === 'way') el.nodes = [...body.matchAll(/<nd ref="(\d+)"/g)].map((x) => Number(x[1]));
    }
    els.push(el);
  }
  return els;
}

let source = 'fallback';
let elements: OsmEl[] = [];
const jsonPath = path.join(MAP, 'brandon.osm.json'), xmlPath = path.join(MAP, 'brandon.osm');
if (fs.existsSync(jsonPath)) { elements = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).elements; source = 'osm'; }
else if (fs.existsSync(xmlPath)) { elements = parseXml(fs.readFileSync(xmlPath, 'utf8')); source = 'osm'; }

// ---------- origin (the church) ----------
let origin = { ...CHURCH_GUESS };
let churchWayId = -1;
const guessed: string[] = [];
if (source === 'osm') {
  const nodeMap = new Map<number, OsmEl>(); for (const e of elements) if (e.type === 'node') nodeMap.set(e.id, e);
  const cands = elements.filter((e) => e.tags && (
    (e.tags['addr:housenumber'] === '1260' && /5th/i.test(e.tags['addr:street'] ?? '')) ||
    /medhane|medhanie|ethiopian orthodox/i.test(e.tags.name ?? '') || e.tags.denomination === 'ethiopian_orthodox'));
  const c = cands[0];
  if (c) {
    if (c.type === 'node') origin = { lat: c.lat!, lon: c.lon! };
    else { const ns = c.nodes!.map((n) => nodeMap.get(n)!).filter(Boolean); origin = { lat: ns.reduce((s, n) => s + n.lat!, 0) / ns.length, lon: ns.reduce((s, n) => s + n.lon!, 0) / ns.length }; if (c.tags!.building) churchWayId = c.id; }
    console.log('church found in OSM:', c.type, c.id, c.tags);
  } else guessed.push('Church position: no OSM address match for 1260 5th St — used an estimated coordinate.');
}
const mPerLat = 111320, mPerLon = 111320 * Math.cos((origin.lat * Math.PI) / 180);
const proj = (lat: number, lon: number): Pt => [(lon - origin.lon) * mPerLon, -(lat - origin.lat) * mPerLat];
const unproj = (x: number, z: number) => ({ lat: origin.lat - z / mPerLat, lon: origin.lon + x / mPerLon });

// ---------- fallback: approximate Brandon grid ----------
if (source === 'fallback') {
  guessed.push('ENTIRE STREET MAP is an approximation of Brandon\'s grid (OpenStreetMap could not be downloaded). Street/avenue names and spacing are from memory; buildings are generated.');
  let nid = 1, wid = 1;
  const node = (x: number, z: number) => { const g = unproj(x, z); elements.push({ type: 'node', id: nid, lat: g.lat, lon: g.lon }); return nid++; };
  const way = (pts: Pt[], tags: Record<string, string>) => { elements.push({ type: 'way', id: wid++, nodes: pts.map((p) => node(p[0], p[1])), tags }); };
  const ST = 104, AV = 2.1; // metres between streets; metres per house number
  const ord = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
  // the church is on the east side of 5th St; 5th St centreline at x = -24
  const streetX = (n: number) => -24 + (5 - n) * ST;
  const avenues: [string, number, string][] = [
    ['Pacific Avenue', 0, 'tertiary'], ['Rosser Avenue', 100, 'secondary'], ['Princess Avenue', 200, 'secondary'], ['Lorne Avenue', 300, 'residential'],
    ['Louise Avenue', 400, 'residential'], ['Victoria Avenue', 500, 'primary'], ['McTavish Avenue', 600, 'residential'], ['Brandon Avenue', 700, 'residential'],
    ['College Avenue', 800, 'residential'], ['Southern Avenue', 900, 'residential'], ['Madison Avenue', 1000, 'residential'], ['Queens Avenue', 1100, 'tertiary'],
    ['Park Avenue', 1200, 'residential'], ['Richmond Avenue', 1300, 'secondary'], ['Aberdeen Avenue', 1400, 'residential'], ['Maryland Avenue', 1500, 'residential'],
  ];
  const avZ = (num: number) => -(1260 - num) * AV + 8;
  const zN = avZ(0), zS = avZ(1500), xE = streetX(1) + 0, xW = streetX(18);
  const subdiv = (a: Pt, b: Pt, step: number): Pt[] => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); const o: Pt[] = []; for (let i = 0; i <= n; i++) o.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]); return o; };
  // shared intersection nodes
  const gridNode = new Map<string, number>();
  const gnode = (x: number, z: number) => { const k = `${Math.round(x)},${Math.round(z)}`; if (!gridNode.has(k)) gridNode.set(k, node(x, z)); return gridNode.get(k)!; };
  const gway = (pts: Pt[], tags: Record<string, string>) => { elements.push({ type: 'way', id: wid++, nodes: pts.map((p) => gnode(p[0], p[1])), tags }); };
  const zs = avenues.map((a) => avZ(a[1]));
  const xs: number[] = []; for (let n = 1; n <= 18; n++) xs.push(streetX(n));
  for (let n = 1; n <= 18; n++) {
    const kind = n === 18 || n === 1 ? 'primary' : n === 10 || n === 9 ? 'tertiary' : 'residential';
    gway(zs.map((z) => [streetX(n), z] as Pt), { highway: kind, name: `${ord(n)} Street` });
    // back lane half way between streets
    if (n < 18) for (let i = 0; i < zs.length - 1; i++) way([[streetX(n) - ST / 2, zs[i] + 14], [streetX(n) - ST / 2, zs[i + 1] - 14]], { highway: 'service', service: 'alley' });
  }
  for (const [name, num, kind] of avenues) gway(xs.map((x) => [x, avZ(num)] as Pt).reverse(), { highway: kind, name });
  // river (north) + valley park + CP rail line
  const river: Pt[] = []; for (let x = xW - 600; x <= xE + 600; x += 60) river.push([x, zN - 760 + Math.sin(x / 420) * 120 + Math.sin(x / 150) * 30]);
  const rb = [...river.map((p) => [p[0], p[1] - 45] as Pt), ...river.map((p) => [p[0], p[1] + 45] as Pt).reverse()];
  way([...rb, rb[0]], { natural: 'water', name: 'Assiniboine River' });
  way(subdiv([xW - 300, zN - 70], [xE + 300, zN - 70], 80), { railway: 'rail' });
  way(subdiv([xW - 300, zN - 82], [xE + 300, zN - 82], 80), { railway: 'rail' });
  gway([[streetX(18), zN], [streetX(18), zN - 400]], { highway: 'primary', name: '18th Street' });
  way(subdiv([streetX(18), zN - 400], [streetX(18), zN - 1000], 60), { highway: 'primary', name: '18th Street', bridge: 'yes' });
  gway([[streetX(1), zN], [streetX(1), zN - 400]], { highway: 'primary', name: '1st Street' });
  way(subdiv([streetX(1), zN - 400], [streetX(1), zN - 1000], 60), { highway: 'primary', name: '1st Street', bridge: 'yes' });
  const rect = (x0: number, z0: number, x1: number, z1: number): Pt[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  way(rect(xW - 200, zN - 690, xE + 200, zN - 110), { leisure: 'park', name: 'Assiniboine river valley' });
  // parks + landmarks (blocks are street n .. n-1 in x, avenue a..b in z)
  const blk = (sW: number, sE: number, aN: number, aS: number, inset = 12) => rect(streetX(sW) + inset, avZ(aN) + inset, streetX(sE) - inset, avZ(aS) - inset);
  way(blk(10, 9, 1000, 1100), { leisure: 'park', name: 'Rideau Park' });
  way(blk(4, 3, 600, 700), { leisure: 'park', name: 'Stanley Park' });
  way(blk(8, 7, 1300, 1400), { leisure: 'park', name: 'Neighbourhood green' });
  const bld = (pts: Pt[], tags: Record<string, string>) => way(pts, { building: 'yes', ...tags });
  // Brandon University (18th–20th St would be off-grid; placed on the 18th St edge), ACC, Keystone, grocery, downtown
  bld(rect(streetX(18) + 20, avZ(200) + 25, streetX(17) - 20, avZ(300) - 20), { name: 'Brandon University — Clark Hall', amenity: 'university', 'building:levels': '3' });
  bld(rect(streetX(18) + 20, avZ(300) + 20, streetX(17) - 30, avZ(400) - 20), { name: 'Brandon University — Library', amenity: 'university', 'building:levels': '3' });
  bld(rect(streetX(1) - 70, avZ(1000) + 20, streetX(1) - 14, avZ(1100) - 30), { name: 'Assiniboine College (approx.)', amenity: 'college', 'building:levels': '2' });
  bld(rect(streetX(17) + 14, avZ(1100) + 30, streetX(14) - 14, avZ(1300) - 40), { name: 'Keystone Centre', leisure: 'sports_centre', 'building:levels': '3' });
  way(rect(streetX(14) + 4, avZ(1100) + 30, streetX(13) - 14, avZ(1300) - 40), { amenity: 'parking' });
  bld(rect(streetX(10) + 16, avZ(500) + 22, streetX(9) - 40, avZ(600) - 60), { name: 'Grocery store', shop: 'supermarket', 'building:levels': '1' });
  way(rect(streetX(9) - 38, avZ(500) + 22, streetX(9) - 12, avZ(600) - 60), { amenity: 'parking' });
  bld(rect(streetX(9) + 30, avZ(400) + 20, streetX(8) - 30, avZ(500) - 30), { name: 'City Hall', amenity: 'townhall', 'building:levels': '2' });
  // downtown commercial blocks along Rosser / Princess between 6th and 13th
  const rnd = mulberry(77);
  for (let n = 13; n > 5; n--) for (const [aN, aS] of [[0, 100], [100, 200], [200, 300]] as const) {
    const x0 = streetX(n) + 9, x1 = streetX(n - 1) - 9;
    for (const side of [0, 1]) {
      let x = x0; const zA = side ? avZ(aS) - 9 : avZ(aN) + 9;
      while (x < x1 - 8) { const w = Math.min(x1 - x, 10 + rnd() * 22), d = 24 + rnd() * 30; const z0 = side ? zA - d : zA, z1 = side ? zA : zA + d;
        bld(rect(x, z0, x + w - 0.4, z1), { 'building:levels': String(1 + Math.floor(rnd() * rnd() * 6)), shop: 'yes' }); x += w; }
    }
  }
  // church footprint so the lot is reserved (east side of 5th St, door facing west)
  bld(rect(-12, -4.6, 9, 4.6), { name: 'Ethiopian Orthodox Tewahedo Medhane Alem Church', amenity: 'place_of_worship', 'addr:housenumber': '1260', 'addr:street': '5th Street' });
  churchWayId = wid - 1;
}

// ---------- classify ----------
const nodes = new Map<number, Pt>();
for (const e of elements) if (e.type === 'node') nodes.set(e.id, proj(e.lat!, e.lon!));
const inRange = (p: Pt) => (source === 'osm' ? Math.abs(p[0]) < RADIUS && Math.abs(p[1]) < RADIUS : Math.abs(p[0]) < 2300 && Math.abs(p[1]) < 3700 && p[1] < 1700);

const ROADW: Record<string, [number, number, boolean]> = { // width, lanes, sidewalks
  motorway: [15, 4, false], trunk: [15, 4, true], primary: [15, 4, true], secondary: [12.5, 2, true], tertiary: [11, 2, true],
  residential: [9, 2, true], unclassified: [8.5, 2, true], living_street: [7, 2, false], service: [4.2, 1, false],
  trunk_link: [7, 1, false], primary_link: [7, 1, false], secondary_link: [7, 1, false], tertiary_link: [7, 1, false],
  footway: [1.8, 0, false], path: [1.8, 0, false], cycleway: [2.2, 0, false], pedestrian: [5, 0, false], track: [3, 1, false],
};
const roads: Road[] = [], buildings: Building[] = [], areas: Area[] = [], rails: Pt[][] = [];
const nodeUse = new Map<number, number>();
const roadNodeIds: number[][] = [];
let church: { pts: Pt[] } | null = null;

for (const e of elements) {
  if (e.type !== 'way' || !e.nodes || !e.tags) continue;
  const t = e.tags;
  const pts = e.nodes.map((n) => nodes.get(n)).filter(Boolean) as Pt[];
  if (pts.length < 2 || !pts.some(inRange)) continue;
  if (t.highway && ROADW[t.highway]) {
    if (t.area === 'yes' || t.footway === 'sidewalk' || t.footway === 'crossing' || t.access === 'private') continue;
    // driveways and parking aisles cut straight through house lots: they are not drawn or driven
    if (t.highway === 'service' && (t.service === 'driveway' || t.service === 'parking_aisle' || t.service === 'drive-through')) continue;
    if (t.highway === 'service' && t.service !== 'alley' && !t.name) { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); if (L < 60) continue; }
    if (!pts.every((p) => Math.abs(p[0]) < RADIUS * 1.25 && Math.abs(p[1]) < RADIUS * 1.25) && source === 'osm') { /* clip long roads to the play area */ }
    let [w, lanes, sw] = ROADW[t.highway];
    if (t.lanes && Number(t.lanes) > 0 && lanes > 0) { lanes = Number(t.lanes); w = Math.max(w, lanes * 3.4 + 1.5); }
    if (t.highway === 'service' && t.service === 'parking_aisle') w = 5.5;
    const drivable = lanes > 0;
    let rp = pts; if (source === 'osm') { const lim = RADIUS * 1.08; const ins = pts.map((p) => Math.abs(p[0]) < lim && Math.abs(p[1]) < lim); const f = ins.indexOf(true), l = ins.lastIndexOf(true); if (f < 0 || l - f < 1) continue; rp = pts.slice(f, l + 1); e.nodes = e.nodes.filter((n) => nodes.has(n)).slice(f, l + 1); }
    roads.push({ id: e.id, kind: t.highway, name: t.name ?? '', w, lanes, oneway: t.oneway === 'yes' || t.junction === 'roundabout', pts: rp.map((p) => [r1(p[0]), r1(p[1])]), sidewalk: sw, surface: t.surface ?? (t.service === 'alley' ? 'gravel' : 'asphalt') });
    roadNodeIds.push(drivable ? e.nodes.filter((n) => nodes.has(n)) : []);
    if (drivable) for (const n of e.nodes) nodeUse.set(n, (nodeUse.get(n) ?? 0) + 1);
  } else if (t.building) {
    if (pts.length < 4) continue;
    const ring = pts.slice(0, -1).map((p) => [r1(p[0]), r1(p[1])] as Pt);
    if (e.id === churchWayId) { church = { pts: ring }; continue; }
    const big = area(ring) > 450;
    const kind = t.amenity === 'place_of_worship' ? 'church' : /university|college|school/.test(t.amenity ?? t.building) ? 'school'
      : /house|detached|residential|semidetached_house|bungalow/.test(t.building) ? 'house' : /garage|shed|garages|carport/.test(t.building) ? 'garage'
      : /apartments|dormitory|hotel/.test(t.building) ? 'apartments' : t.shop || t.office || /retail|commercial|office|industrial|warehouse|supermarket/.test(t.building) || big ? 'commercial' : 'house';
    buildings.push({ id: e.id, pts: ring, levels: Number(t['building:levels']) || 0, kind, name: t.name ?? '', num: t['addr:housenumber'] ?? '' });
  } else if (t.railway === 'rail') rails.push(pts.map((p) => [r1(p[0]), r1(p[1])]));
  else {
    const kind = t.natural === 'water' || t.waterway === 'riverbank' ? 'water' : t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'recreation_ground' || t.landuse === 'grass' || t.leisure === 'playground' ? 'park'
      : t.leisure === 'pitch' ? 'pitch' : t.amenity === 'parking' ? 'parking' : t.natural === 'wood' || t.landuse === 'forest' ? 'wood' : t.landuse === 'cemetery' ? 'park' : '';
    if (kind && pts.length >= 4) areas.push({ kind, name: t.name ?? '', pts: pts.slice(0, -1).map((p) => [r1(p[0]), r1(p[1])]) });
    else if (t.waterway === 'river' && !areas.some((a) => a.kind === 'water' && a.name === (t.name ?? ''))) {
      // centreline only: buffer to a polygon
      const half = 40, L: Pt[] = [], R: Pt[] = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; L.push([r1(pts[i][0] - (dz / l) * half), r1(pts[i][1] + (dx / l) * half)]); R.push([r1(pts[i][0] + (dz / l) * half), r1(pts[i][1] - (dx / l) * half)]); }
      areas.push({ kind: 'water', name: t.name ?? 'river', pts: [...L, ...R.reverse()] });
    }
  }
}

// ---------- sanity: no building may sit on a road ----------
{
  const before = buildings.length;
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i]; let bad = false;
    const test = [centroid(b.pts), ...b.pts];
    for (const r of roads) { if (r.lanes === 0) continue; const hw = r.w / 2 + 0.6; for (let k = 0; k < r.pts.length - 1 && !bad; k++) { const A = r.pts[k], B = r.pts[k + 1]; if (Math.min(A[0], B[0]) - 30 > test[0][0] || Math.max(A[0], B[0]) + 30 < test[0][0] || Math.min(A[1], B[1]) - 30 > test[0][1] || Math.max(A[1], B[1]) + 30 < test[0][1]) continue; for (const p of test) if (segDist(p, A, B) < hw) { bad = true; break; } } if (bad) break; }
    if (bad) buildings.splice(i, 1);
  }
  if (before !== buildings.length) console.log(`removed ${before - buildings.length} footprints that overlapped a road`);
}

// 5th Street beside the church is a gravel road (Street View)
for (const r of roads) if (/^5th Street/i.test(r.name) && r.pts.some((q) => Math.hypot(q[0], q[1]) < 150)) r.surface = 'gravel';

// ---------- church placement ----------
let churchInfo = { x: 0, z: 0, yaw: 0, street: '5th Street' };
{
  // facing: toward the nearest named drivable road
  let best = 1e9, bx = -1, bz = 0;
  // the address is on 5th Street: face that street when it is close by, otherwise the nearest street
  const addrRoad = roads.some((r) => /^5th Street/i.test(r.name) && r.pts.some((p, i) => i < r.pts.length - 1 && segDist([0, 0], p, r.pts[i + 1]) < 60));
  for (const r of roads) { if (r.lanes === 0 || r.kind === 'service' || (addrRoad && !/^5th Street/i.test(r.name))) continue; for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const d = segDist([0, 0], a, b); if (d < best) { best = d; const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, (-a[0] * dx - a[1] * dz) / l2)); bx = a[0] + t * dx; bz = a[1] + t * dz; churchInfo.street = r.name || churchInfo.street; } } }
  // model's front faces local -z; yaw rotates it toward the street
  const snap = Math.round(Math.atan2(-bx, -bz) / (Math.PI / 2)) * (Math.PI / 2);
  churchInfo.yaw = snap;
  if (church) { const c = centroid(church.pts); churchInfo.x = r1(c[0]); churchInfo.z = r1(c[1]); }
  guessed.push(source === 'fallback' ? 'Church orientation: assumed on the EAST side of 5th Street with the front door facing WEST.' : `Church orientation: front door assumed to face ${churchInfo.street} (from the address); please confirm.`);
}

// ---------- nav graph (drivable roads) ----------
const navIndex = new Map<number, number>();
const navNodes: [number, number, number][] = []; // x, z, flags (1 = junction, 2 = stop for minor, 4 = signal)
const navEdges: [number, number, number][] = []; // a, b, roadIndex   (a->b legal; if !oneway also b->a)
roads.forEach((r, ri) => {
  const ids = roadNodeIds[ri]; if (ids.length < 2) return;
  let prev = -1;
  for (const n of ids) {
    if (!navIndex.has(n)) { const p = nodes.get(n)!; navIndex.set(n, navNodes.length); navNodes.push([r1(p[0]), r1(p[1]), (nodeUse.get(n) ?? 0) > 1 ? 1 : 0]); }
    const cur = navIndex.get(n)!;
    if (prev >= 0 && prev !== cur) navEdges.push([prev, cur, ri]);
    prev = cur;
  }
});

// ---------- generated houses where OSM has no footprints ----------
const cellSize = 32;
const bGrid = new Map<string, Building[]>();
const key = (x: number, z: number) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
const addToGrid = (b: Building) => { const c = centroid(b.pts); const k = key(c[0], c[1]); (bGrid.get(k) ?? bGrid.set(k, []).get(k)!).push(b); };
buildings.forEach(addToGrid);
const nearBuilding = (p: Pt, r: number) => { const cx = Math.floor(p[0] / cellSize), cz = Math.floor(p[1] / cellSize), n = Math.ceil(r / cellSize) + 1; for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (const b of bGrid.get(`${cx + i},${cz + j}`) ?? []) { const c = centroid(b.pts); const br = Math.sqrt(area(b.pts)) * 0.6; if (Math.hypot(c[0] - p[0], c[1] - p[1]) < r + br) return true; } return false; };
const rGrid = new Map<string, [Pt, Pt, number][]>();
for (const r of roads) for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / cellSize) + 1; for (let s = 0; s <= n; s++) { const k = key(a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n); const arr = rGrid.get(k) ?? rGrid.set(k, []).get(k)!; if (!arr.some((e) => e[0] === a && e[1] === b)) arr.push([a, b, r.w / 2]); } }
const roadClear = (p: Pt, r: number) => { const cx = Math.floor(p[0] / cellSize), cz = Math.floor(p[1] / cellSize); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const [a, b, hw] of rGrid.get(`${cx + i},${cz + j}`) ?? []) if (segDist(p, a, b) < r + hw) return false; return true; };
const blockers = areas.filter((a) => a.kind !== 'wood');
const inArea = (p: Pt) => blockers.some((a) => pip(p, a.pts));
let genCount = 0, gid = -1;
for (const r of source === 'osm' ? [] : roads) { // real footprints exist: never invent houses
  if (!['residential', 'tertiary', 'unclassified', 'secondary'].includes(r.kind)) continue;
  const rnd = mulberry(r.id * 7919 + 13);
  for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i], b = r.pts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 24) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, nx = -uz, nz = ux;
    for (const side of [-1, 1]) {
      let s = 14 + rnd() * 4;
      while (s < len - 14) {
        const lotW = 13.5 + rnd() * 4; const w = 7.2 + rnd() * 2.6, d = 8.5 + rnd() * 4.5; const setback = r.w / 2 + 9.5 + rnd() * 2.5;
        const cx = a[0] + ux * (s + lotW / 2) + nx * side * (setback + d / 2), cz = a[1] + uz * (s + lotW / 2) + nz * side * (setback + d / 2);
        s += lotW;
        const c: Pt = [cx, cz];
        if (!inRange(c) || Math.hypot(cx - churchInfo.x, cz - churchInfo.z) < 24) continue;
        if (nearBuilding(c, 9) || !roadClear(c, Math.max(w, d) / 2 + 2.5) || inArea(c)) continue;
        const hw = w / 2, hd = d / 2;
        const pts: Pt[] = ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as Pt[]).map(([lx, lz]) => [r1(cx + ux * lx + nx * side * lz), r1(cz + uz * lx + nz * side * lz)]);
        const bd: Building = { id: gid--, pts, levels: 0, kind: 'house', name: '', num: '', gen: true };
        buildings.push(bd); addToGrid(bd); genCount++;
        // detached garage toward the back lane
        if (rnd() < 0.6) {
          const gx = cx + ux * (lotW * 0.22) + nx * side * (d / 2 + 16 + rnd() * 6), gz = cz + uz * (lotW * 0.22) + nz * side * (d / 2 + 16 + rnd() * 6);
          const g: Pt = [gx, gz];
          if (!nearBuilding(g, 5) && roadClear(g, 4.5) && !inArea(g)) { const gw = 2.4 + rnd() * 1.2, gd = 3.1; const gp: Pt[] = ([[-gw, -gd], [gw, -gd], [gw, gd], [-gw, gd]] as Pt[]).map(([lx, lz]) => [r1(gx + ux * lx + nx * side * lz), r1(gz + uz * lx + nz * side * lz)]); const gb: Building = { id: gid--, pts: gp, levels: 1, kind: 'garage', name: '', num: '', gen: true }; buildings.push(gb); addToGrid(gb); }
        }
      }
    }
  }
}
if (genCount) guessed.push(`${genCount} houses were generated procedurally along residential streets where the map had no building footprints.`);

// ---------- trees & power poles ----------
interface Tree { x: number; z: number; s: number; t: number }
const trees: Tree[] = [], poles: [number, number, number][] = [];
for (const r of roads) {
  const rnd = mulberry(r.id * 31 + 5);
  if (['residential', 'tertiary', 'unclassified', 'secondary'].includes(r.kind)) {
    for (let i = 0; i < r.pts.length - 1; i++) {
      const a = r.pts[i], b = r.pts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 20) continue;
      const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
      for (const side of [-1, 1]) for (let s = 11 + rnd() * 6; s < len - 10; s += 11 + rnd() * 9) {
        if (rnd() < 0.22) continue;
        const off = r.w / 2 + 1.35; const x = a[0] + ux * s - uz * side * off, z = a[1] + uz * s + ux * side * off;
        if (!inRange([x, z]) || !roadClear([x, z], 0.6) || Math.hypot(x - churchInfo.x, z - churchInfo.z) < 9) continue;
        trees.push({ x: r1(x), z: r1(z), s: r1(0.8 + rnd() * 0.55), t: rnd() < 0.6 ? 0 : 1 }); // 0 elm, 1 ash
      }
    }
  } else if (r.kind === 'service' && r.surface === 'gravel') {
    for (let i = 0; i < r.pts.length - 1; i++) { const a = r.pts[i], b = r.pts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len; for (let s = 8; s < len; s += 42) { const x = a[0] + ux * s - uz * 2.9, z = a[1] + uz * s + ux * 2.9; if (inRange([x, z])) poles.push([r1(x), r1(z), r1(Math.atan2(ux, uz))]); } }
  }
}
// yard / park trees
for (const b of buildings) { if (b.kind !== 'house') continue; const rnd = mulberry(Math.abs(b.id) * 97 + 3); if (rnd() < 0.45) { const c = centroid(b.pts); const an = rnd() * 6.28, d = 9 + rnd() * 5; const p: Pt = [c[0] + Math.cos(an) * d, c[1] + Math.sin(an) * d]; if (roadClear(p, 2) && !nearBuilding(p, 2.5)) trees.push({ x: r1(p[0]), z: r1(p[1]), s: r1(0.6 + rnd() * 0.6), t: rnd() < 0.3 ? 2 : rnd() < 0.5 ? 0 : 1 }); } } // 2 = spruce
for (const a of areas) { if (a.kind !== 'park' && a.kind !== 'wood') continue; const rnd = mulberry(Math.round(a.pts[0][0] * 13 + a.pts[0][1] * 7)); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9; for (const p of a.pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); } const n = Math.min(900, ((maxX - minX) * (maxZ - minZ)) / (a.kind === 'wood' ? 90 : 420)); for (let i = 0; i < n; i++) { const p: Pt = [minX + rnd() * (maxX - minX), minZ + rnd() * (maxZ - minZ)]; if (pip(p, a.pts) && inRange(p) && roadClear(p, 2) && !areas.some((w) => w.kind === 'water' && pip(p, w.pts))) trees.push({ x: r1(p[0]), z: r1(p[1]), s: r1(0.7 + rnd() * 0.7), t: rnd() < 0.2 ? 2 : rnd() < 0.5 ? 0 : 1 }); } }

// ---------- POIs / landmarks ----------
const pois: { name: string; kind: string; x: number; z: number }[] = [{ name: 'Medhane Alem Church', kind: 'church', x: churchInfo.x, z: churchInfo.z }];
const want: [RegExp, string][] = [[/brandon university|clark hall/i, 'university'], [/assiniboine (community )?college/i, 'college'], [/keystone centre|keystone center/i, 'keystone'], [/sobeys|safeway|superstore|co-?op|grocery|giant tiger|supermarket/i, 'grocery'], [/city hall/i, 'cityhall']];
for (const b of buildings) { if (!b.name) continue; for (const [re, kind] of want) if (re.test(b.name) && !pois.some((p) => p.kind === kind)) { const c = centroid(b.pts); pois.push({ name: b.name, kind, x: r1(c[0]), z: r1(c[1]) }); } }
for (const e of elements) { if (!e.tags?.name || e.type === 'node' && !nodes.has(e.id)) continue; if (e.type !== 'node') continue; const p = nodes.get(e.id)!; if (!inRange(p)) continue; for (const [re, kind] of want) if (re.test(e.tags.name) && !pois.some((q) => q.kind === kind)) pois.push({ name: e.tags.name, kind, x: r1(p[0]), z: r1(p[1]) }); }
for (const [, kind] of want) if (!pois.some((p) => p.kind === kind)) guessed.push(`Landmark "${kind}" was not found in the map data.`);

// ---------- write ----------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (/^c_.*\.json$/.test(f)) fs.unlinkSync(path.join(OUT, f));
const chunks = new Map<string, { b: Building[]; t: number[][]; p: number[][] }>();
const ck = (x: number, z: number) => `${Math.floor(x / CHUNK)}_${Math.floor(z / CHUNK)}`;
const getC = (k: string) => chunks.get(k) ?? chunks.set(k, { b: [], t: [], p: [] }).get(k)!;
for (const b of buildings) { const c = centroid(b.pts); if (inRange(c)) getC(ck(c[0], c[1])).b.push(b); }
for (const t of trees) getC(ck(t.x, t.z)).t.push([t.x, t.z, t.s, t.t]);
for (const p of poles) getC(ck(p[0], p[1])).p.push(p);
for (const [k, c] of chunks) fs.writeFileSync(path.join(OUT, `c_${k}.json`), JSON.stringify(c));
let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
for (const r of roads) for (const p of r.pts) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); }
const world = { source, origin, chunk: CHUNK, bounds: { minX, maxX, minZ, maxZ }, church: churchInfo, roads, areas, rails, nav: { nodes: navNodes, edges: navEdges }, pois, chunks: [...chunks.keys()], guessed };
fs.writeFileSync(path.join(OUT, 'world.json'), JSON.stringify(world));
console.log(`source=${source} roads=${roads.length} buildings=${buildings.length} (generated ${genCount}) areas=${areas.length} trees=${trees.length} nav=${navNodes.length}/${navEdges.length} chunks=${chunks.size}`);
console.log('bounds', minX | 0, maxX | 0, minZ | 0, maxZ | 0, 'church', churchInfo);
console.log(guessed.join('\n'));

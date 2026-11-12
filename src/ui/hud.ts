// HUD: minimap, objectives, prompts, subtitles, title/phone menus, touch controls.
import type { Game } from '../game';

const el = (tag: string, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const PX = 0.4; // map pixels per metre

export class Hud {
  root = document.getElementById('ui')!;
  private mini!: HTMLCanvasElement; private mapBase!: HTMLCanvasElement; private mapX0 = 0; private mapZ0 = 0;
  private objEl!: HTMLElement; private promptEl!: HTMLElement; private subEl!: HTMLElement; private toastEl!: HTMLElement; private cardEl!: HTMLElement; private fadeEl!: HTMLElement; private infoEl!: HTMLElement; private speedEl!: HTMLElement; private radioEl!: HTMLElement;
  private barTop!: HTMLElement; private barBot!: HTMLElement; private phoneEl!: HTMLElement; private titleEl!: HTMLElement; private touchEl!: HTMLElement; private loadEl!: HTMLElement; private timerEl!: HTMLElement;
  waypoint: { x: number; z: number } | null = null; target: { x: number; z: number } | null = null; route: number[][] = [];
  phoneOpen = false; titleOpen = false; private toastT = 0; private routeT = 0; private tab = 'map';
  hidden = false; private miniTick = 0;

  constructor(private g: Game) {
    const r = this.root;
    r.append(
      (this.fadeEl = el('div', 'fade')), (this.barTop = el('div', 'bar top')), (this.barBot = el('div', 'bar bot')),
      (this.objEl = el('div', 'objective')), (this.promptEl = el('div', 'prompt')), (this.subEl = el('div', 'subtitle')), (this.toastEl = el('div', 'toast')), (this.cardEl = el('div', 'card')),
      (this.infoEl = el('div', 'info')), (this.speedEl = el('div', 'speed')), (this.radioEl = el('div', 'radio')), (this.timerEl = el('div', 'timer')),
    );
    const mw = el('div', 'miniwrap'); this.mini = document.createElement('canvas'); this.mini.width = this.mini.height = 200; mw.append(this.mini); r.append(mw);
    r.append((this.phoneEl = el('div', 'phone')), (this.titleEl = el('div', 'title')), (this.touchEl = el('div', 'touch')), (this.loadEl = el('div', 'loading', `<div class="lt">${g.i18n.t('title')}</div><div class="ls">${g.i18n.t('loading')}</div>`)));
    this.buildMapBase(); this.buildTouch();
    g.i18n.listeners.push(() => { if (this.phoneOpen) this.renderPhone(); if (this.titleOpen) this.showTitle(); });
  }
  loading(on: boolean) { this.loadEl.style.display = on ? 'flex' : 'none'; }

  // ---------------------------------------------------------------- map
  private buildMapBase() {
    const d = this.g.world.data, b = d.bounds, m = 60; this.mapX0 = b.minX - m; this.mapZ0 = b.minZ - m;
    const c = (this.mapBase = document.createElement('canvas')); c.width = Math.ceil((b.maxX - b.minX + 2 * m) * PX); c.height = Math.ceil((b.maxZ - b.minZ + 2 * m) * PX);
    const x = c.getContext('2d')!; const X = (v: number) => (v - this.mapX0) * PX, Z = (v: number) => (v - this.mapZ0) * PX;
    x.fillStyle = '#20262b'; x.fillRect(0, 0, c.width, c.height);
    const poly = (pts: number[][], fill: string) => { x.fillStyle = fill; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.closePath(); x.fill(); };
    for (const a of d.areas) poly(a.pts, a.kind === 'water' ? '#2f5d7a' : a.kind === 'parking' ? '#33383d' : '#2c4a36');
    x.lineCap = 'round'; x.lineJoin = 'round';
    const order = ['service', 'footway', 'path', 'residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk'];
    for (const kind of order) for (const rd of d.roads) { if (rd.kind !== kind && !(kind === 'residential' && !order.includes(rd.kind))) continue; x.strokeStyle = kind === 'primary' || kind === 'trunk' ? '#d8c890' : kind === 'secondary' ? '#c9c9c0' : kind === 'service' || rd.lanes === 0 ? '#4a5056' : '#8f969c'; x.lineWidth = Math.max(1, rd.w * PX * (rd.lanes === 0 ? 0.6 : 0.9)); x.beginPath(); rd.pts.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.stroke(); }
    x.strokeStyle = '#5a4a44'; x.lineWidth = 1.5; x.setLineDash([4, 3]); for (const rl of d.rails) { x.beginPath(); rl.forEach((p, i) => (i ? x.lineTo(X(p[0]), Z(p[1])) : x.moveTo(X(p[0]), Z(p[1])))); x.stroke(); } x.setLineDash([]);
  }
  private drawMarkers(x: CanvasRenderingContext2D, T: (wx: number, wz: number) => [number, number], big: boolean) {
    const g = this.g; const s = big ? 1.5 : 1;
    if (this.route.length > 1) { x.strokeStyle = '#ffd24a'; x.lineWidth = 3 * s; x.beginPath(); this.route.forEach((p, i) => { const [a, b] = T(p[0], p[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke(); }
    for (const p of g.world.data.pois) { const [a, b] = T(p.x, p.z); if (p.kind === 'church') { x.fillStyle = '#f2c84a'; x.fillRect(a - 2 * s, b - 7 * s, 4 * s, 14 * s); x.fillRect(a - 6 * s, b - 3 * s, 12 * s, 4 * s); } else { x.fillStyle = '#9fd0ff'; x.beginPath(); x.arc(a, b, 4 * s, 0, 7); x.fill(); if (big) { x.fillStyle = '#e8eef4'; x.font = '12px Noto Sans'; x.fillText(p.name, a + 8, b + 4); } } }
    if (big) { x.fillStyle = '#f2c84a'; x.font = '600 13px Noto Sans'; const [a, b] = T(g.world.data.church.x, g.world.data.church.z); x.fillText(g.i18n.t('church'), a + 10, b + 4); }
    for (const [pt, col] of [[this.target, '#ffd24a'], [this.waypoint, '#ff5ad0']] as const) if (pt) { const [a, b] = T(pt.x, pt.z); x.fillStyle = col; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(a, b, 6 * s, 0, 7); x.fill(); x.stroke(); }
  }
  private drawMini() {
    const g = this.g, c = this.mini, x = c.getContext('2d')!; const p = g.focusPos, W = c.width; const scale = g.mode === 'car' ? 0.75 : 1.1; // px per metre on the minimap
    x.save(); x.clearRect(0, 0, W, W); x.beginPath(); x.arc(W / 2, W / 2, W / 2 - 2, 0, 7); x.clip(); x.fillStyle = '#20262b'; x.fillRect(0, 0, W, W);
    const rot = g.rig.yaw; // camera yaw: forward on screen = up
    x.translate(W / 2, W / 2); x.rotate(rot); x.scale(scale / PX, scale / PX); x.translate(-(p.x - this.mapX0) * PX, -(p.z - this.mapZ0) * PX);
    { // draw only the part of the map around the player (cropped source rect: far cheaper than the whole canvas)
      const half = (W / scale) * PX * 0.75, cx = (p.x - this.mapX0) * PX, cz = (p.z - this.mapZ0) * PX; const sx = Math.max(0, cx - half), sy = Math.max(0, cz - half), ex = Math.min(this.mapBase.width, cx + half), ey = Math.min(this.mapBase.height, cz + half);
      x.imageSmoothingQuality = 'low'; if (ex > sx && ey > sy) x.drawImage(this.mapBase, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy); }
    x.scale(PX, PX); x.translate(-this.mapX0, -this.mapZ0);
    const k = 1 / scale; x.lineWidth = 3 * k;
    if (this.route.length > 1) { x.strokeStyle = '#ffd24a'; x.beginPath(); this.route.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.stroke(); }
    const cd = g.world.data.church; x.fillStyle = '#f2c84a'; x.save(); x.translate(cd.x, cd.z); x.rotate(-rot); x.fillRect(-2 * k, -7 * k, 4 * k, 14 * k); x.fillRect(-6 * k, -3 * k, 12 * k, 4 * k); x.restore();
    x.fillStyle = '#c8d0d8'; for (const a of g.traffic.ai) { x.fillRect(a.car.pos.x - 2 * k, a.car.pos.z - 2 * k, 4 * k, 4 * k); }
    x.restore();
    // edge-clamped objective / waypoint markers
    for (const [pt, col] of [[this.target, '#ffd24a'], [this.waypoint, '#ff5ad0']] as const) if (pt) {
      let dx = (pt.x - p.x) * scale, dz = (pt.z - p.z) * scale; const cr = Math.cos(rot), sr = Math.sin(rot); let sx = dx * cr - dz * sr, sy = dx * sr + dz * cr; const d = Math.hypot(sx, sy), lim = W / 2 - 10; if (d > lim) { sx *= lim / d; sy *= lim / d; }
      x.fillStyle = col; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(W / 2 + sx, W / 2 + sy, 6, 0, 7); x.fill(); x.stroke();
    }
    // player arrow
    const heading = g.mode === 'car' && g.activeCar ? Math.atan2(-g.activeCar.forward().x, -g.activeCar.forward().z) : g.player.yaw;
    x.save(); x.translate(W / 2, W / 2); x.rotate(rot - heading); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3); x.lineTo(-6, 7); x.closePath(); x.fill(); x.stroke(); x.restore();
    // north tick
    x.save(); x.translate(W / 2, W / 2); x.rotate(rot); x.fillStyle = '#ff6a5a'; x.font = '700 12px Noto Sans'; x.textAlign = 'center'; x.fillText('N', 0, -W / 2 + 16); x.restore();
  }

  setWaypoint(p: { x: number; z: number } | null) { this.waypoint = p; this.routeT = 0; this.toast(this.g.i18n.t(p ? 'waypointSet' : 'waypointClear')); }
  setTarget(p: { x: number; z: number } | null) { this.target = p; this.routeT = 0; }

  // ---------------------------------------------------------------- text
  objective(text: string) { this.objEl.innerHTML = text ? `<span>${this.g.i18n.t('objective')}</span>${text}` : ''; this.objEl.style.opacity = text ? '1' : '0'; }
  prompt(text: string | null) { const key = this.g.input.lastDevice === 'pad' ? 'Ⓧ' : this.g.input.lastDevice === 'touch' ? '●' : 'E'; this.promptEl.innerHTML = text ? `<b>${key}</b> ${text}` : ''; this.promptEl.style.opacity = text ? '1' : '0'; }
  promptRaw(html: string | null) { this.promptEl.innerHTML = html ?? ''; this.promptEl.style.opacity = html ? '1' : '0'; }
  subtitle(speaker: string, en: string, am?: string) { const l = this.g.i18n.lang; const main = l === 'am' && am ? am : en, alt = l === 'am' ? en : am; this.subEl.innerHTML = `${speaker ? `<div class="sp">${speaker}</div>` : ''}<div class="l1">${main}</div>${alt ? `<div class="l2">${alt}</div>` : ''}`; this.subEl.style.opacity = '1'; }
  hideSubtitle() { this.subEl.style.opacity = '0'; }
  toast(text: string, secs = 3) { this.toastEl.textContent = text; this.toastEl.style.opacity = '1'; this.toastT = secs; }
  async card(title: string, sub = '', secs = 3.5) { this.cardEl.innerHTML = `<div class="ct">${title}</div><div class="cs">${sub}</div>`; this.cardEl.style.opacity = '1'; await this.g.wait(secs); this.cardEl.style.opacity = '0'; }
  async fade(to: number, secs = 0.8) { this.fadeEl.style.transition = `opacity ${secs}s`; this.fadeEl.style.opacity = String(to); await this.g.wait(secs + 0.05); }
  letterbox(on: boolean) { this.barTop.style.height = this.barBot.style.height = on ? '10vh' : '0'; this.root.classList.toggle('cine', on); }
  timer(text: string) { this.timerEl.textContent = text; this.timerEl.style.opacity = text ? '1' : '0'; }
  radio(text: string) { this.radioEl.textContent = text; this.radioEl.style.opacity = '1'; setTimeout(() => (this.radioEl.style.opacity = '0'), 3500); }
  setHidden(h: boolean) { this.hidden = h; this.root.classList.toggle('hidden', h); }

  // ---------------------------------------------------------------- title + phone
  showTitle() {
    const g = this.g, t = (k: string) => g.i18n.t(k); this.titleOpen = true; this.titleEl.style.display = 'flex'; this.root.classList.add('cine');
    const has = g.save.has(); const prog = g.save.data.chapter;
    this.titleEl.innerHTML = `<div class="tbox"><div class="cross">✥</div><h1>${t('title')}</h1><h2>${t('subtitle')}</h2>
      <div class="tbtns">${has ? `<button data-a="continue">${t('continue')}</button>` : ''}<button data-a="new">${t('newGame')}</button><button data-a="roam">${t('freeRoam')}</button><button data-a="lang">${g.i18n.lang === 'en' ? 'አማርኛ' : 'English'}</button></div>
      <div class="chs">${g.story.chapters.map((c, i) => `<button class="ch" data-ch="${i}" ${i > prog ? 'disabled' : ''}><b>${i + 1}</b> ${g.i18n.pick(c.title, c.titleAm)}</button>`).join('')}</div>
      <div class="hint">${t('controls')}</div></div>`;
    this.titleEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const a = (b as HTMLElement).dataset.a, ch = (b as HTMLElement).dataset.ch; g.audio.unlock();
      if (a === 'lang') { g.i18n.toggle(); return; }
      this.titleOpen = false; this.titleEl.style.display = 'none'; this.root.classList.remove('cine');
      if (a === 'continue') g.story.start(g.save.data.chapter, false); else if (a === 'new') { g.save.reset(); g.story.start(0, true); } else if (a === 'roam') g.story.freeRoam(); else if (ch !== undefined) g.story.start(+ch, +ch === 0);
    }));
  }
  togglePhone(force?: boolean) {
    const open = force ?? !this.phoneOpen; if (open === this.phoneOpen) return; this.phoneOpen = open; this.phoneEl.style.display = open ? 'flex' : 'none';
    this.g.input.wantLock = !open; if (open) { document.exitPointerLock?.(); this.renderPhone(); }
  }
  private renderPhone() {
    const g = this.g, t = (k: string) => g.i18n.t(k); const tabs = ['map', 'missions', 'settings'];
    let body = '';
    if (this.tab === 'map') body = `<canvas class="bigmap"></canvas><div class="mhint">${g.i18n.pick('Tap the map to set a waypoint · tap the marker to clear', 'መድረሻ ለመምረጥ ካርታውን ይንኩ')}</div>`;
    else if (this.tab === 'missions') body = `<div class="mlist">${g.story.chapters.map((c, i) => `<div class="mi ${i === g.story.index ? 'cur' : ''}"><div><b>${t('chapter')} ${i + 1}: ${g.i18n.pick(c.title, c.titleAm)}</b><div class="md">${g.i18n.pick(c.desc, c.descAm)}</div></div><button data-ch="${i}" ${i > g.save.data.chapter ? 'disabled' : ''}>${i > g.save.data.chapter ? t('locked') : t('replay')}</button></div>`).join('')}<div class="mi"><div><b>${t('freeRoam')}</b></div><button data-a="roam">${t('replay')}</button></div></div>`;
    else {
      const opt = (label: string, key: string, vals: [string, string][], cur: string) => `<div class="row"><span>${label}</span><div>${vals.map(([v, l]) => `<button data-set="${key}" data-v="${v}" class="${v === cur ? 'on' : ''}">${l}</button>`).join('')}</div></div>`;
      body = `<div class="settings">${opt(t('language'), 'lang', [['en', 'English'], ['am', 'አማርኛ']], g.i18n.lang)}${opt(t('quality'), 'q', [['low', t('low')], ['high', t('high')], ['ultra', t('ultra')]], g.engine.quality)}
        ${opt(t('moustache'), 'mo', [['1', t('on')], ['0', t('off')]], g.save.data.moustache ? '1' : '0')}${opt(t('volume'), 'vol', [['0', '0'], ['0.4', '40'], ['0.8', '80'], ['1', '100']], String(g.audio.volume))}
        ${g.story.roaming ? opt(t('outfit'), 'outfit', [['netela', t('netela')], ['casual', t('casual')], ['netelaPuffer', t('winterOutfit')]], g.outfit) + opt(t('season'), 'season', [['summer', t('summer')], ['autumn', t('autumn')], ['winter', t('winter')], ['spring', t('spring')]], g.world.season) + opt(t('time'), 'time', [['7', '07:00'], ['12', '12:00'], ['17', '17:00'], ['22', '22:00']], '') : ''}
        <div class="row"><button data-a="photo">${t('photo')}</button><button data-a="save">${t('save')}</button><button data-a="title">${g.i18n.pick('Main menu', 'ዋና ማውጫ')}</button></div><div class="hint">${t('controls')}</div></div>`;
    }
    this.phoneEl.innerHTML = `<div class="pbox"><div class="ptabs">${tabs.map((k) => `<button data-tab="${k}" class="${k === this.tab ? 'on' : ''}">${t(k)}</button>`).join('')}<button data-a="close" class="x">✕</button></div><div class="pbody">${body}</div></div>`;
    this.phoneEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const d = (b as HTMLElement).dataset;
      if (d.tab) { this.tab = d.tab; this.renderPhone(); return; }
      if (d.a === 'close') return this.togglePhone(false);
      if (d.a === 'photo') { this.togglePhone(false); g.photo.enter(); return; }
      if (d.a === 'save') { g.save.write(); this.toast(t('saved')); return; }
      if (d.a === 'title') { this.togglePhone(false); g.story.abort(); this.showTitle(); return; }
      if (d.a === 'roam') { this.togglePhone(false); g.story.freeRoam(); return; }
      if (d.ch !== undefined) { this.togglePhone(false); g.story.start(+d.ch, false); return; }
      if (d.set) { const v = d.v!; if (d.set === 'lang') g.i18n.set(v as any); else if (d.set === 'q') { g.engine.setQuality(v as any); g.applyQuality(); } else if (d.set === 'mo') { g.save.data.moustache = v === '1'; g.setOutfit(g.outfit); } else if (d.set === 'vol') g.audio.setVolume(+v); else if (d.set === 'outfit') g.setOutfit(v as any); else if (d.set === 'season') g.setSeason(v as any); else if (d.set === 'time') { const dt = g.engine.date; g.engine.setDateTime(dt.getUTCMonth() + 1, dt.getUTCDate(), +v); } this.renderPhone(); }
    }));
    const big = this.phoneEl.querySelector('.bigmap') as HTMLCanvasElement | null;
    if (big) {
      const bw = this.mapBase.width, bh = this.mapBase.height; const maxH = Math.min(innerHeight * 0.66, 900), maxW = Math.min(innerWidth * 0.86, 900); const sc = Math.min(maxW / bw, maxH / bh); big.width = bw * sc; big.height = bh * sc;
      const x = big.getContext('2d')!; x.drawImage(this.mapBase, 0, 0, big.width, big.height);
      const T = (wx: number, wz: number): [number, number] => [(wx - this.mapX0) * PX * sc, (wz - this.mapZ0) * PX * sc];
      this.drawMarkers(x, T, true); const [pa, pb] = T(g.focusPos.x, g.focusPos.z); x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(pa, pb, 6, 0, 7); x.fill(); x.stroke();
      big.addEventListener('click', (e) => { const r = big.getBoundingClientRect(); const wx = (e.clientX - r.left) / sc / PX + this.mapX0, wz = (e.clientY - r.top) / sc / PX + this.mapZ0; if (this.waypoint && Math.hypot(this.waypoint.x - wx, this.waypoint.z - wz) < 40) this.setWaypoint(null); else this.setWaypoint({ x: wx, z: wz }); this.updateRoute(true); this.renderPhone(); });
    }
  }
  private updateRoute(force = false) {
    this.routeT -= 1; if (!force && this.routeT > 0) return; this.routeT = 90;
    const dest = this.waypoint ?? this.target; const p = this.g.focusPos;
    if (!dest || Math.hypot(dest.x - p.x, dest.z - p.z) < 25) { this.route = []; if (this.waypoint && dest === this.waypoint && Math.hypot(dest.x - p.x, dest.z - p.z) < 25) this.waypoint = null; return; }
    this.route = this.g.world.route(p.x, p.z, dest.x, dest.z);
  }

  // ---------------------------------------------------------------- touch
  private buildTouch() {
    const g = this.g, T = this.touchEl; const inp = g.input;
    T.innerHTML = `<div class="stick"><div class="knob"></div></div><div class="look"></div><div class="tb">
      <button data-b="interact" class="b1">E</button><button data-b="jump" class="b2">⤒</button><button data-b="enter" class="b3">🚗</button><button data-b="phone" class="b4">☰</button><button data-h="sprint" class="b5">»</button><button data-h="gas" class="b6">▲</button><button data-h="rev" class="b7">▼</button></div>`;
    const stick = T.querySelector('.stick') as HTMLElement, knob = T.querySelector('.knob') as HTMLElement, look = T.querySelector('.look') as HTMLElement;
    const on = () => { if (!inp.touch.active) { inp.touch.active = true; inp.lastDevice = 'touch'; T.classList.add('on'); } };
    addEventListener('touchstart', on, { passive: true, once: false });
    let sid = -1, lid = -1, lx = 0, ly = 0;
    stick.addEventListener('touchstart', (e) => { sid = e.changedTouches[0].identifier; e.preventDefault(); }, { passive: false });
    const moveStick = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === sid) { const r = stick.getBoundingClientRect(); let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } inp.touch.moveX = dx; inp.touch.moveY = -dy; knob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; } };
    stick.addEventListener('touchmove', (e) => { moveStick(e); e.preventDefault(); }, { passive: false });
    const endStick = (e: TouchEvent) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === sid) { sid = -1; inp.touch.moveX = inp.touch.moveY = 0; knob.style.transform = ''; } };
    stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);
    look.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    look.addEventListener('touchmove', (e) => { for (const t of Array.from(e.changedTouches)) if (t.identifier === lid) { inp.touch.lookDX += t.clientX - lx; inp.touch.lookDY += t.clientY - ly; lx = t.clientX; ly = t.clientY; } e.preventDefault(); }, { passive: false });
    look.addEventListener('touchend', () => (lid = -1));
    T.querySelectorAll('button').forEach((b) => {
      const d = (b as HTMLElement).dataset;
      b.addEventListener('touchstart', (e) => { e.preventDefault(); if (d.b) { inp.press(d.b as any); if (d.b === 'interact') inp.press('skip'); if (d.b === 'jump') inp.touch.brake = true; } if (d.h === 'sprint') inp.touch.sprint = true; if (d.h === 'gas') inp.touch.throttle = 1; if (d.h === 'rev') inp.touch.throttle = -1; }, { passive: false });
      b.addEventListener('touchend', () => { if (d.b === 'jump') inp.touch.brake = false; if (d.h === 'sprint') inp.touch.sprint = false; if (d.h === 'gas' || d.h === 'rev') inp.touch.throttle = 0; });
    });
  }

  update(dt: number) {
    const g = this.g;
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toastEl.style.opacity = '0'; }
    this.updateRoute();
    this.miniTick++; if (!this.hidden && !this.titleOpen && !this.root.classList.contains('cine') && (this.miniTick % 2 === 0)) this.drawMini();
    const h = g.engine.hour; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    this.infoEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${g.weather.tempC}°C`;
    const car = g.mode === 'car' ? g.activeCar : null; this.speedEl.style.opacity = car ? '1' : '0'; if (car) this.speedEl.innerHTML = `<b>${Math.round(Math.abs(car.speed) * 3.6)}</b> km/h`;
    this.touchEl.classList.toggle('car', !!car);
  }
}

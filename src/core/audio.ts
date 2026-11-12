// Audio: synthesized ambience and instruments (Web Audio), with optional recorded chant files from /audio/chant/.
export class Audio {
  ctx: AudioContext | null = null; master!: GainNode; dry!: GainNode; wet!: GainNode; private rev!: ConvolverNode;
  volume = 0.8; private noiseBuf!: AudioBuffer;
  private wind?: { g: GainNode; f: BiquadFilterNode }; private engine?: { o: OscillatorNode; o2: OscillatorNode; g: GainNode; f: BiquadFilterNode; tire: GainNode };
  private fire?: GainNode; private crowd?: GainNode; private drone?: { g: GainNode; stop: () => void }; private chantEl: HTMLAudioElement | null = null; private chantName = '';
  interior = 0; private birdT = 6; private trainT = 40; private stepPhase = 0; private patternT = 0; private patternI = 0; keberoOn = false; tsenatselOn = false;
  radioIndex = -1; readonly radioSlots = ['mezmur_01', 'mezmur_02', 'mezmur_03', 'mezmur_04', 'mezmur_05'];

  constructor() { try { const v = localStorage.getItem('ma.vol'); if (v !== null) this.volume = +v; } catch { /* ignore */ } }
  unlock() {
    if (this.ctx) { this.ctx.resume(); return; }
    try {
      const C = (window as any).AudioContext || (window as any).webkitAudioContext; const ctx: AudioContext = new C(); this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
      this.dry = ctx.createGain(); this.dry.connect(this.master); this.wet = ctx.createGain(); this.wet.gain.value = 0;
      this.rev = ctx.createConvolver(); const len = ctx.sampleRate * 1.1, ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      this.rev.buffer = ir; this.wet.connect(this.rev); this.rev.connect(this.master);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      // wind bed
      const ws = this.noise(true); const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 420; wf.Q.value = 0.6; const wg = ctx.createGain(); wg.gain.value = 0; ws.connect(wf); wf.connect(wg); wg.connect(this.master); this.wind = { g: wg, f: wf };
    } catch { this.ctx = null; }
  }
  setVolume(v: number) { this.volume = v; if (this.ctx) this.master.gain.value = v; try { localStorage.setItem('ma.vol', String(v)); } catch { /* ignore */ } }
  private noise(loop = false) { const s = this.ctx!.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop; s.start(0, Math.random() * 1.5); return s; }
  private out(g: AudioNode, reverb = 0.0) { g.connect(this.dry); if (reverb > 0 || this.interior > 0.5) { const r = this.ctx!.createGain(); r.gain.value = Math.max(reverb, this.interior * 0.5); g.connect(r); r.connect(this.wet); } }

  // ---- one-shots ----
  kebero(low = true, vel = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(low ? 118 : 210, t); o.frequency.exponentialRampToValueAtTime(low ? 62 : 150, t + 0.16); g.gain.setValueAtTime(0.9 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + (low ? 0.5 : 0.22)); o.connect(g); this.out(g, 0.25); o.start(t); o.stop(t + 0.6);
    const n = this.noise(), f = c.createBiquadFilter(), ng = c.createGain(); f.type = 'bandpass'; f.frequency.value = low ? 320 : 900; ng.gain.setValueAtTime(0.35 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07); n.connect(f); f.connect(ng); this.out(ng, 0.2); n.stop(t + 0.1); }
  tsenatsel(vel = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; for (let i = 0; i < 3; i++) { const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 5200 + i * 1400; f.Q.value = 9; const s = t + i * 0.028; g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.22 * vel, s + 0.006); g.gain.exponentialRampToValueAtTime(0.001, s + 0.16); n.connect(f); f.connect(g); this.out(g, 0.3); n.stop(s + 0.2); } }
  bell(freq = 660, vel = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; for (const [m, a, d] of [[1, 0.5, 2.6], [2.01, 0.28, 1.8], [2.76, 0.2, 1.3], [5.4, 0.1, 0.7], [8.9, 0.05, 0.4]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = freq * m; g.gain.setValueAtTime(a * 0.4 * vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); this.out(g, 0.35); o.start(t); o.stop(t + d + 0.1); } }
  step(snow: boolean, vel = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = snow ? 'bandpass' : 'lowpass'; f.frequency.value = snow ? 1700 : 500; f.Q.value = snow ? 1.4 : 0.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((snow ? 0.16 : 0.09) * vel, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + (snow ? 0.2 : 0.09)); n.connect(f); f.connect(g); this.out(g); n.stop(t + 0.25); }
  horn() { const c = this.ctx; if (!c) return; const t = c.currentTime; for (const fq of [392, 494]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = fq; g.gain.setValueAtTime(0.12, t); g.gain.setTargetAtTime(0, t + 0.35, 0.05); o.connect(g); this.out(g); o.start(t); o.stop(t + 0.6); } }
  chime() { this.bell(880, 0.5); setTimeout(() => this.bell(1320, 0.4), 140); }
  door() { const c = this.ctx; if (!c) return; const t = c.currentTime; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 240; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); n.connect(f); f.connect(g); this.out(g); n.stop(t + 0.3); }
  private crow() { const c = this.ctx; if (!c) return; const t0 = c.currentTime; const reps = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < reps; i++) { const t = t0 + i * 0.42; const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(380, t + 0.26); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.03); g.gain.linearRampToValueAtTime(0.0001, t + 0.28); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 55; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency); o.connect(f); f.connect(g); g.connect(this.dry); o.start(t); l.start(t); o.stop(t + 0.3); l.stop(t + 0.3); } }
  private magpie() { const c = this.ctx; if (!c) return; const t0 = c.currentTime; for (let i = 0; i < 7; i++) { const t = t0 + i * 0.085; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 5; g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); n.connect(f); f.connect(g); g.connect(this.dry); n.stop(t + 0.07); } }
  private train() { const c = this.ctx; if (!c) return; const t = c.currentTime; for (const fq of [311, 370, 466]) { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = fq; f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + 0.3); g.gain.setValueAtTime(0.018, t + 2.2); g.gain.linearRampToValueAtTime(0.0001, t + 3.2); o.connect(f); f.connect(g); g.connect(this.dry); const r = c.createGain(); r.gain.value = 0.8; g.connect(r); r.connect(this.wet); o.start(t); o.stop(t + 3.3); } }

  // ---- loops ----
  setEngine(on: boolean, speed = 0, throttle = 0, slush = 0) {
    const c = this.ctx; if (!c) return;
    if (on && !this.engine) { const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(this.dry); o.start(); o2.start(); const tn = this.noise(true), tf = c.createBiquadFilter(), tire = c.createGain(); tf.type = 'bandpass'; tf.frequency.value = 900; tf.Q.value = 0.4; tire.gain.value = 0; tn.connect(tf); tf.connect(tire); tire.connect(this.dry); this.engine = { o, o2, g, f, tire }; }
    if (!this.engine) return; const e = this.engine, t = c.currentTime;
    if (!on) { e.g.gain.setTargetAtTime(0, t, 0.1); e.tire.gain.setTargetAtTime(0, t, 0.1); return; }
    const sp = Math.abs(speed); const rpm = 38 + (sp % 14) * 5.5 + Math.min(sp, 40) * 1.2 + Math.abs(throttle) * 14; e.o.frequency.setTargetAtTime(rpm, t, 0.08); e.o2.frequency.setTargetAtTime(rpm * 0.502, t, 0.08); e.f.frequency.setTargetAtTime(240 + Math.abs(throttle) * 500 + sp * 12, t, 0.1);
    e.g.gain.setTargetAtTime(0.035 + Math.abs(throttle) * 0.03, t, 0.1); e.tire.gain.setTargetAtTime(Math.min(0.09, sp * 0.004) * (0.5 + slush), t, 0.1);
  }
  setFire(level: number) { const c = this.ctx; if (!c) return; if (!this.fire) { const n = this.noise(true), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.3; this.fire = c.createGain(); this.fire.gain.value = 0; const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 7.3; lg.gain.value = 0.04; l.connect(lg); lg.connect(this.fire.gain); l.start(); n.connect(f); f.connect(this.fire); this.fire.connect(this.dry); } this.fire.gain.setTargetAtTime(level * 0.14, c.currentTime, 0.5); }
  setCrowd(level: number) { const c = this.ctx; if (!c) return; if (!this.crowd) { const n = this.noise(true), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.8; this.crowd = c.createGain(); this.crowd.gain.value = 0; n.connect(f); f.connect(this.crowd); this.out(this.crowd, 0.4); } this.crowd.gain.setTargetAtTime(level * 0.05, c.currentTime, 0.6); }

  /** Chant/mezmur: plays /audio/chant/<name>.mp3 when the recording exists; otherwise a soft placeholder drone. */
  chant(name: string | null, vol = 0.8) {
    if (this.chantName === (name ?? '')) return; this.chantName = name ?? '';
    if (this.chantEl) { this.chantEl.pause(); this.chantEl = null; } if (this.drone) { this.drone.stop(); this.drone = undefined; }
    if (!name || !this.ctx) return;
    const a = new window.Audio(`${import.meta.env.BASE_URL}audio/chant/${name}.mp3`); a.loop = true; a.volume = Math.min(1, vol * this.volume);
    const fallback = () => { if (this.chantName !== name || !this.ctx || this.drone) return; const c = this.ctx; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(0.05 * vol, c.currentTime, 1.5); const os: OscillatorNode[] = []; for (const fq of [146.8, 220, 293.7, 329.6]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = fq * (1 + (Math.random() - 0.5) * 0.004); const og = c.createGain(); og.gain.value = fq > 300 ? 0.3 : 0.6; o.connect(og); og.connect(g); o.start(); os.push(o); } this.out(g, 0.6); this.drone = { g, stop: () => { g.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => os.forEach((o) => o.stop()), 1500); } }; };
    a.addEventListener('error', fallback); a.play().then(() => { if (this.chantName === name) this.chantEl = a; else a.pause(); }).catch(fallback);
  }
  nextRadio(): string { this.radioIndex++; if (this.radioIndex >= this.radioSlots.length) { this.radioIndex = -1; this.chant(null); return ''; } const n = this.radioSlots[this.radioIndex]; this.chant(n, 0.6); return n; }

  update(dt: number, s: { wind: number; interior: boolean; walking: number; snow: boolean; day: boolean; outdoorsQuiet?: boolean }) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    this.interior += ((s.interior ? 1 : 0) - this.interior) * Math.min(1, dt * 3); this.wet.gain.value = 0.15 + 0.55 * this.interior;
    if (this.wind) { this.wind.g.gain.setTargetAtTime((0.02 + s.wind * 0.11) * (1 - 0.8 * this.interior), t, 0.4); this.wind.f.frequency.setTargetAtTime(320 + s.wind * 500 + Math.sin(t * 0.4) * 90, t, 0.5); }
    if (s.walking > 0.4) { this.stepPhase += dt * (1.9 + s.walking * 0.36); if (this.stepPhase >= 1) { this.stepPhase = 0; this.step(s.snow && !s.interior, s.interior ? 0.35 : 0.8); } }
    if (!s.interior && s.day) { this.birdT -= dt; if (this.birdT <= 0) { this.birdT = 9 + Math.random() * 16; Math.random() < 0.6 ? this.crow() : this.magpie(); } }
    this.trainT -= dt; if (this.trainT <= 0) { this.trainT = 70 + Math.random() * 90; if (!s.interior) this.train(); }
    // kebero pattern (slow processional beat) and tsenatsel
    if (this.keberoOn || this.tsenatselOn) { this.patternT -= dt; if (this.patternT <= 0) { const pat = [1, 0, 2, 0, 1, 2, 0, 2]; const p = pat[this.patternI % pat.length]; this.patternI++; this.patternT = 0.31; if (this.keberoOn && p) this.kebero(p === 1, p === 1 ? 1 : 0.6); if (this.tsenatselOn && this.patternI % 2 === 0) this.tsenatsel(0.7); } }
  }
}

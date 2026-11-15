// Audio: synthesized ambience and instruments (Web Audio), with optional recorded chant files from /audio/chant/.
export class Audio {
  ctx: AudioContext | null = null; master!: GainNode; dry!: GainNode; wet!: GainNode; private rev!: ConvolverNode;
  /** synthesized instruments, birds, train and crowd were removed at Isaac's request: only real recordings play */
  noSynth: boolean = true;
  volume = 0.8; private noiseBuf!: AudioBuffer;
  private wind?: { g: GainNode; f: BiquadFilterNode }; private engine?: { o: OscillatorNode; o2: OscillatorNode; g: GainNode; f: BiquadFilterNode; tire: GainNode };
  private fire?: GainNode; private crowd?: GainNode; private drone?: { g: GainNode; stop: () => void }; private chantEl: HTMLAudioElement | null = null; private chantName = '';
  private chantSynth = false; interior = 0; private birdT = 6; private trainT = 40; private stepPhase = 0; private patternT = 0; private patternI = 0; keberoOn = false; tsenatselOn = false;
  radioIndex = -1; readonly radioSlots = ['mezmur_01', 'mezmur_02', 'mahlet_practice', 'meskel_demera', 'fasika_tensae'];   // add more names here as more recordings are uploaded

  constructor() { try { const v = localStorage.getItem('ma.vol'); if (v !== null) this.volume = +v; const m = localStorage.getItem('ma.mus'); if (m !== null) this.musicVol = +m; this.voiceOn = localStorage.getItem('ma.voice') !== '0'; } catch { /* ignore */ } try { window.speechSynthesis?.addEventListener?.('voiceschanged', () => { this.voices = window.speechSynthesis.getVoices(); }); } catch { /* ignore */ } }
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
  /** kebero: goat-skin double-headed drum. low = the big head ("dum"), high = the small head ("tak") */
  kebero(low = true, vel = 1) { if (this.noSynth) return; 
    const c = this.ctx; if (!c) return; const t = c.currentTime; const f0 = low ? 82 : 176;
    for (const [m, a, d] of [[1, 1, low ? 0.55 : 0.2], [1.59, 0.45, low ? 0.3 : 0.12], [2.14, 0.25, 0.16], [2.65, 0.12, 0.1]]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0 * m * 1.25, t); o.frequency.exponentialRampToValueAtTime(f0 * m, t + 0.05); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * a * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); this.out(g, 0.25); o.start(t); o.stop(t + d + 0.05); }
    const n = this.noise(), f = c.createBiquadFilter(), ng = c.createGain(); f.type = 'bandpass'; f.frequency.value = low ? 260 : 1100; f.Q.value = 0.9; ng.gain.setValueAtTime(0.5 * vel, t); ng.gain.exponentialRampToValueAtTime(0.001, t + (low ? 0.06 : 0.035)); n.connect(f); f.connect(ng); this.out(ng, 0.2); n.stop(t + 0.1);
  }
  /** tsenatsel (sistrum): metal discs sliding on wires — a bright double shake */
  tsenatsel(vel = 1) { if (this.noSynth) return; 
    const c = this.ctx; if (!c) return; const t0 = c.currentTime;
    for (let k = 0; k < 2; k++) { const t = t0 + k * 0.11;
      for (const fq of [2310, 3170, 4120, 5390, 6830, 8450]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = fq * (1 + (Math.random() - 0.5) * 0.03); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022 * vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0004, t + 0.16 + Math.random() * 0.08); o.connect(g); this.out(g, 0.3); o.start(t); o.stop(t + 0.3); }
      const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = 5200; g.gain.setValueAtTime(0.12 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07); n.connect(f); f.connect(g); this.out(g, 0.25); n.stop(t + 0.1); }
  }
  /** maqomiya (prayer staff) struck on the floor */
  staff(vel = 1) { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(95, t + 0.06); g.gain.setValueAtTime(0.35 * vel, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); o.connect(g); this.out(g, 0.3); o.start(t); o.stop(t + 0.15); }
  /** qachil: the small hand bell rung by the deacon */
  qachil() { if (this.noSynth) return;  this.bell(1760, 0.5); setTimeout(() => this.bell(1760, 0.45), 190); setTimeout(() => this.bell(1760, 0.4), 380); }
  /** ililta: the joyful ululation of the congregation */
  ililta(vel = 1) { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t = c.currentTime; for (let v = 0; v < 3; v++) { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), l = c.createOscillator(), lg = c.createGain(); const st = t + v * 0.25, f0 = 880 + v * 90 + Math.random() * 60; o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, st); o.frequency.linearRampToValueAtTime(f0 * 1.12, st + 1.4); l.frequency.value = 11 + v; lg.gain.value = 0.5; f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 2; g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(0.03 * vel, st + 0.1); g.gain.setValueAtTime(0.03 * vel, st + 1.3); g.gain.linearRampToValueAtTime(0.0001, st + 1.7); const trem = c.createGain(); trem.gain.value = 0.5; l.connect(lg); lg.connect(trem.gain); o.connect(f); f.connect(trem); trem.connect(g); this.out(g, 0.4); o.start(st); l.start(st); o.stop(st + 1.8); l.stop(st + 1.8); } }
  bell(freq = 660, vel = 1) { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t = c.currentTime; for (const [m, a, d] of [[1, 0.5, 2.6], [2.01, 0.28, 1.8], [2.76, 0.2, 1.3], [5.4, 0.1, 0.7], [8.9, 0.05, 0.4]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = freq * m; g.gain.setValueAtTime(0.4 * a * vel, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); this.out(g, 0.35); o.start(t); o.stop(t + d + 0.1); } }
  step(snow: boolean, vel = 1) { const c = this.ctx; if (!c) return; const t = c.currentTime; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = snow ? 'bandpass' : 'lowpass'; f.frequency.value = snow ? 1700 : 500; f.Q.value = snow ? 1.4 : 0.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime((snow ? 0.16 : 0.09) * vel, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + (snow ? 0.2 : 0.09)); n.connect(f); f.connect(g); this.out(g); n.stop(t + 0.25); }
  horn() { const c = this.ctx; if (!c) return; const t = c.currentTime; for (const fq of [392, 494]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = fq; g.gain.setValueAtTime(0.12, t); g.gain.setTargetAtTime(0, t + 0.35, 0.05); o.connect(g); this.out(g); o.start(t); o.stop(t + 0.6); } }
  chime() { if (this.noSynth) return;  this.bell(880, 0.5); setTimeout(() => this.bell(1320, 0.4), 140); }
  door() { const c = this.ctx; if (!c) return; const t = c.currentTime; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 240; g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); n.connect(f); f.connect(g); this.out(g); n.stop(t + 0.3); }
  private crow() { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t0 = c.currentTime; const reps = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < reps; i++) { const t = t0 + i * 0.42; const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(380, t + 0.26); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.03); g.gain.linearRampToValueAtTime(0.0001, t + 0.28); const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 55; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency); o.connect(f); f.connect(g); g.connect(this.dry); o.start(t); l.start(t); o.stop(t + 0.3); l.stop(t + 0.3); } }
  private magpie() { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t0 = c.currentTime; for (let i = 0; i < 7; i++) { const t = t0 + i * 0.085; const n = this.noise(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 5; g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05); n.connect(f); f.connect(g); g.connect(this.dry); n.stop(t + 0.07); } }
  private train() { if (this.noSynth) return;  const c = this.ctx; if (!c) return; const t = c.currentTime; for (const fq of [311, 370, 466]) { const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = fq; f.type = 'lowpass'; f.frequency.value = 900; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + 0.3); g.gain.setValueAtTime(0.018, t + 2.2); g.gain.linearRampToValueAtTime(0.0001, t + 3.2); o.connect(f); f.connect(g); g.connect(this.dry); const r = c.createGain(); r.gain.value = 0.8; g.connect(r); r.connect(this.wet); o.start(t); o.stop(t + 3.3); } }

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
  setCrowd(level: number) { if (this.noSynth) return;  const c = this.ctx; if (!c) return; if (!this.crowd) { const n = this.noise(true), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 480; f.Q.value = 0.8; this.crowd = c.createGain(); this.crowd.gain.value = 0; n.connect(f); f.connect(this.crowd); this.out(this.crowd, 0.4); } this.crowd.gain.setTargetAtTime(level * 0.05, c.currentTime, 0.6); }

  /** Chant/mezmur: plays /audio/chant/<name>.mp3 when the recording exists; otherwise a soft placeholder drone. */
  chant(name: string | null, vol = 0.8) {
    if (this.chantName === (name ?? '')) return; this.chantName = name ?? '';
    if (this.chantEl) { this.chantEl.pause(); this.chantEl = null; } if (this.chantSynth) { this.chantSynth = false; this.music(null); }
    if (!name || !this.ctx) return;
    const a = new window.Audio(`${import.meta.env.BASE_URL}audio/${name.includes('/') ? name : 'chant/' + name}.mp3`); a.loop = true; a.volume = Math.min(1, vol * this.volume);
    const fallback = () => { if (this.chantName !== name || !this.ctx) return; this.music(/fasika_tensae|meskel|procession|mezmur|mahlet/.test(name) ? 'festive' : 'solemn'); this.chantSynth = true; };
    a.addEventListener('error', fallback); a.play().then(() => { if (this.chantName === name) this.chantEl = a; else a.pause(); }).catch(fallback);
  }
  // ------------------------------------------------------------------ music
  musicVol = 0.5; private musicKind = ''; private musicGain: GainNode | null = null; private musicTimer: any = null; private musicEl: HTMLAudioElement | null = null; private mStep = 0;
  setMusicVol(v: number) { this.musicVol = v; if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.2); if (this.musicEl) this.musicEl.volume = Math.min(1, v * this.volume); try { localStorage.setItem('ma.mus', String(v)); } catch { /* ignore */ } }
  /** one plucked string: begena-like (deep, buzzing) or krar-like (brighter) */
  private pluck(freq: number, when: number, vel: number, bright: boolean, dest: AudioNode) {
    const c = this.ctx!; const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = freq; o2.frequency.value = freq * 1.003; f.type = 'lowpass'; f.Q.value = bright ? 2 : 5;
    f.frequency.setValueAtTime(freq * (bright ? 9 : 7), when); f.frequency.exponentialRampToValueAtTime(freq * 1.6, when + (bright ? 0.5 : 1.2));
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vel, when + 0.008); g.gain.exponentialRampToValueAtTime(0.0006, when + (bright ? 1.4 : 3.2));
    const og = c.createGain(); og.gain.value = 0.35; o2.connect(og); og.connect(f); o.connect(f); f.connect(g); g.connect(dest); o.start(when); o2.start(when); o.stop(when + 3.4); o2.stop(when + 3.4);
  }
  /**
   * Background music. Plays /audio/music/<kind>.mp3 when you add a recording; otherwise a begena-and-krar style
   * instrumental in an Ethiopian pentatonic mode is generated live (kinds: menu, solemn, festive).
   */
  music(kind: 'menu' | 'solemn' | 'festive' | null) {
    if ((kind ?? '') === this.musicKind) return; this.musicKind = kind ?? '';
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } if (this.musicEl) { this.musicEl.pause(); this.musicEl = null; }
    if (this.musicGain && this.ctx) { const g = this.musicGain; g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5); setTimeout(() => g.disconnect(), 2500); this.musicGain = null; }
    if (!kind) return; const c = this.ctx; if (!c) { this.musicKind = ''; return; }
    const startSynth = () => {
      if (this.musicKind !== kind || this.musicGain) return;
      const out = c.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(this.musicVol * 0.55, c.currentTime, 1.2); out.connect(this.dry); const rv = c.createGain(); rv.gain.value = 0.5; out.connect(rv); rv.connect(this.wet); this.musicGain = out;
      // tizita (major) for the menu, bati-minor colour for solemn scenes; root D
      const root = kind === 'solemn' ? 110 : 146.83; const mode = kind === 'solemn' ? [0, 2, 3, 7, 8] : [0, 2, 4, 7, 9]; const N = (deg: number) => root * Math.pow(2, (mode[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);
      const ost = kind === 'festive' ? [0, 2, 4, 2, 5, 4, 2, 4] : [0, 4, 2, 4, 0, 3, 2, 3]; const mel = [5, 7, 6, 5, 4, 5, 7, 9, 8, 7, 5, 6, 5, 4, 2, 4]; const beat = kind === 'festive' ? 0.3 : kind === 'solemn' ? 0.62 : 0.5;
      let next = c.currentTime + 0.1; this.mStep = 0;
      const tick = () => { while (next < c.currentTime + 0.6) { const i = this.mStep++; this.pluck(N(ost[i % 8] - 5), next, 0.16, false, out); if (i % 16 === 0) this.pluck(N(-10), next, 0.2, false, out);
          if (i % 2 === 0 && (Math.floor(i / 32) % 2 === 1 || kind === 'festive')) this.pluck(N(mel[(i >> 1) % 16]), next + beat * 0.5, 0.075, true, out);
          if (kind === 'festive') { const p = [1, 0, 2, 0, 1, 2, 0, 2][i % 8]; if (p) setTimeout(() => this.musicKind === kind && this.kebero(p === 1, 0.5), Math.max(0, (next - c.currentTime) * 1000)); }
          next += beat; } };
      tick(); this.musicTimer = setInterval(tick, 200);
    };
    const a = new window.Audio(`${import.meta.env.BASE_URL}audio/music/${kind}.mp3`); a.loop = true; a.volume = Math.min(1, this.musicVol * this.volume);
    void startSynth; a.addEventListener('error', () => {}); a.play().then(() => { if (this.musicKind === kind) this.musicEl = a; else a.pause(); }).catch(() => {});
  }
  // ------------------------------------------------------------------ dialogue voice (browser speech synthesis)
  voiceOn = true; private voices: SpeechSynthesisVoice[] = [];
  setVoice(on: boolean) { this.voiceOn = on; if (!on) this.hush(); try { localStorage.setItem('ma.voice', on ? '1' : '0'); } catch { /* ignore */ } }
  hush() { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } if (this.voiceEl) { this.voiceEl.pause(); this.voiceEl = null; } }
  /** speak a dialogue line; each speaker gets a consistent pitch and pace. Returns false when no voice is available. */
  speak(text: string, lang: 'en' | 'am', speaker = ''): boolean {
    const ss = window.speechSynthesis; if (text || !ss || !this.voiceOn || this.volume <= 0) return false;   // robotic browser voice disabled: recorded lines only
    try {
      if (!this.voices.length) this.voices = ss.getVoices();
      const want = lang === 'am' ? this.voices.find((v) => /^am/i.test(v.lang)) : (this.voices.find((v) => /en[-_]CA/i.test(v.lang)) ?? this.voices.find((v) => /en[-_](US|GB)/i.test(v.lang)) ?? this.voices.find((v) => /^en/i.test(v.lang)));
      if (lang === 'am' && !want) return false;
      ss.cancel(); const u = new SpeechSynthesisUtterance(text.replace(/[“”"]/g, '')); if (want) u.voice = want; u.lang = want?.lang ?? (lang === 'am' ? 'am-ET' : 'en-CA');
      const k = speaker.toLowerCase(); const prof: [number, number] = /qes|priest|abba/.test(k) ? [0.6, 0.86] : /tesfaye|elder|founder|grand/.test(k) ? [0.72, 0.84] : /emama|mother|woman|grandmother/.test(k) ? [1.35, 0.92] : /isaac/.test(k) ? [0.95, 1.0] : /class|driver|clerk/.test(k) ? [1.1, 1.04] : [0.85, 0.9];
      u.pitch = prof[0]; u.rate = prof[1]; u.volume = Math.min(1, this.volume); ss.speak(u); return true;
    } catch { return false; }
  }
  private voiceEl: HTMLAudioElement | null = null;
  /** play the recorded/generated voice file for a dialogue key; resolves with its length in seconds (0 if there is none) */
  voiceLine(key: string): Promise<number> {
    this.hush(); if (!this.voiceOn || this.volume <= 0) return Promise.resolve(0);
    return new Promise((res) => { const a = new window.Audio(`${import.meta.env.BASE_URL}audio/voice/${key}.mp3`); a.volume = Math.min(1, this.volume); let done = false; const fin = (v: number) => { if (!done) { done = true; res(v); } };
      a.addEventListener('loadedmetadata', () => fin(isFinite(a.duration) ? a.duration : 4)); a.addEventListener('error', () => fin(0)); setTimeout(() => fin(0), 2500);
      a.play().then(() => { this.voiceEl = a; }).catch(() => fin(0)); });
  }
  private pausedAll = false;
  pauseAll(p: boolean) { if (p === this.pausedAll) return; this.pausedAll = p; try { if (p) { window.speechSynthesis?.pause(); this.voiceEl?.pause(); this.chantEl?.pause(); this.musicEl?.pause(); this.ctx?.suspend(); } else { window.speechSynthesis?.resume(); this.voiceEl?.play().catch(() => {}); this.chantEl?.play().catch(() => {}); this.musicEl?.play().catch(() => {}); this.ctx?.resume(); } } catch { /* ignore */ } }

  get chantPlaying() { return this.chantName !== ''; }
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

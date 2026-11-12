// Unified input: keyboard/mouse, gamepad and touch feed one action state.
export interface InputState {
  moveX: number; moveY: number;      // -1..1 (strafe, forward)
  lookX: number; lookY: number;      // per-frame look delta (radians-ish)
  sprint: boolean; jump: boolean; brake: boolean;
  throttle: number; steer: number;   // driving
}
type Btn = 'interact' | 'enter' | 'phone' | 'jump' | 'horn' | 'lights' | 'radio' | 'camera' | 'skip' | 'wipers' | 'back';

export class Input {
  state: InputState = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprint: false, jump: false, brake: false, throttle: 0, steer: 0 };
  keys = new Set<string>();
  private pressed = new Set<Btn>();
  private mouseDX = 0; private mouseDY = 0;
  locked = false;
  enabled = true;
  /** touch layer writes here */
  touch = { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, sprint: false, brake: false, throttle: 0, active: false };
  private padPrev: boolean[] = [];
  wheel = 0; sens = 1;
  lastDevice: 'kbm' | 'pad' | 'touch' = 'kbm';

  constructor(private canvas: HTMLCanvasElement) {
    try { const v = localStorage.getItem('ma.sens'); if (v) this.sens = +v; } catch { /* ignore */ }
    addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (!this.keys.has(e.code)) this.onKeyPress(e.code);
      this.keys.add(e.code);
      this.lastDevice = 'kbm';
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('click', () => {
      if (this.wantLock && !this.locked && this.lastDevice !== 'touch') canvas.requestPointerLock?.()?.catch?.(() => {});
    });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; });
    addEventListener('mousemove', (e) => { if (this.locked) { this.mouseDX += e.movementX; this.mouseDY += e.movementY; } });
    addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
  }
  wantLock = true;

  private onKeyPress(code: string) {
    const map: Record<string, Btn> = { KeyE: 'interact', KeyF: 'enter', Tab: 'phone', KeyP: 'phone', Space: 'jump', KeyH: 'horn', KeyL: 'lights', KeyR: 'radio', KeyC: 'camera', Enter: 'skip', KeyV: 'wipers', Escape: 'back' };
    const b = map[code]; if (b) this.pressed.add(b);
  }
  press(b: Btn) { this.pressed.add(b); }
  /** consume a one-shot button press */
  take(b: Btn) { const h = this.pressed.has(b); this.pressed.delete(b); return h; }
  clearPresses() { this.pressed.clear(); }

  update() {
    const k = this.keys, s = this.state;
    let mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    let brake = k.has('Space');
    let lx = this.mouseDX * 0.0024 * this.sens, ly = this.mouseDY * 0.0024 * this.sens;
    this.mouseDX = this.mouseDY = 0;
    let throttle = my, steer = mx;

    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    if (pad) {
      const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
      const ax = dz(pad.axes[0] ?? 0), ay = dz(pad.axes[1] ?? 0), rx = dz(pad.axes[2] ?? 0), ry = dz(pad.axes[3] ?? 0);
      if (ax || ay || rx || ry) this.lastDevice = 'pad';
      if (ax || ay) { mx = ax; my = -ay; steer = ax; }
      lx += rx * 0.045; ly += ry * 0.035;
      const b = pad.buttons.map((x) => x.pressed);
      const rt = pad.buttons[7]?.value ?? 0, lt = pad.buttons[6]?.value ?? 0;
      if (rt || lt) { throttle = rt - lt; this.lastDevice = 'pad'; }
      sprint = sprint || !!b[10] || !!b[5];
      brake = brake || !!b[1];
      const edge = (i: number, btn: Btn) => { if (b[i] && !this.padPrev[i]) { this.pressed.add(btn); this.lastDevice = 'pad'; } };
      edge(0, 'jump'); edge(0, 'skip'); edge(2, 'interact'); edge(3, 'enter'); edge(9, 'phone'); edge(8, 'camera'); edge(11, 'horn'); edge(12, 'lights'); edge(14, 'radio'); edge(1, 'back');
      this.padPrev = b;
    }
    const t = this.touch;
    if (t.active) {
      if (t.moveX || t.moveY) { mx = t.moveX; my = t.moveY; steer = t.moveX; }
      throttle = t.throttle || (Math.abs(my) > 0.25 ? my : 0);
      lx += t.lookDX * 0.006; ly += t.lookDY * 0.006; t.lookDX = t.lookDY = 0;
      sprint = sprint || t.sprint; brake = brake || t.brake;
    }
    if (!this.enabled) { mx = my = lx = ly = throttle = steer = 0; sprint = brake = false; }
    const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
    s.moveX = mx; s.moveY = my; s.lookX = lx; s.lookY = ly; s.sprint = sprint; s.brake = brake; s.throttle = throttle; s.steer = steer;
  }
}

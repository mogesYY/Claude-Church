// Photo mode: free camera + optional progressive path tracing (three-gpu-pathtracer, WebGL2) for ray-traced stills.
import * as THREE from 'three/webgpu';
import type { Game } from './game';

export class PhotoMode {
  active = false; tracing = false; samples = 0;
  private ui: HTMLElement | null = null; private yaw = 0; private pitch = 0; private prevMode: Game['mode'] = 'foot';
  private pt: any = null; private glr: any = null; private ptCanvas: HTMLCanvasElement | null = null; private ptScene: THREE.Scene | null = null; private info: HTMLElement | null = null;
  constructor(private g: Game) {}

  enter() {
    if (this.active) return; const g = this.g; this.active = true; this.prevMode = g.mode; g.mode = 'photo'; g.hud.setHidden(true);
    const e = new THREE.Euler().setFromQuaternion(g.engine.camera.quaternion, 'YXZ'); this.yaw = e.y; this.pitch = e.x;
    const t = (k: string) => g.i18n.t(k);
    this.ui = document.createElement('div'); this.ui.className = 'photoui';
    this.ui.innerHTML = `<button data-a="pt">${t('pathTrace')}</button><button data-a="shot">${t('capture')}</button><button data-a="exit">${t('exitPhoto')}</button><span class="pinfo">WASD · Q/E ↕ · ${g.i18n.pick('drag to look', 'ለመመልከት ይጎትቱ')}</span>`;
    g.hud.root.append(this.ui); this.info = this.ui.querySelector('.pinfo');
    this.ui.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { const a = (b as HTMLElement).dataset.a; if (a === 'exit') this.exit(); else if (a === 'shot') this.capture(); else if (a === 'pt') this.tracing ? this.stopTrace() : this.startTrace(); }));
  }
  exit() { if (!this.active) return; this.stopTrace(); this.active = false; this.g.mode = this.prevMode === 'photo' ? 'foot' : this.prevMode; this.g.hud.setHidden(false); this.ui?.remove(); this.ui = null; this.g.rig.snap(); }

  update(dt: number) {
    const g = this.g, inp = g.input, cam = g.engine.camera;
    if (inp.take('back')) { this.exit(); return; }
    if (this.tracing) { try { this.pt.renderSample(); this.samples = Math.floor(this.pt.samples); if (this.info) this.info.textContent = `${this.samples} ${g.i18n.t('samples')}`; } catch (e) { console.warn(e); this.stopTrace(); } return; }
    this.yaw -= inp.state.lookX; this.pitch = THREE.MathUtils.clamp(this.pitch - inp.state.lookY, -1.5, 1.5);
    cam.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    const sp = (inp.state.sprint ? 14 : 4) * dt; const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion), r = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    cam.position.addScaledVector(f, inp.state.moveY * sp).addScaledVector(r, inp.state.moveX * sp); cam.position.y += ((inp.keys.has('KeyE') ? 1 : 0) - (inp.keys.has('KeyQ') ? 1 : 0)) * sp;
    cam.fov = THREE.MathUtils.clamp(cam.fov + inp.wheel * 2, 15, 90); cam.updateProjectionMatrix();
  }

  /** build a static snapshot of what is near the camera and path trace it */
  async startTrace() {
    const g = this.g; if (this.info) this.info.textContent = '…';
    try {
      const [{ WebGLPathTracer }, core] = await Promise.all([import('three-gpu-pathtracer'), import('three')]);
      const cam = g.engine.camera; const scene = new THREE.Scene(); const cp = cam.position; const R = g.engine.interior ? 40 : 170;
      g.engine.scene.updateMatrixWorld(true);
      const sph = new THREE.Sphere(); const m4 = new THREE.Matrix4();
      g.engine.scene.traverseVisible((o) => {
        const mesh = o as THREE.Mesh; if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return; const mat = mesh.material as any; if (Array.isArray(mat) || mat.blending === THREE.AdditiveBlending || mat.isMeshBasicMaterial || o === g.engine.sky) return;
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const pmat = new THREE.MeshStandardMaterial({ color: mat.color ?? 0xffffff, map: mat.map ?? null, roughness: mat.roughness ?? 0.8, metalness: mat.metalness ?? 0, emissive: mat.emissive ?? 0x000000, emissiveIntensity: mat.emissiveIntensity ?? 0, emissiveMap: mat.emissiveMap ?? null, vertexColors: !!mat.vertexColors, transparent: !!mat.transparent, opacity: mat.opacity ?? 1, side: mat.side });
        if ((mesh as any).isInstancedMesh) {
          const im = mesh as unknown as THREE.InstancedMesh; if (im.count > 400) return;
          for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); m4.premultiply(im.matrixWorld); sph.copy(im.geometry.boundingSphere!).applyMatrix4(m4); if (sph.center.distanceTo(cp) - sph.radius > R) continue; const c = new THREE.Mesh(im.geometry, pmat); c.matrixAutoUpdate = false; c.matrix.copy(m4); c.matrixWorld.copy(m4); scene.add(c); }
          return;
        }
        sph.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld); if (sph.center.distanceTo(cp) - sph.radius > R && sph.radius < 800) return;
        let geo = mesh.geometry;
        if ((mesh as any).isSkinnedMesh) { // bake the current pose
          const sk = mesh as unknown as THREE.SkinnedMesh; geo = sk.geometry.clone(); const p = geo.attributes.position; const v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(sk.geometry.attributes.position, i); sk.applyBoneTransform(i, v); p.setXYZ(i, v.x, v.y, v.z); } geo.deleteAttribute('skinIndex'); geo.deleteAttribute('skinWeight'); geo.computeVertexNormals();
        }
        const c = new THREE.Mesh(geo, pmat); c.matrixAutoUpdate = false; c.matrix.copy(mesh.matrixWorld); c.matrixWorld.copy(mesh.matrixWorld); scene.add(c);
      });
      // environment: gradient sky with a sun, as an equirect float texture
      const W = 256, H = 128, data = new Float32Array(W * H * 4); const sd = g.engine.sunDir; const day = THREE.MathUtils.smoothstep(sd.y, -0.1, 0.15);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = y / (H - 1), u = x / W; const th = v * Math.PI, ph = u * 2 * Math.PI; const dir = new THREE.Vector3(-Math.cos(ph) * Math.sin(th), Math.cos(th), Math.sin(ph) * Math.sin(th)); const up = Math.max(0, dir.y); const sun = Math.pow(Math.max(0, dir.dot(sd)), 900) * 900 * day + Math.pow(Math.max(0, dir.dot(sd)), 12) * 0.9 * day; const i = (y * W + x) * 4; const hz = 1 - up; data[i] = (0.25 + 0.75 * hz) * day * 1.1 + sun + 0.01; data[i + 1] = (0.42 + 0.55 * hz) * day * 1.1 + sun * 0.92 + 0.012; data[i + 2] = (0.85 + 0.2 * hz) * day * 1.2 + sun * 0.8 + 0.03; data[i + 3] = 1; if (dir.y < 0) { data[i] *= 0.35; data[i + 1] *= 0.35; data[i + 2] *= 0.35; } }
      const env = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.FloatType); env.mapping = THREE.EquirectangularReflectionMapping; env.needsUpdate = true; scene.environment = env; scene.background = env;
      // interior point lights carry over
      g.engine.scene.traverseVisible((o) => { const l = o as THREE.PointLight; if (l.isPointLight && l.intensity > 0.5 && l.getWorldPosition(new THREE.Vector3()).distanceTo(cp) < R) { const c = new THREE.PointLight(l.color, l.intensity, l.distance, l.decay); l.getWorldPosition(c.position); scene.add(c); } });
      this.ptCanvas = document.createElement('canvas'); this.ptCanvas.className = 'ptcanvas'; document.body.append(this.ptCanvas);
      this.glr = new core.WebGLRenderer({ canvas: this.ptCanvas, antialias: false, preserveDrawingBuffer: true }); this.glr.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.glr.setSize(innerWidth, innerHeight, false); this.glr.toneMapping = core.ACESFilmicToneMapping; this.glr.toneMappingExposure = g.engine.renderer.toneMappingExposure * 1.15;
      this.pt = new WebGLPathTracer(this.glr); this.pt.bounces = 5; this.pt.filterGlossyFactor = 0.5; this.pt.tiles.set(2, 2); this.pt.renderDelay = 0; this.pt.fadeDuration = 0; this.pt.minSamples = 1; this.pt.dynamicLowRes = true;
      cam.updateMatrixWorld(); this.pt.setScene(scene, cam); this.ptScene = scene; this.tracing = true; this.samples = 0;
    } catch (e) { console.warn('path tracing unavailable', e); if (this.info) this.info.textContent = this.g.i18n.pick('Ray tracing is not available on this device', 'ሬይ ትሬሲንግ በዚህ መሣሪያ አይገኝም'); this.stopTrace(); }
  }
  stopTrace() { this.tracing = false; try { this.pt?.dispose?.(); this.glr?.dispose?.(); } catch { /* ignore */ } this.pt = null; this.glr = null; this.ptCanvas?.remove(); this.ptCanvas = null; this.ptScene = null; }

  capture() {
    const src = this.tracing && this.ptCanvas ? this.ptCanvas : this.g.engine.canvas;
    const done = (url: string) => { const a = document.createElement('a'); a.href = url; a.download = `medhane-alem-${Date.now()}.png`; a.click(); };
    if (src === this.g.engine.canvas) { this.g.engine.render(this.g.focusPos); }
    try { src.toBlob((b) => { if (b) done(URL.createObjectURL(b)); }, 'image/png'); } catch { /* ignore */ }
  }
}

// Renderer, post-processing, sky/sun and quality presets.
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, velocity, metalness, roughness, vec4, uniform } from 'three/tsl';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { traa } from 'three/addons/tsl/display/TRAANode.js';
import { fxaa } from 'three/addons/tsl/display/FXAANode.js';
import { ssr } from 'three/addons/tsl/display/SSRNode.js';
import { CSMShadowNode } from 'three/addons/csm/CSMShadowNode.js';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';

export type Quality = 'low' | 'high' | 'ultra';

export const BRANDON = { lat: 49.84, lon: -99.95 };

/** Solar position (NOAA approximation). Returns elevation/azimuth in radians; azimuth clockwise from north. */
export function sunPosition(date: Date, lat = BRANDON.lat, lon = BRANDON.lon) {
  const rad = Math.PI / 180;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = (gmst * 15 + lon) * rad;
  const ha = lst - ra;
  const la = lat * rad;
  const el = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha));
  return { elevation: el, azimuth: (az + Math.PI * 2) % (Math.PI * 2) };
}

export class Engine {
  renderer!: THREE.WebGPURenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.15, 2400);
  sun = new THREE.DirectionalLight(0xffffff, 3);
  hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4a4438, 1);
  sky!: SkyMesh;
  stars!: THREE.Points;
  quality: Quality = 'high';
  isWebGPU = false;
  post: THREE.PostProcessing | null = null;
  csm: CSMShadowNode | null = null;
  sunDir = new THREE.Vector3(0.3, 0.8, 0.4);
  sunElevation = 0.6;
  /** game clock: local Brandon time */
  date = new Date(Date.UTC(2026, 0, 11, 13, 20)); // Sunday 7:20 CST
  timeScale = 60; // game seconds per real second
  clockPaused = false;
  private envDirtyAt = -1;
  private pmrem: THREE.PMREMGenerator | null = null;
  private envRT: THREE.RenderTarget | null = null;
  fogColor = new THREE.Color(0xa8b8cc);
  fogDensity = 0.0012;
  exposureBoost = 1;
  interior = false;
  pixelRatioCap = 1;
  private wetness = uniform(0);

  constructor(public canvas: HTMLCanvasElement) {}

  async init(q?: Quality) {
    const forceWebGL = !('gpu' in navigator) || new URLSearchParams(location.search).has('webgl');
    this.renderer = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true, forceWebGL, powerPreference: 'high-performance' });
    await this.renderer.init();
    this.isWebGPU = (this.renderer.backend as any).isWebGPUBackend === true;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), this.fogDensity);
    this.scene.add(this.hemi);
    this.sun.castShadow = true;
    this.scene.add(this.sun, this.sun.target);

    this.sky = new SkyMesh();
    this.sky.scale.setScalar(2000);
    this.sky.frustumCulled = false;
    this.sky.turbidity.value = 4;
    this.sky.rayleigh.value = 1.6;
    this.sky.mieCoefficient.value = 0.004;
    this.sky.mieDirectionalG.value = 0.8;
    (this.sky.material as any).fog = false;
    this.scene.add(this.sky);

    // stars
    const sg = new THREE.BufferGeometry();
    const sp: number[] = [];
    let s = 12345;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 900; i++) {
      const u = rnd() * Math.PI * 2, v = Math.acos(rnd());
      sp.push(Math.sin(v) * Math.cos(u) * 1800, Math.cos(v) * 1800 + 20, Math.sin(v) * Math.sin(u) * 1800);
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    this.setQuality(q ?? (await this.detectQuality()));
    this.resize();
    addEventListener('resize', () => this.resize());
    this.applyTime(true);
  }

  async detectQuality(): Promise<Quality> {
    const p = new URLSearchParams(location.search).get('q') as Quality | null;
    if (p === 'low' || p === 'high' || p === 'ultra') return p;
    try { const s = localStorage.getItem('ma.quality') as Quality | null; if (s === 'low' || s === 'high' || s === 'ultra') return s; } catch { /* ignore */ }
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 1100);
    if (mobile || !this.isWebGPU) {
      // WebGL2 fallback: check for software rendering
      return mobile ? 'low' : 'high';
    }
    try {
      const adapter = await (navigator as any).gpu.requestAdapter({ powerPreference: 'high-performance' });
      const info = adapter?.info ?? {};
      const desc = `${info.vendor ?? ''} ${info.architecture ?? ''} ${info.device ?? ''} ${info.description ?? ''}`.toLowerCase();
      if (/swiftshader|llvmpipe|software/.test(desc)) return 'low';
      if (/nvidia|rtx|radeon rx|amd/.test(desc) && (navigator as any).deviceMemory !== 4) return 'ultra';
      if (/apple/.test(desc)) return 'high';
      if (/intel/.test(desc)) return 'high';
    } catch { /* ignore */ }
    return 'high';
  }

  setQuality(q: Quality) {
    this.quality = q;
    try { localStorage.setItem('ma.quality', q); } catch { /* ignore */ }
    this.pixelRatioCap = q === 'ultra' ? 2 : q === 'high' ? 1.5 : 1;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.pixelRatioCap));
    // Shadows
    const sh = this.sun.shadow;
    if (this.csm) { try { this.csm.dispose(); } catch { /* ignore */ } this.csm = null; (sh as any).shadowNode = null; }
    this.sun.castShadow = true;
    sh.mapSize.set(q === 'low' ? 1024 : 2048, q === 'low' ? 1024 : 2048);
    sh.bias = -0.0004; sh.normalBias = 0.06;
    const cam = sh.camera as THREE.OrthographicCamera;
    const r = q === 'low' ? 40 : 55;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 1; cam.far = 400;
    cam.updateProjectionMatrix();
    if (q !== 'low') {
      try {
        this.csm = new CSMShadowNode(this.sun, { cascades: q === 'ultra' ? 4 : 3, maxFar: q === 'ultra' ? 260 : 170, mode: 'practical', lightMargin: 120 });
        (sh as any).shadowNode = this.csm;
        this.csm.fade = true;
      } catch (e) { console.warn('CSM unavailable', e); this.csm = null; }
    }
    this.buildPost();
    this.resize();
  }

  private buildPost() {
    this.post = null;
    const q = this.quality;
    if (q === 'low') return;
    try {
      const post = new THREE.PostProcessing(this.renderer);
      const scenePass = pass(this.scene, this.camera);
      const ultra = q === 'ultra';
      scenePass.setMRT(mrt(ultra
        ? { output, normal: normalView, velocity, metalrough: vec4(metalness, roughness, 0, 1) }
        : { output, normal: normalView }));
      const color = scenePass.getTextureNode('output');
      const normal = scenePass.getTextureNode('normal');
      const depth = scenePass.getTextureNode('depth');
      const aoPass = ao(depth, normal, this.camera);
      aoPass.resolutionScale = ultra ? 1 : 0.5;
      (aoPass as any).radius.value = 0.6;
      (aoPass as any).thickness.value = 1.2;
      const aoTex = aoPass.getTextureNode();
      let lit: any = vec4(color.rgb.mul(aoTex.r.mul(0.85).add(0.15)), color.a);
      if (ultra) {
        try {
          const mr = scenePass.getTextureNode('metalrough');
          const ssrPass: any = (ssr as any)(color, depth, normal, { metalnessNode: mr.r, roughnessNode: mr.g, reflectNonMetals: true, camera: this.camera });
          ssrPass.maxDistance.value = 14; ssrPass.thickness.value = 0.35; ssrPass.resolutionScale = 0.5;
          this.ssrNode = ssrPass;
          lit = vec4(lit.rgb.add(ssrPass.rgb.mul(ssrPass.a).mul(this.wetness.mul(0.8).add(0.2))), lit.a);
        } catch (e) { console.warn('SSR unavailable', e); }
      }
      const bloomPass = bloom(lit, ultra ? 0.32 : 0.25, 0.5, 0.92);
      let final: any = lit.add(bloomPass);
      if (ultra) final = traa(final, depth, scenePass.getTextureNode('velocity'), this.camera);
      else final = fxaa(final);
      post.outputNode = final;
      this.post = post;
    } catch (e) {
      console.warn('Post-processing unavailable, falling back', e);
      this.post = null;
    }
  }
  ssrNode: any = null;

  setWetness(w: number) { this.wetness.value = w; }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.pixelRatioCap));
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** local hour as float (CST = UTC-6) */
  get hour() { return ((this.date.getUTCHours() - 6 + 24) % 24) + this.date.getUTCMinutes() / 60 + this.date.getUTCSeconds() / 3600; }
  setDateTime(month: number, day: number, hour: number, year = 2026) {
    const h = Math.floor(hour), m = Math.round((hour - h) * 60);
    this.date = new Date(Date.UTC(year, month - 1, day, h + 6, m));
    this.applyTime(true);
  }

  applyTime(force = false) {
    const sp = sunPosition(this.date);
    this.sunElevation = sp.elevation;
    // world: +x east, -z north
    const ce = Math.cos(sp.elevation);
    this.sunDir.set(Math.sin(sp.azimuth) * ce, Math.sin(sp.elevation), -Math.cos(sp.azimuth) * ce);
    const day = THREE.MathUtils.smoothstep(sp.elevation, -0.1, 0.12);
    const golden = 1 - THREE.MathUtils.smoothstep(sp.elevation, 0.0, 0.45);
    this.sky.sunPosition.value.copy(this.sunDir);
    const lightDir = this.sunDir.clone();
    let intensity = 3.2 * THREE.MathUtils.smoothstep(sp.elevation, -0.02, 0.25);
    const col = new THREE.Color().setRGB(1, 0.96 - golden * 0.32, 0.9 - golden * 0.55);
    if (sp.elevation < -0.02) { // moonlight from opposite side
      lightDir.set(-this.sunDir.x, Math.max(0.35, -this.sunDir.y), -this.sunDir.z).normalize();
      intensity = 0.18; col.setRGB(0.55, 0.65, 1);
    }
    this.sun.color.copy(col);
    this.sun.intensity = intensity * (this.interior ? 0.35 : 1);
    this.lightDir.copy(lightDir);
    this.hemi.intensity = (0.12 + 0.95 * day) * (this.interior ? 0.3 : 1);
    this.hemi.color.setRGB(0.55 + 0.2 * day, 0.66 + 0.16 * day, 1);
    this.hemi.groundColor.setRGB(0.25 + 0.1 * day, 0.24 + 0.1 * day, 0.22 + 0.08 * day);
    (this.stars.material as THREE.PointsMaterial).opacity = (1 - day) * 0.9;
    const night = new THREE.Color(0x070b16), dayFog = this.fogColor, dusk = new THREE.Color(0xd9a27a);
    const fc = night.clone().lerp(dayFog, day).lerp(dusk, golden * day * 0.35);
    (this.scene.fog as THREE.FogExp2).color.copy(fc);
    (this.scene.fog as THREE.FogExp2).density = this.interior ? 0.0 : this.fogDensity;
    this.renderer.toneMappingExposure = (0.55 + 0.25 * day + (1 - day) * 0.5) * this.exposureBoost;
    const t = this.date.getTime();
    if (force || Math.abs(t - this.envDirtyAt) > 20 * 60000) { this.envDirtyAt = t; this.updateEnvironment(); }
  }
  lightDir = new THREE.Vector3(0.3, 0.8, 0.4);

  private updateEnvironment() {
    try {
      if (!this.pmrem) this.pmrem = new THREE.PMREMGenerator(this.renderer as any);
      const envScene = new THREE.Scene();
      const sky = new SkyMesh();
      sky.scale.setScalar(1000);
      sky.turbidity.value = this.sky.turbidity.value; sky.rayleigh.value = this.sky.rayleigh.value;
      sky.mieCoefficient.value = this.sky.mieCoefficient.value; sky.mieDirectionalG.value = this.sky.mieDirectionalG.value;
      sky.sunPosition.value.copy(this.sunDir);
      envScene.add(sky);
      const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 24), new THREE.MeshBasicMaterial({ color: this.groundEnvColor }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -2; envScene.add(ground);
      const rt = (this.pmrem as any).fromScene(envScene, 0, 1, 1500);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
      this.scene.environmentIntensity = 0.55;
      sky.geometry.dispose();
    } catch (e) { console.warn('env update failed', e); }
  }
  groundEnvColor = new THREE.Color(0x8a8d86);
  refreshEnvironment() { this.updateEnvironment(); }

  tick(dt: number) {
    if (!this.clockPaused) {
      this.date = new Date(this.date.getTime() + dt * 1000 * this.timeScale);
      this.applyTime();
    }
  }

  render(focus: THREE.Vector3) {
    // follow the focus with the sun shadow camera
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(this.lightDir, 180);
    this.sun.target.updateMatrixWorld();
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    if (this.post) this.post.render(); else this.renderer.render(this.scene, this.camera);
  }
}

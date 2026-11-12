import * as THREE from 'three/webgpu';
import { Engine } from './core/engine';
import { Input } from './core/input';
import { Physics } from './core/physics';
import { Player } from './char/player';
import { CameraRig } from './core/camera';

async function boot() {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const engine = new Engine(canvas); await engine.init();
  const phys = new Physics(); await phys.init();
  const input = new Input(canvas);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6f7a66, roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; engine.scene.add(g);
  phys.staticBox(0, -0.5, 0, 200, 0.5, 200);
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(2, 1 + i * 0.3, 2), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(i / 12, 0.4, 0.5) }));
    b.position.set(Math.cos(i) * 8, (1 + i * 0.3) / 2, Math.sin(i) * 8); b.castShadow = b.receiveShadow = true; engine.scene.add(b);
    phys.staticBox(b.position.x, b.position.y, b.position.z, 1, (1 + i * 0.3) / 2, 1);
  }
  const player = new Player(phys); engine.scene.add(player.group);
  const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  cap.position.y = 0.85; cap.castShadow = true; player.group.add(cap);
  player.teleport(0, 0, 0);
  const rig = new CameraRig(engine.camera, phys);
  let jump = false;
  phys.onStep.push((dt) => { player.step(dt, input.state, rig.yaw, jump); jump = false; });
  engine.setDateTime(6, 20, 15);
  let last = performance.now();
  (window as any).__game = { engine, player, rig, ready: true };
  engine.renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
    input.update(); if (input.take('jump')) jump = true;
    phys.update(dt); player.syncVisual(1);
    rig.updateFoot(dt, player.group.position, input.state.lookX, input.state.lookY, input.wheel, false); input.wheel = 0;
    engine.tick(dt); engine.render(player.group.position);
  });
}
boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:0;left:0;color:#f88;z-index:99">${e?.stack ?? e}</pre>`); });

import { Game } from './game';

const game = new Game();
(window as any).__game = game;

/** WebGPU could not be tested on the build machine: if it fails at start-up, retry once on the WebGL2 backend. */
function fallbackToWebGL(reason: unknown) {
  const qs = new URLSearchParams(location.search);
  let tried = false; try { tried = sessionStorage.getItem('ma.fallback') === '1'; } catch { /* ignore */ }
  if ('gpu' in navigator && !qs.has('webgl') && !tried) {
    console.warn('WebGPU start-up failed, retrying with WebGL2', reason);
    try { sessionStorage.setItem('ma.fallback', '1'); localStorage.setItem('ma.renderer', 'webgl'); } catch { /* ignore */ }
    qs.set('webgl', '1'); location.search = qs.toString(); return true;
  }
  return false;
}
let booted = false;
addEventListener('unhandledrejection', (e) => { if (!booted || performance.now() < 15000) { if (/gpu|webgpu|shader|pipeline|wgsl/i.test(String(e.reason?.message ?? e.reason))) fallbackToWebGL(e.reason); } });
game.boot().then(() => { booted = true; }).catch((e) => {
  console.error(e);
  if (fallbackToWebGL(e)) return;
  document.body.insertAdjacentHTML('beforeend', `<pre style="position:fixed;top:0;left:0;right:0;color:#f88;background:#000c;z-index:99;white-space:pre-wrap;padding:12px">Could not start the game.\n${e?.stack ?? e}</pre>`);
});

import { serve, launch } from './browser.mjs';
const srv = await serve(); const { browser, page, errors } = await launch({ width: 960, height: 540 });
await page.goto('http://localhost:4173/' + (process.argv[2] ?? '?q=low&auto&chapter=1'));
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 }).catch((e) => console.log('notready', e.message));
const r = await page.evaluate(async () => {
  const g = window.__game; const T = {}; if (location.search.includes('noui')) document.getElementById('ui').style.display = 'none'; const hs = new URLSearchParams(location.search).get('hide'); if (hs) for (const s of hs.split(',')) document.querySelectorAll('.' + s).forEach((e) => (e.style.display = 'none')); T.calls = g.engine.renderer.info.render.drawCalls; T.tris = g.engine.renderer.info.render.triangles; const wrap = (o, n, label) => { const f = o[n].bind(o); o[n] = (...a) => { const t = performance.now(); const r = f(...a); T[label] = (T[label] ?? 0) + performance.now() - t; return r; }; };
  wrap(g.world, 'update', 'world'); wrap(g.traffic, 'update', 'traffic'); wrap(g.peds, 'update', 'peds'); wrap(g.hud, 'update', 'hud'); wrap(g.engine, 'render', 'render'); wrap(g.phys, 'update', 'phys'); wrap(g.weather, 'update', 'weather'); wrap(g.church, 'update', 'church'); wrap(g.isaac, 'update', 'isaac'); wrap(g.story, 'update', 'story'); wrap(g.audio, 'update', 'audio'); wrap(g.engine, 'tick', 'tick');
  const t0 = performance.now(); for (let i = 0; i < 8; i++) { g.frame(1 / 30); await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }); }
  T.total = performance.now() - t0; for (const k in T) T[k] = Math.round(T[k]); return T;
}).catch((e) => 'ERR ' + e.message.slice(0, 200));
console.log(JSON.stringify(r)); console.log(errors.slice(0, 8)); await browser.close(); srv.close();

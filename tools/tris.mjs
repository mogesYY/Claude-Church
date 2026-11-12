import { serve, launch } from './browser.mjs';
const srv = await serve(); const { browser, page } = await launch({ width: 960, height: 540 });
await page.goto('http://localhost:4173/' + (process.argv[2] ?? '?q=low&roam'));
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 });
await page.waitForTimeout(4000);
console.log(JSON.stringify(await page.evaluate(() => { const g = window.__game; const out = {}; g.engine.scene.traverseVisible((o) => { if (!o.isMesh || !o.geometry) return; const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const m = o.material; const key = (o.isInstancedMesh ? 'inst:' : o.isSkinnedMesh ? 'skin:' : '') + (m.map ? 'tex' : '') + '#' + (m.color ? m.color.getHexString() : '') + (m.vertexColors ? 'v' : '') + (m.visible === false ? ' HIDDEN' : ''); out[key] = (out[key] ?? 0) + Math.round(n); }); return Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 14); })));
await browser.close(); srv.close();

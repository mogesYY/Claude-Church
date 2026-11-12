import { serve, launch } from './browser.mjs';
const srv = await serve(); const { browser, page, errors } = await launch({ width: 480, height: 270 });
await page.goto('http://localhost:4173/?q=high&roam&auto');
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 150000 }).catch((e) => console.log('notready', e.message.slice(0, 80)));
console.log(JSON.stringify(await page.evaluate(async () => { const g = window.__game; for (let i = 0; i < 20; i++) { g.frame(1 / 30); await new Promise((r) => setTimeout(r, 30)); } return { webgpu: g.engine.isWebGPU, post: !!g.engine.post, postFailed: g.engine.postFailed, q: g.engine.quality }; }).catch((e) => e.message.slice(0, 200))));
console.log(errors.slice(0, 6)); await browser.close(); srv.close();

import { serve, launch } from './browser.mjs';
const srv = await serve(); const { browser, page, errors } = await launch({ width: 960, height: 540 });
await page.goto('http://localhost:4173/' + (process.argv[2] ?? '?q=low&auto&chapter=1'));
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 }).catch((e) => console.log('notready', e.message));
for (let k = 0; k < +(process.argv[3] ?? 40); k++) { const t = Date.now(); const r = await page.evaluate(async () => { const g = window.__game; for (let i = 0; i < 10; i++) { g.frame(1 / 30); await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }); } return [g.time.toFixed(1), g.mode, g.story.npcs.length, (document.querySelector('.objective')?.textContent ?? '').slice(9, 50), document.querySelector('.fade').style.opacity, document.querySelector('.subtitle').style.opacity]; }).catch((e) => 'ERR ' + e.message.slice(0, 100)); console.log(k, Date.now() - t, JSON.stringify(r)); if (String(r).startsWith('ERR')) break; }
console.log(errors.slice(0, 8)); await browser.close(); srv.close();

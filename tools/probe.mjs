import { serve, launch } from './browser.mjs';
const srv = await serve(); const { browser, page, errors } = await launch({ width: 960, height: 540 });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('[' + m.type() + ']', m.text().slice(0, 300)); });
await page.goto('http://localhost:4173/' + (process.argv[2] ?? '?q=low&auto&chapter=1'));
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 });
for (let i = 0; i < +(process.argv[3] ?? 30); i++) { await page.waitForTimeout(3000); const s = await page.evaluate(() => ({ t: +window.__game.time.toFixed(1), fps: +window.__game.fps.toFixed(1), mode: window.__game.mode, npcs: window.__game.story.npcs.length, obj: (document.querySelector('.objective')?.textContent ?? '').slice(0, 50), sub: (document.querySelector('.subtitle .l1')?.textContent ?? '').slice(0, 40) })).catch((e) => e.message); console.log(JSON.stringify(s)); }
console.log(errors.slice(0, 10)); await browser.close(); srv.close();

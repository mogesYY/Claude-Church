// Quick one-off screenshot: node tools/shot.mjs out.png "?q=low" "js to eval" waitMs
import { serve, launch } from './browser.mjs';
const [out = 'captures/shot.png', query = '', js = '', wait = '3000'] = process.argv.slice(2);
const srv = await serve();
const { browser, page, errors } = await launch();
await page.goto('http://localhost:4173/' + query);
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 180000 }).catch((e) => console.log('not ready', e.message));
if (js) console.log('eval ->', JSON.stringify(await page.evaluate(js).catch((e) => 'ERR ' + e.message)));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log('errors:', errors.slice(0, 12));
await browser.close(); srv.close();

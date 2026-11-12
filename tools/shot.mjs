// Quick one-off screenshot: node tools/shot.mjs out.png "?q=low" "js to eval" waitMs [w h]
import { serve, launch } from './browser.mjs';
const [out = 'captures/shot.png', query = '', js = '', wait = '3000', w = '1280', h = '720'] = process.argv.slice(2);
const srv = await serve();
const { browser, page, errors } = await launch({ width: +w, height: +h });
await page.goto('http://localhost:4173/' + query);
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 180000 }).catch((e) => console.log('not ready', e.message));
if (js) console.log('eval ->', JSON.stringify(await page.evaluate(js).catch((e) => 'ERR ' + e.message)));
await page.waitForTimeout(+wait);
console.log('fps', await page.evaluate(() => window.__game?.fps?.toFixed?.(1)).catch((e) => e.message));
await page.screenshot({ path: out, timeout: 120000 }).catch((e) => console.log('shot failed', e.message));
console.log('errors:', errors.slice(0, 12));
await browser.close(); srv.close();

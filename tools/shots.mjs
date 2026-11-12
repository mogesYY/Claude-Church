// Multi-shot capture: node tools/shots.mjs "<query>" name1 "js1" name2 "js2" ...   (each shot waits WAIT ms, default 3500)
import { serve, launch } from './browser.mjs';
const [query = '', ...rest] = process.argv.slice(2);
const wait = +(process.env.WAIT ?? 3500);
const srv = await serve();
const { browser, page, errors } = await launch({ width: +(process.env.W ?? 1280), height: +(process.env.H ?? 720) });
await page.goto('http://localhost:4173/' + query);
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 }).catch((e) => console.log('not ready', e.message));
for (let i = 0; i < rest.length; i += 2) {
  const r = await page.evaluate(rest[i + 1]).catch((e) => 'ERR ' + e.message);
  if (r !== undefined && r !== null) console.log(rest[i], '->', JSON.stringify(r));
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `captures/${rest[i]}.png`, timeout: 120000 }).catch((e) => console.log('shot failed', rest[i], e.message));
}
console.log('fps', await page.evaluate(() => window.__game?.fps?.toFixed?.(1)).catch(() => '?'), 'errors:', errors.slice(0, 10));
await browser.close(); srv.close();

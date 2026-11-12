// Headless smoke test: auto-plays every chapter (teleporting through objectives) and reports runtime errors.
// node tools/smoke.mjs [firstChapter] [lastChapter]   — also saves one screenshot per chapter into captures/
import { serve, launch } from './browser.mjs';
const a = +(process.argv[2] ?? 1), b = +(process.argv[3] ?? 5);
const srv = await serve(); let failed = false;
for (let ch = a; ch <= b; ch++) {
  const { browser, page, errors } = await launch({ width: +(process.env.W ?? 320), height: +(process.env.H ?? 180) });
  await page.goto(`http://localhost:4173/?q=low&auto&chapter=${ch}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 240000 });
  const t0 = Date.now(); let last = '', shots = 0;
  for (;;) {
    await page.evaluate(async () => { for (let i = 0; i < +(new URLSearchParams(location.search).get('n') ?? 150); i++) { window.__game.frame(1 / 30); await new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); }); } });
    const st = await page.evaluate(() => ({ idx: window.__game.story.index, run: window.__game.story.running, roam: window.__game.story.roaming, obj: document.querySelector('.objective')?.textContent ?? '', mode: window.__game.mode }));
    if (process.env.SHOTS && st.mode === 'cutscene' && shots < 60) await page.screenshot({ path: `captures/ch${ch}_${String(shots++).padStart(2, '0')}_cut.png`, timeout: 90000 }).catch(() => {});
    if (st.obj !== last) { last = st.obj; if (process.env.VERBOSE) console.log(`  ch${ch}:`, st.obj || `(${st.mode})`); if (shots < 60 && process.env.SHOTS) await page.screenshot({ path: `captures/ch${ch}_${String(shots++).padStart(2, '0')}.png`, timeout: 90000 }).catch(() => {}); }
    if (st.idx !== ch - 1 || st.roam) { console.log(`chapter ${ch}: completed in ${((Date.now() - t0) / 1000).toFixed(0)} s`); break; }
    if (Date.now() - t0 > +(process.env.LIMIT ?? 420000)) { console.log(`chapter ${ch}: TIMEOUT at "${st.obj}" mode=${st.mode}`); failed = true; await page.screenshot({ path: `captures/smoke_ch${ch}_timeout.png` }).catch(() => {}); break; }
  }
  const errs = errors.filter((e) => !/favicon|audio\/chant|404/.test(e));
  if (errs.length) { failed = true; console.log(`chapter ${ch} errors:`, errs.slice(0, 8)); }
  await browser.close();
}
srv.close(); process.exit(failed ? 1 : 0);

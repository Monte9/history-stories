const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];
async function hud(page) {
  return page.evaluate(() => {
    const h = document.querySelector('#museum-hud');
    return { x: +h.getAttribute('data-x'), z: +h.getAttribute('data-z'), heading: +h.getAttribute('data-heading'), focused: h.getAttribute('data-focused') };
  });
}
async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(100); }
(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/?face=roman', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Shift');
  // A: walk straight at heading 0, log every burst
  for (let i = 0; i < 26; i++) {
    await hold(page, 'ArrowUp', 350);
    const h = await hud(page);
    console.log(`A walk${i}:`, JSON.stringify(h));
    if (h.focused) break;
  }
  // B: if focused, test heading normalization effect: turn right ~full circle? too slow. Just report.
  const h1 = await hud(page);
  console.log('A end:', JSON.stringify(h1));
  await ctx.close();
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

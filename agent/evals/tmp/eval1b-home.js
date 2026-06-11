const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];
(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const out = {};
  for (const [name, vp, url] of [
    ['home1280', { width: 1280, height: 900 }, '/'],
    ['home390', { width: 390, height: 844 }, '/'],
    ['gallery1280', { width: 1280, height: 900 }, '/gallery'],
  ]) {
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    if (url === '/') await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
    await page.waitForTimeout(1000);
    const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('img')).map(i => ({ src: (i.currentSrc || i.src).split('/').pop(), ok: i.naturalWidth > 0 })));
    const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    const galleryLink = await page.locator('a[href="/gallery"]').count();
    const homeLink = await page.locator('a[href="/"]').count();
    out[name] = { errors, brokenImgs: imgs.filter(i => !i.ok), imgCount: imgs.length, overflow: ov, galleryLink, homeLink };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });

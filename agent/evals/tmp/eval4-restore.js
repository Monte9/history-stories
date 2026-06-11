const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('http://localhost:3000/?face=curator', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  console.log('curator after cleanup:', await page.evaluate(() => document.querySelector('#museum-hud').getAttribute('data-wall-curator')));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

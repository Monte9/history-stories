const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const SHOTS = '/home/user/history-stories/agent/evals/shots';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];
(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const out = {};
  for (const face of ['curator', 'roman']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    await page.goto(BASE + '/?face=' + face, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SHOTS + '/s5-pipeline-' + face + '-1280.png' });
    out[face] = {
      errors,
      curator: await page.evaluate(() => document.querySelector('#museum-hud').getAttribute('data-wall-curator')),
      roman: await page.evaluate(() => document.querySelector('#museum-hud').getAttribute('data-wall-roman')),
    };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error('FATAL', e); process.exit(1); });

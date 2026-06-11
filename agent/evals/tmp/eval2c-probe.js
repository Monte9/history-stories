const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const SHOTS = '/home/user/history-stories/agent/evals/shots';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];
async function hud(page) {
  return page.evaluate(() => {
    const h = document.querySelector('#museum-hud');
    return { x: +h.getAttribute('data-x'), z: +h.getAttribute('data-z'), heading: +h.getAttribute('data-heading'), focused: h.getAttribute('data-focused') };
  });
}
async function prompt(page) {
  return page.evaluate(() => {
    const p = document.querySelector('#museum-prompt');
    if (!p) return 'NO #museum-prompt element';
    const cs = getComputedStyle(p);
    return { text: p.textContent.trim(), display: cs.display, opacity: cs.opacity, visibility: cs.visibility };
  });
}
async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(120); }
(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + '/?face=roman', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.keyboard.press('Shift');
  // walk to convergence
  let prev = await hud(page);
  for (let i = 0; i < 30; i++) {
    await hold(page, 'ArrowUp', 350);
    const h = await hud(page);
    if (Math.abs(h.z - prev.z) < 0.03 && Math.abs(h.x - prev.x) < 0.03) break;
    prev = h;
  }
  console.log('converged:', JSON.stringify(await hud(page)));
  // stand still 3s
  await page.waitForTimeout(3000);
  console.log('after 3s still:', JSON.stringify(await hud(page)), JSON.stringify(await prompt(page)));
  await page.screenshot({ path: SHOTS + '/s5-probe-roman-converged.png' });
  // nudge heading right a touch
  await hold(page, 'ArrowRight', 100);
  await page.waitForTimeout(800);
  console.log('after nudge R:', JSON.stringify(await hud(page)), JSON.stringify(await prompt(page)));
  await hold(page, 'ArrowLeft', 200);
  await page.waitForTimeout(800);
  console.log('after nudge L:', JSON.stringify(await hud(page)), JSON.stringify(await prompt(page)));
  // back up 1 unit and recheck (maybe too close?)
  await hold(page, 'ArrowDown', 1200);
  await page.waitForTimeout(800);
  console.log('after backup:', JSON.stringify(await hud(page)), JSON.stringify(await prompt(page)));
  await hold(page, 'ArrowDown', 1200);
  await page.waitForTimeout(800);
  console.log('after backup2:', JSON.stringify(await hud(page)), JSON.stringify(await prompt(page)));
  // Enter with nothing focused: URL should not change
  const before = page.url();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  console.log('enter test: url before', before, 'after', page.url());
  console.log('console errors:', JSON.stringify(errors));
  await ctx.close();
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

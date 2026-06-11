// Sprint 5 eval, part 1: regressions (home, gallery, story page) + wall screenshots + curator HUD
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SHOTS = '/home/user/history-stories/agent/evals/shots';
const BASE = 'http://localhost:3000';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];

async function newPage(browser, vp) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  return { ctx, page, errors };
}

async function checkImages(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img')).map((i) => ({
      src: i.currentSrc || i.src,
      ok: i.naturalWidth > 0,
    }))
  );
}

async function overflow(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
}

async function waitLoaded(page) {
  await page.waitForFunction(
    () => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true',
    null,
    { timeout: 60000 }
  );
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const out = {};

  // ---------- Homepage 1280 ----------
  {
    const { ctx, page, errors } = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitLoaded(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: SHOTS + '/s5-home-1280.png' });
    const hud = await page.evaluate(() => {
      const h = document.querySelector('#museum-hud');
      const o = {};
      for (const a of h.getAttributeNames()) o[a] = h.getAttribute(a);
      return o;
    });
    out.home1280 = { errors, hud, galleryLink: await page.locator('a[href="/gallery"]').count() };
    await ctx.close();
  }

  // ---------- Homepage 390 ----------
  {
    const { ctx, page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await waitLoaded(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SHOTS + '/s5-home-390.png' });
    out.home390 = { errors, overflow: await overflow(page), galleryLink: await page.locator('a[href="/gallery"]').count() };
    await ctx.close();
  }

  // ---------- Gallery 1280 + 390 ----------
  {
    const { ctx, page, errors } = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(BASE + '/gallery', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: SHOTS + '/s5-gallery-1280.png' });
    out.gallery1280 = { errors, images: await checkImages(page), museumLink: await page.locator('a[href="/"]').count() };
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.goto(BASE + '/gallery', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: SHOTS + '/s5-gallery-390.png' });
    out.gallery390 = { errors, overflow: await overflow(page) };
    await ctx.close();
  }

  // ---------- Story page (carousel regression) ----------
  const SLUG = '20260421-053750-the-grandfather-who-could-not-choose-his-side';
  {
    const { ctx, page, errors } = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(BASE + '/' + SLUG, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: SHOTS + '/s5-story-1280.png' });
    const dots = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((b) =>
        /panel|slide|cover/i.test(b.getAttribute('aria-label') || '')
      );
      return btns.map((b) => ({ label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed') || b.getAttribute('aria-current') || (b.className.includes('active') ? 'active' : '') }));
    });
    // cycle carousel with ArrowRight
    const before = await page.evaluate(() => document.body.innerHTML.length); // placeholder
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    await page.screenshot({ path: SHOTS + '/s5-story-1280-panel2.png' });
    out.story1280 = { errors, images: await checkImages(page), dots };
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.goto(BASE + '/' + SLUG, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: SHOTS + '/s5-story-390.png' });
    out.story390 = { errors, overflow: await overflow(page) };
    await ctx.close();
  }

  // ---------- Wall faces at 1280 (night lighting evidence) ----------
  for (const face of ['roman', 'ramayana', 'mahabharata', 'curator']) {
    const { ctx, page, errors } = await newPage(browser, { width: 1280, height: 900 });
    await page.goto(BASE + '/?face=' + face, { waitUntil: 'networkidle' });
    await waitLoaded(page);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: SHOTS + `/s5-face-${face}-1280.png` });
    const hud = await page.evaluate(() => {
      const h = document.querySelector('#museum-hud');
      const o = {};
      for (const a of h.getAttributeNames()) o[a] = h.getAttribute(a);
      return o;
    });
    out['face_' + face] = { errors, hud };
    await ctx.close();
  }

  // ---------- curator at 390 (overflow) ----------
  {
    const { ctx, page, errors } = await newPage(browser, { width: 390, height: 844 });
    await page.goto(BASE + '/?face=curator', { waitUntil: 'networkidle' });
    await waitLoaded(page);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: SHOTS + '/s5-face-curator-390.png' });
    out.curator390 = { errors, overflow: await overflow(page) };
    await ctx.close();
  }

  await browser.close();
  console.log(JSON.stringify(out, null, 2));
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

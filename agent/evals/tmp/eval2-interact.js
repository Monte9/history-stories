// Sprint 5 eval, part 2: curator wall focus -> Enter -> Escape round trip; same on roman wall
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const SHOTS = '/home/user/history-stories/agent/evals/shots';
const BASE = 'http://localhost:3000';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];

const CURATOR_SLUGS = [
  '20260421-053750-the-grandfather-who-could-not-choose-his-side',
  '20260417-053005-the-brother-who-didnt-sleep',
  '20260406-165643-the-vulture-who-sat-wingless-for-decades',
];
const TITLES = {
  '20260421-053750-the-grandfather-who-could-not-choose-his-side': 'The Grandfather Who Could Not Choose His Side',
  '20260417-053005-the-brother-who-didnt-sleep': "The Brother Who Didn't Sleep for Fourteen Years",
  '20260406-165643-the-vulture-who-sat-wingless-for-decades': 'The Vulture Who Sat Wingless for Decades',
};

async function hud(page) {
  return page.evaluate(() => {
    const h = document.querySelector('#museum-hud');
    return {
      x: parseFloat(h.getAttribute('data-x')),
      z: parseFloat(h.getAttribute('data-z')),
      heading: parseFloat(h.getAttribute('data-heading')),
      focused: h.getAttribute('data-focused'),
      loaded: h.getAttribute('data-loaded'),
    };
  });
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
}

async function seekFocus(page, targetSlugs, log) {
  // walk forward in bursts until position converges (wall) or focus acquired
  let prev = await hud(page);
  for (let i = 0; i < 18; i++) {
    await holdKey(page, 'ArrowUp', 350);
    const h = await hud(page);
    log.push(`walk${i}: x=${h.x} z=${h.z} hd=${h.heading} f=${h.focused}`);
    if (targetSlugs.includes(h.focused)) return h.focused;
    if (Math.hypot(h.x - prev.x, h.z - prev.z) < 0.05) break; // hit wall
    prev = h;
  }
  // sweep right then left
  for (const [key, n] of [['ArrowRight', 14], ['ArrowLeft', 28], ['ArrowRight', 14]]) {
    for (let i = 0; i < n; i++) {
      await holdKey(page, key, 130);
      const h = await hud(page);
      log.push(`${key}${i}: hd=${h.heading} f=${h.focused}`);
      if (targetSlugs.includes(h.focused)) return h.focused;
    }
  }
  // step back a bit and retry forward at current heading
  await holdKey(page, 'ArrowDown', 500);
  for (let i = 0; i < 8; i++) {
    await holdKey(page, 'ArrowUp', 250);
    const h = await hud(page);
    log.push(`re-walk${i}: x=${h.x} z=${h.z} hd=${h.heading} f=${h.focused}`);
    if (targetSlugs.includes(h.focused)) return h.focused;
  }
  return null;
}

async function roundTrip(browser, face, targetSlugs, shotPrefix) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + '/?face=' + face, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(800);
  // dismiss hint with a harmless keypress
  await page.keyboard.press('Shift');

  const log = [];
  const focusedSlug = await seekFocus(page, targetSlugs, log);
  const result = { face, errors, log, focusedSlug };
  if (!focusedSlug) {
    await page.screenshot({ path: `${SHOTS}/${shotPrefix}-nofocus.png` });
    await ctx.close();
    return result;
  }
  await page.waitForTimeout(400);
  const atFocus = await hud(page);
  result.savedPos = atFocus;
  // prompt check
  result.prompt = await page.evaluate(() => {
    const p = document.querySelector('#museum-prompt');
    if (!p) return null;
    const cs = getComputedStyle(p);
    return { text: p.textContent, visible: cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0' };
  });
  await page.screenshot({ path: `${SHOTS}/${shotPrefix}-focused.png` });

  // Enter -> story page
  await page.keyboard.press('Enter');
  await page.waitForURL('**/' + focusedSlug, { timeout: 15000 });
  result.storyUrl = page.url();
  await page.waitForTimeout(600);

  // Escape -> back to room at saved spot
  await page.keyboard.press('Escape');
  await page.waitForURL(BASE + '/', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const back = await hud(page);
  result.returnPos = back;
  result.posDelta = {
    dx: Math.abs(back.x - atFocus.x),
    dz: Math.abs(back.z - atFocus.z),
    dheading: Math.abs(((back.heading - atFocus.heading + 540) % 360) - 180),
  };
  await page.screenshot({ path: `${SHOTS}/${shotPrefix}-returned.png` });
  await ctx.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const curator = await roundTrip(browser, 'curator', CURATOR_SLUGS, 's5-curator-rt');
  // roman wall for the "identically to tradition walls" comparison
  const romanSlugs = [
    '20260406-164948-the-man-who-read-plato-before-he-died',
    '20260328-203626-what-marcus-aurelius-wrote-in-the-dark',
    '20260327-234958-the-soldier-who-wept-for-his-enemy',
  ];
  const roman = await roundTrip(browser, 'roman', romanSlugs, 's5-roman-rt');
  await browser.close();
  const summarize = (r) => ({
    face: r.face,
    errors: r.errors,
    focusedSlug: r.focusedSlug,
    savedPos: r.savedPos,
    prompt: r.prompt,
    storyUrl: r.storyUrl,
    returnPos: r.returnPos,
    posDelta: r.posDelta,
    logTail: r.log.slice(-6),
  });
  console.log(JSON.stringify({ curator: summarize(curator), roman: summarize(roman) }, null, 2));
  console.log('TITLEMATCH curator:', curator.focusedSlug ? (curator.prompt && curator.prompt.text.includes(TITLES[curator.focusedSlug])) : 'n/a');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });

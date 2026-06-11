// Sprint 5 eval: curator + roman round trips with crab-scan
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = 'http://localhost:3000';
const SHOTS = '/home/user/history-stories/agent/evals/shots';
const ARGS = ['--use-gl=angle', '--enable-unsafe-swiftshader'];

const CURATOR_SLUGS = [
  '20260421-053750-the-grandfather-who-could-not-choose-his-side',
  '20260417-053005-the-brother-who-didnt-sleep',
  '20260406-165643-the-vulture-who-sat-wingless-for-decades',
];

async function hud(page) {
  return page.evaluate(() => {
    const h = document.querySelector('#museum-hud');
    return { x: +h.getAttribute('data-x'), z: +h.getAttribute('data-z'), heading: +h.getAttribute('data-heading'), focused: h.getAttribute('data-focused') };
  });
}
async function promptInfo(page) {
  return page.evaluate(() => {
    const p = document.querySelector('#museum-prompt');
    if (!p) return null;
    const cs = getComputedStyle(p);
    return { text: p.textContent.trim(), shown: cs.display !== 'none' && cs.opacity !== '0' && cs.visibility !== 'hidden' };
  });
}
async function hold(page, key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); await page.waitForTimeout(130); }

function shortestDelta(from, to) {
  let d = ((to - from) % 360 + 540) % 360 - 180;
  return d;
}
async function turnTo(page, target, log) {
  for (let i = 0; i < 12; i++) {
    const h = await hud(page);
    const d = shortestDelta(h.heading, target);
    if (Math.abs(d) < 5) return;
    const key = d > 0 ? 'ArrowRight' : 'ArrowLeft'; // assume right = heading increases (measured +9.6 per 100ms)
    const ms = Math.max(60, Math.min(500, Math.abs(d) / 96 * 1000 * 0.8));
    await hold(page, key, ms);
    log.push(`turnTo(${target}) -> hd=${(await hud(page)).heading}`);
  }
}
async function walkConverge(page, log) {
  let prev = await hud(page);
  for (let i = 0; i < 40; i++) {
    await hold(page, 'ArrowUp', 350);
    const h = await hud(page);
    if (h.focused) return h.focused;
    if (Math.abs(h.x - prev.x) < 0.03 && Math.abs(h.z - prev.z) < 0.03) { log.push(`converged at x=${h.x} z=${h.z}`); return null; }
    prev = h;
  }
  return null;
}

async function seek(page, faceHeading, targets, log) {
  // approach wall head-on
  let f = await walkConverge(page, log);
  if (f && targets.includes(f)) return f;
  // crab-scan: move laterally along the wall, re-face, check focus with small nudges
  for (const lateral of [(faceHeading + 90) % 360, (faceHeading + 270) % 360]) {
    for (let step = 0; step < 8; step++) {
      await turnTo(page, lateral, log);
      await hold(page, 'ArrowUp', 700); // ~0.6 units along wall
      await turnTo(page, faceHeading, log);
      // press into the wall to stay close
      await hold(page, 'ArrowUp', 400);
      let h = await hud(page);
      log.push(`crab ${lateral} step${step}: x=${h.x} z=${h.z} hd=${h.heading} f=${h.focused}`);
      if (h.focused && targets.includes(h.focused)) return h.focused;
      // nudge heading +-12 deg
      for (const ms of [120, 240]) {
        await hold(page, ms === 120 ? 'ArrowRight' : 'ArrowLeft', ms);
        h = await hud(page);
        if (h.focused && targets.includes(h.focused)) return h.focused;
      }
      await hold(page, 'ArrowRight', 120); // re-center approx
    }
    // walk back to wall center before scanning the other direction
    await turnTo(page, (lateral + 180) % 360, log);
    for (let i = 0; i < 10; i++) {
      await hold(page, 'ArrowUp', 700);
      const h = await hud(page);
      if (Math.abs(h.x) < 0.6 && Math.abs(h.z) < 0.6) break;
      // crude: stop when near the face axis
      if (faceHeading === 270 && Math.abs(h.z) < 0.6) break;
      if (faceHeading === 0 && Math.abs(h.x) < 0.6) break;
    }
    await turnTo(page, faceHeading, log);
  }
  return null;
}

async function roundTrip(browser, face, faceHeading, targets, prefix) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.goto(BASE + '/?face=' + face, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Shift');
  const log = [];
  const slug = await seek(page, faceHeading, targets, log);
  const res = { face, slug, errors, log: log.slice(-12) };
  if (!slug) { await page.screenshot({ path: `${SHOTS}/${prefix}-nofocus.png` }); await ctx.close(); return res; }
  await page.waitForTimeout(500);
  const saved = await hud(page);
  res.saved = saved;
  res.prompt = await promptInfo(page);
  await page.screenshot({ path: `${SHOTS}/${prefix}-focused.png` });
  await page.keyboard.press('Enter');
  await page.waitForURL('**/' + slug, { timeout: 15000 });
  res.storyUrl = page.url();
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape');
  await page.waitForURL((u) => u.pathname === '/', { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#museum-hud')?.getAttribute('data-loaded') === 'true', null, { timeout: 60000 });
  await page.waitForTimeout(900);
  const back = await hud(page);
  res.back = back;
  res.delta = { dx: +(Math.abs(back.x - saved.x)).toFixed(3), dz: +(Math.abs(back.z - saved.z)).toFixed(3), dh: +Math.abs(shortestDelta(saved.heading, back.heading)).toFixed(2) };
  await page.screenshot({ path: `${SHOTS}/${prefix}-returned.png` });
  await ctx.close();
  return res;
}

(async () => {
  const browser = await chromium.launch({ args: ARGS });
  const curator = await roundTrip(browser, 'curator', 270, CURATOR_SLUGS, 's5-curator-rt');
  console.log('CURATOR:', JSON.stringify(curator, null, 2));
  const roman = await roundTrip(browser, 'roman', 0, ['20260328-203626-what-marcus-aurelius-wrote-in-the-dark'], 's5-roman-rt');
  console.log('ROMAN:', JSON.stringify(roman, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });

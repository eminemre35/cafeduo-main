/**
 * Site screenshot capture for README assets.
 * Visits cafeduotr.com at desktop + mobile viewports and saves PNGs.
 * Usage: node scripts/capture-screenshots.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.SHOT_BASE_URL || 'https://cafeduotr.com';
const OUT_DIR = path.resolve('assets/screenshots');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

// Anonymous (no-login) shots
const SHOTS = [
  { name: 'landing', path: '/', fullPage: false },
  { name: 'landing-full', path: '/', fullPage: true, desktopOnly: true },
  { name: 'privacy', path: '/gizlilik', fullPage: false },
];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}`);

  const browser = await chromium.launch({ headless: true });
  let total = 0;
  let failed = 0;

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch || false,
      deviceScaleFactor: vp.deviceScaleFactor,
    });
    for (const s of SHOTS) {
      if (s.desktopOnly && vp.name !== 'desktop') continue;
      const url = `${BASE_URL}${s.path}`;
      const out = path.join(OUT_DIR, `${s.name}-${vp.name}.png`);
      let attempt = 0;
      let ok = false;
      while (attempt < 2 && !ok) {
        attempt++;
        const page = await ctx.newPage();
        try {
          console.log(`SHOT ${vp.name}/${s.name} (try ${attempt}) -> ${url}`);
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(2500);
          await page.screenshot({ path: out, fullPage: s.fullPage });
          const sz = fs.statSync(out).size;
          console.log(`  OK  ${out} (${(sz / 1024).toFixed(1)} KB)`);
          total++;
          ok = true;
        } catch (e) {
          console.error(`  FAIL ${s.name}/${vp.name} (try ${attempt}): ${e.message}`);
          if (attempt >= 2) failed++;
        } finally {
          await page.close();
        }
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\nDone. ${total} screenshots, ${failed} failed.`);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

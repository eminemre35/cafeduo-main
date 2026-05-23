/**
 * Site screenshot capture for README assets.
 *
 * Anonymous shots (always): landing, landing-full (desktop), privacy.
 * Authenticated shots (only if AUTH_*_EMAIL env vars set):
 *   user  → /dashboard
 *   admin → /admin
 *
 * Usage:
 *   $env:AUTH_USER_EMAIL = 'user@x.com'
 *   $env:AUTH_USER_PASSWORD = 'pass'
 *   $env:AUTH_ADMIN_EMAIL = 'admin@x.com'
 *   $env:AUTH_ADMIN_PASSWORD = 'pass'
 *   node scripts/capture-screenshots.mjs
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

const ANONYMOUS_SHOTS = [
  { name: 'landing', path: '/', fullPage: false },
  { name: 'landing-full', path: '/', fullPage: true, desktopOnly: true },
  { name: 'privacy', path: '/gizlilik', fullPage: false },
];

const ACCOUNTS = {
  user: {
    email: process.env.AUTH_USER_EMAIL,
    password: process.env.AUTH_USER_PASSWORD,
    shots: [{ name: 'dashboard', path: '/dashboard', fullPage: false }],
  },
  admin: {
    email: process.env.AUTH_ADMIN_EMAIL,
    password: process.env.AUTH_ADMIN_PASSWORD,
    shots: [{ name: 'admin', path: '/admin', fullPage: false }],
  },
};

async function dismissCookieBanner(page) {
  const accept = page
    .locator(
      'button:has-text("KABUL ET"), button:has-text("Kabul Et"), button:has-text("kabul et")'
    )
    .first();
  if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

async function takeShot(page, url, outFile, fullPage = false, waitMs = 2500) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1200);
      await dismissCookieBanner(page);
      await page.waitForTimeout(waitMs - 700);
      await page.screenshot({ path: outFile, fullPage });
      const sz = fs.statSync(outFile).size;
      console.log(`  OK  ${outFile} (${(sz / 1024).toFixed(1)} KB)`);
      return true;
    } catch (e) {
      console.error(`  FAIL ${outFile} (try ${attempt}): ${e.message}`);
    }
  }
  return false;
}

async function loginAs(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  // Accept cookies first — login requires it
  await dismissCookieBanner(page);
  // Hero CTA opens AuthModal in 'login' mode by default
  const trigger = page.locator('[data-testid="hero-login-button"]');
  await trigger.scrollIntoViewIfNeeded({ timeout: 5000 });
  await trigger.click({ timeout: 10000 });
  await page.waitForTimeout(800);
  // Make sure we are on the login tab (modal defaults to login but be safe)
  const loginTab = page.locator('button:has-text("Giriş Yap")').first();
  if (await loginTab.isVisible().catch(() => false)) {
    await loginTab.click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.locator('[data-testid="auth-email-input"]').fill(email);
  await page.locator('[data-testid="auth-password-input"]').fill(password);
  await page.locator('[data-testid="auth-submit-button"]').click();
  // Give auth + redirect a moment
  await page.waitForTimeout(5000);
}

async function newCtx(browser, vp) {
  return browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.hasTouch || false,
    deviceScaleFactor: vp.deviceScaleFactor,
  });
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Target: ${BASE_URL}`);
  console.log(`Output: ${OUT_DIR}`);
  const browser = await chromium.launch({ headless: true });
  let total = 0;
  let failed = 0;

  for (const vp of VIEWPORTS) {
    console.log(`\n=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);

    // Anonymous shots
    {
      const ctx = await newCtx(browser, vp);
      for (const s of ANONYMOUS_SHOTS) {
        if (s.desktopOnly && vp.name !== 'desktop') continue;
        const url = `${BASE_URL}${s.path}`;
        const out = path.join(OUT_DIR, `${s.name}-${vp.name}.png`);
        const page = await ctx.newPage();
        const ok = await takeShot(page, url, out, s.fullPage);
        if (ok) total++;
        else failed++;
        await page.close();
      }
      await ctx.close();
    }

    // Authenticated shots
    for (const [role, acc] of Object.entries(ACCOUNTS)) {
      if (!acc.email || !acc.password) {
        console.log(`  SKIP role=${role} (no creds in env)`);
        continue;
      }
      const ctx = await newCtx(browser, vp);
      const loginPage = await ctx.newPage();
      try {
        console.log(`  LOGIN ${role} as ${acc.email}`);
        await loginAs(loginPage, acc.email, acc.password);
      } catch (e) {
        console.error(`  LOGIN FAILED ${role}: ${e.message}`);
        await loginPage.close();
        await ctx.close();
        continue;
      }
      await loginPage.close();
      for (const s of acc.shots) {
        const url = `${BASE_URL}${s.path}`;
        const out = path.join(OUT_DIR, `${s.name}-${vp.name}.png`);
        const page = await ctx.newPage();
        const ok = await takeShot(page, url, out, s.fullPage, 3500);
        if (ok) total++;
        else failed++;
        await page.close();
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log(`\nDone. ${total} screenshots, ${failed} failed.`);
}

run().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});

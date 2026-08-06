import { test, expect } from '@playwright/test';
import {
  DEFAULT_E2E_APP_BASE_URL,
  provisionUser,
  checkInUser,
  fetchCurrentUser,
  bootstrapAuthenticatedPage,
  resolveApiBaseUrl,
  waitForApiReady,
} from './helpers/session';

test.describe('Daily Reward Wheel (Dashboard)', () => {
  test('@smoke shows the daily reward wheel after check-in', async ({ page, request, baseURL }) => {
    const root = baseURL || DEFAULT_E2E_APP_BASE_URL;
    const apiRoot = resolveApiBaseUrl(root);
    await waitForApiReady(request, apiRoot);

    const session = await provisionUser(request, root, 'wheel_user');
    await checkInUser(request, root, session.token, { tableNumber: 3, csrfToken: session.csrfToken });
    const currentUser = await fetchCurrentUser(request, root, session.token);

    // Check-in API ile yapildi; /api/auth/me cafe_id dondurur, dashboard
    // dogrudan acilir. Check-In Gateway recovery'sine gerek yok (flake'e duyarli).
    await bootstrapAuthenticatedPage(page, root, session, {
      checkedIn: true,
      userOverride: currentUser,
      skipCheckInRecovery: true,
    });

    // Cold start'ta Vite + backend yavas olabilir; uzun bekleme.
    await expect(page.locator('[data-testid="daily-reward-wheel"]').first()).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator('[data-testid="wheel-spin-button"]').first()).toBeVisible();
  });
});

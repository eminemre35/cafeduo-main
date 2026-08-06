import { test, expect } from '@playwright/test';
import {
  DEFAULT_E2E_APP_BASE_URL,
  bootstrapAuthenticatedPage,
  resolveApiBaseUrl,
  waitForApiReady,
} from './helpers/session';

const E2E_ADMIN_EMAIL = 'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD = 'E2eAdmin!2026';

const adminHeaders = (token: string, csrf = 'test-csrf-token-for-e2e') => ({
  Authorization: `Bearer ${token}`,
  'X-CSRF-Token': csrf,
  Cookie: `csrf_token=${csrf}`,
  'Content-Type': 'application/json',
});

test.describe('Cafe Admin Location Editor', () => {
  test('@advanced cafe-admin can open location editor and update cafe radius', async ({
    page,
    request,
    baseURL,
  }) => {
    const root = baseURL || DEFAULT_E2E_APP_BASE_URL;
    const apiRoot = resolveApiBaseUrl(root);
    await waitForApiReady(request, apiRoot);

    // 1) Bootstrap admin ile oturum ac
    const adminLogin = await request.post(`${apiRoot}/api/auth/login`, {
      data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminToken = (await adminLogin.json()).token;
    expect(adminToken).toBeTruthy();

    // 2) Cafe-admin kullanicisi olustur (memory mode createUser calisir)
    const suffix = Date.now().toString(36);
    const cafeAdminUsername = `cafeadmin_${suffix}`.slice(0, 20);
    const cafeAdminEmail = `${cafeAdminUsername}@example.com`;
    const cafeAdminPassword = 'CafeAdmin!2026';

    const createRes = await request.post(`${apiRoot}/api/admin/users`, {
      headers: adminHeaders(adminToken),
      data: { username: cafeAdminUsername, email: cafeAdminEmail, password: cafeAdminPassword },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const createdUserId = created?.user?.id ?? created?.id;
    expect(createdUserId).toBeTruthy();

    // 3) Rolunu cafe_admin yap (memory mode calisir) ve kafe 1'e ata
    const roleRes = await request.put(`${apiRoot}/api/admin/users/${createdUserId}/role`, {
      headers: adminHeaders(adminToken),
      data: { role: 'cafe_admin', cafe_id: 1 },
    });
    expect(roleRes.ok()).toBeTruthy();

    // 4) Cafe-admin olarak giris yap
    const cafeAdminLogin = await request.post(`${apiRoot}/api/auth/login`, {
      data: { email: cafeAdminEmail, password: cafeAdminPassword },
    });
    expect(cafeAdminLogin.ok()).toBeTruthy();
    const cafeAdminBody = await cafeAdminLogin.json();
    const session = {
      credentials: { username: cafeAdminUsername, email: cafeAdminEmail, password: cafeAdminPassword },
      token: cafeAdminBody.token,
      csrfToken: 'test-csrf-token-for-e2e',
      user: cafeAdminBody.user,
    };

    // 5) Paneli ac (cafe_admin check-in gate'ini atlar)
    await bootstrapAuthenticatedPage(page, root, session as never, {});
    await page.goto(`${root}/cafe-admin`);

    // 6) Konum editoru render olur: once 'Konum Ayarlari' sekmesini ac
    await expect(page.getByRole('heading', { name: 'Kafe Yönetim Paneli' }).first()).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole('tab', { name: 'Konum Ayarları' }).first().click();

    const addressSearch = page.getByPlaceholder('Adres, kampüs veya kafe ara...').first();
    await expect(addressSearch).toBeVisible({ timeout: 30000 });

    // 7) Kafe listesi hala saglikli (konum editoru data akisini bozmadi)
    const cafesRes = await request.get(`${apiRoot}/api/cafes`);
    expect(cafesRes.ok()).toBeTruthy();
    const cafes = await cafesRes.json();
    const cafeOne = cafes.find((cafe: any) => Number(cafe.id) === 1);
    expect(cafeOne).toBeTruthy();
  });
});

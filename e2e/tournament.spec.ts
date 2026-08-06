import { test, expect } from '@playwright/test';
import {
  DEFAULT_E2E_APP_BASE_URL,
  resolveApiBaseUrl,
  waitForApiReady,
} from './helpers/session';

const E2E_ADMIN_EMAIL = 'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD = 'E2eAdmin!2026';

test.describe('Tournament Flow (cafe admin)', () => {
  test('@advanced tournament CRUD lifecycle works in memory mode', async ({ request, baseURL }) => {
    const root = baseURL || DEFAULT_E2E_APP_BASE_URL;
    const apiRoot = resolveApiBaseUrl(root);
    await waitForApiReady(request, apiRoot);

    // 1) Bootstrap admin ile oturum ac
    const adminLogin = await request.post(`${apiRoot}/api/auth/login`, {
      data: { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminBody = await adminLogin.json();
    expect(adminBody.token).toBeTruthy();

    const adminHeaders = {
      Authorization: `Bearer ${adminBody.token}`,
      'X-CSRF-Token': 'test-csrf-token-for-e2e',
      Cookie: 'csrf_token=test-csrf-token-for-e2e',
      'Content-Type': 'application/json',
    };

    // 2) Turnuva olustur (admin body'den cafeId verebilir; scheduled baslar)
    const suffix = Date.now().toString(36);
    const tournamentName = `E2E Turnuvasi ${suffix}`;
    const startAt = new Date(Date.now() + 90_000); // MIN_LEAD (60s) uzeri
    const endAt = new Date(startAt.getTime() + 20 * 60 * 1000); // MIN_WINDOW (15dk) uzeri

    const createRes = await request.post(`${apiRoot}/api/tournaments`, {
      headers: adminHeaders,
      data: {
        name: tournamentName,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        cafeId: 1,
        prize_tiers: [{ rank: 1, reward_id: 9001 }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const createBody = await createRes.json();
    const tournamentId = createBody?.tournament?.id ?? createBody?.id;
    expect(tournamentId).toBeTruthy();
    expect(createBody?.tournament?.status).toBe('scheduled');

    try {
      // 3) Liste API'de gorunur (cafe 1)
      const listRes = await request.get(`${apiRoot}/api/tournaments?cafeId=1`);
      expect(listRes.ok()).toBeTruthy();
      const list = await listRes.json();
      expect(Array.isArray(list)).toBeTruthy();
      const found = list.find((t: any) => Number(t.id) === Number(tournamentId));
      expect(found).toBeTruthy();
      expect(found.name).toBe(tournamentName);

      // 4) Leaderboard bos doner (memory mode'da puan birikmez)
      const boardRes = await request.get(`${apiRoot}/api/tournaments/${tournamentId}/leaderboard`, {
        headers: { Authorization: `Bearer ${adminBody.token}` },
      });
      expect(boardRes.ok()).toBeTruthy();
      const board = await boardRes.json();
      expect(board.tournament.id).toBe(Number(tournamentId));
      expect(board.leaderboard).toEqual([]);
    } finally {
      // 5) Temizlik: scheduled turnuva iptal edilebilir
      const delRes = await request.delete(`${apiRoot}/api/tournaments/${tournamentId}`, {
        headers: adminHeaders,
      });
      expect(delRes.ok()).toBeTruthy();

      // Iptal sonrasi listede gorunmemeli (status cancelled filtrelenir)
      const listAfter = await request.get(`${apiRoot}/api/tournaments?cafeId=1`);
      const after = await listAfter.json();
      expect(after.find((t: any) => Number(t.id) === Number(tournamentId))).toBeFalsy();
    }
  });
});

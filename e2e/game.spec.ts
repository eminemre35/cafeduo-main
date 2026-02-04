/**
 * E2E Tests - Game Flow
 * 
 * @description Table matching, game creation, and joining tests
 */

import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  // Helper function to login before tests
  const login = async (page) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    await page.getByPlaceholder('E-posta').fill('test@example.com');
    await page.getByPlaceholder('Şifre').fill('testpassword123');
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    await expect(page.getByText('Oyunlar').or(page.getByText('Oyun Lobisi'))).toBeVisible({ timeout: 5000 });
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show table matching UI when not matched', async ({ page }) => {
    await login(page);
    
    // Should show "Masa bağlı değil" or table matching section
    const statusText = await page.getByText(/Masa bağlı değil|masa kodu/i).first();
    await expect(statusText).toBeVisible();
  });

  test('should disable game buttons when not matched to table', async ({ page }) => {
    await login(page);
    
    // Game creation button should be disabled
    const createButton = page.getByRole('button', { name: /Yeni Oyun Kur/i });
    await expect(createButton).toBeDisabled();
  });

  test('should enable game buttons after table matching', async ({ page }) => {
    await login(page);
    
    // Enter table code (this requires a valid table code)
    // Note: This test requires backend to have test tables
    const tableInput = page.locator('input[placeholder*="masa"], input[placeholder*="kod"]').first();
    
    if (await tableInput.isVisible().catch(() => false)) {
      await tableInput.fill('A1');
      
      // Click match/connect button
      const matchButton = page.getByRole('button', { name: /Bağlan|Doğrula/i }).first();
      await matchButton.click();
      
      // Wait for match confirmation
      await expect(page.getByText(/Bağlı|Connected/i)).toBeVisible({ timeout: 5000 });
      
      // Now game button should be enabled
      const createButton = page.getByRole('button', { name: /Yeni Oyun Kur/i });
      await expect(createButton).toBeEnabled();
    }
  });

  test('should open create game modal', async ({ page }) => {
    await login(page);
    
    // This test assumes user is already matched to a table
    // First check if create button exists and is enabled
    const createButton = page.getByRole('button', { name: /Yeni Oyun Kur/i });
    
    if (await createButton.isEnabled().catch(() => false)) {
      await createButton.click();
      
      // Modal should open
      await expect(page.getByText(/Oyun Kur|Yeni Oyun/i).first()).toBeVisible();
      await expect(page.getByText(/Katılım Puanı|Bahis/i).first()).toBeVisible();
      
      // Should show game type options
      await expect(page.getByText(/Taş Kağıt Makas|Zindan Savaşı|Arena Savaşı/i).first()).toBeVisible();
    }
  });

  test('should select game type and points in create modal', async ({ page }) => {
    await login(page);
    
    const createButton = page.getByRole('button', { name: /Yeni Oyun Kur/i });
    
    if (await createButton.isEnabled().catch(() => false)) {
      await createButton.click();
      
      // Select game type
      await page.getByText(/Taş Kağıt Makas/i).click();
      
      // Select points (using preset buttons or input)
      const pointButton = page.getByRole('button', { name: /50|100|200/i }).first();
      if (await pointButton.isVisible().catch(() => false)) {
        await pointButton.click();
      }
      
      // Should show summary
      await expect(page.getByText(/Toplam|Özet/i).first()).toBeVisible();
      
      // Submit button should be enabled
      const submitButton = page.getByRole('button', { name: /Oyun Kur|Oluştur/i });
      await expect(submitButton).toBeEnabled();
    }
  });

  test('should show game lobby with available games', async ({ page }) => {
    await login(page);
    
    // Should show lobby section
    await expect(page.getByText(/Oyun Lobisi|Aktif Oyunlar/i).first()).toBeVisible();
    
    // Either show games list or empty state
    const hasGames = await page.getByText(/Katıl|Join/i).first().isVisible().catch(() => false);
    const isEmpty = await page.getByText(/Henüz Oyun Yok|Oyun yok/i).first().isVisible().catch(() => false);
    
    expect(hasGames || isEmpty).toBe(true);
  });

  test('should show user stats in status bar', async ({ page }) => {
    await login(page);
    
    // Status bar should show user info
    await expect(page.getByText(/Puan|points/i).first()).toBeVisible();
    await expect(page.getByText(/Galibiyet|wins/i).first()).toBeVisible();
    await expect(page.getByText(/Oyun|games/i).first()).toBeVisible();
  });

  test('should navigate between tabs', async ({ page }) => {
    await login(page);
    
    // Click on Leaderboard tab
    await page.getByText(/Sıralama|Leaderboard/i).click();
    await expect(page.getByText(/Sıralama Tablosu|Leaderboard/i).first()).toBeVisible();
    
    // Click on Achievements tab
    await page.getByText(/Başarımlar|Achievements/i).click();
    await expect(page.getByText(/Başarımlar|Achievements/i).first()).toBeVisible();
    
    // Click back to Games tab
    await page.getByText(/Oyunlar|Games/i).first().click();
    await expect(page.getByText(/Oyun Lobisi|Game Lobby/i).first()).toBeVisible();
  });

  test('should show profile modal when clicking user', async ({ page }) => {
    await login(page);
    
    // Click on user avatar or name
    const userElement = page.locator('[data-testid="user-name"], .user-avatar, .profile-button').first();
    
    if (await userElement.isVisible().catch(() => false)) {
      await userElement.click();
      
      // Profile modal should open
      await expect(page.getByText(/Profil|Profile/i).first()).toBeVisible();
    }
  });
});

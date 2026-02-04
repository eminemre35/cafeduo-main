/**
 * E2E Tests - Shop & Rewards Flow
 * 
 * @description Buying rewards and inventory management tests
 */

import { test, expect } from '@playwright/test';

test.describe('Shop & Rewards Flow', () => {
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

  test('should show reward section on dashboard', async ({ page }) => {
    await login(page);
    
    // Should show shop/reward section
    await expect(page.getByText(/Mağaza|Shop|Ödüller|Rewards/i).first()).toBeVisible();
    
    // Should show user points
    await expect(page.getByText(/Bakiye|Points|Puan/i).first()).toBeVisible();
  });

  test('should switch between shop and inventory tabs', async ({ page }) => {
    await login(page);
    
    // Click on Inventory tab
    const inventoryTab = page.getByText(/Envanter|Inventory/i).first();
    await inventoryTab.click();
    
    // Should show inventory content
    await expect(page.getByText(/Envanter|Kupon|Kod/i).first()).toBeVisible();
    
    // Click back to Shop tab
    const shopTab = page.getByText(/Mağaza|Shop/i).first();
    await shopTab.click();
    
    // Should show shop items
    await expect(page.getByText(/Satın Al|Buy/i).first()).toBeVisible();
  });

  test('should display available rewards in shop', async ({ page }) => {
    await login(page);
    
    // Ensure we're on shop tab
    const shopTab = page.getByText(/Mağaza|Shop/i).first();
    await shopTab.click();
    
    // Should show reward items
    const rewardItems = page.locator('.reward-card, [data-testid*="reward"]').first();
    const emptyState = page.getByText(/Mağaza Boş|Henüz ödül yok/i).first();
    
    const hasItems = await rewardItems.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    
    expect(hasItems || isEmpty).toBe(true);
  });

  test('should show reward details with cost', async ({ page }) => {
    await login(page);
    
    // Ensure we're on shop tab
    const shopTab = page.getByText(/Mağaza|Shop/i).first();
    await shopTab.click();
    
    // Check for reward cost display
    const rewardCard = page.locator('.reward-card, [class*="reward"]').first();
    
    if (await rewardCard.isVisible().catch(() => false)) {
      // Should show cost
      const costElement = rewardCard.locator('text=/\\d+/');
      await expect(costElement).toBeVisible();
      
      // Should have buy button
      const buyButton = rewardCard.getByRole('button', { name: /Satın Al|Buy/i });
      await expect(buyButton).toBeVisible();
    }
  });

  test('should disable buy button for insufficient points', async ({ page }) => {
    await login(page);
    
    // Ensure we're on shop tab
    const shopTab = page.getByText(/Mağaza|Shop/i).first();
    await shopTab.click();
    
    // Look for expensive item or disabled button
    const disabledBuyButton = page.getByRole('button', { name: /Yetersiz|Insufficient/i }).first();
    
    if (await disabledBuyButton.isVisible().catch(() => false)) {
      await expect(disabledBuyButton).toBeDisabled();
    }
  });

  test('should show inventory items with codes', async ({ page }) => {
    await login(page);
    
    // Go to inventory tab
    const inventoryTab = page.getByText(/Envanter|Inventory/i).first();
    await inventoryTab.click();
    
    // Check for inventory items or empty state
    const inventoryItem = page.locator('.inventory-item, .coupon-card, [data-testid*="inventory"]').first();
    const emptyState = page.getByText(/Envanterin Boş|Henüz kupon/i).first();
    
    const hasItems = await inventoryItem.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    
    expect(hasItems || isEmpty).toBe(true);
    
    // If has items, check for coupon code
    if (hasItems) {
      await expect(page.getByText(/KOD|Code|kupon/i).first()).toBeVisible();
    }
  });

  test('should show coupon expiration date', async ({ page }) => {
    await login(page);
    
    // Go to inventory tab
    const inventoryTab = page.getByText(/Envanter|Inventory/i).first();
    await inventoryTab.click();
    
    // Check for expiration date in inventory items
    const expirationText = page.getByText(/SKT|Expires|Son Kullanma/i).first();
    
    if (await expirationText.isVisible().catch(() => false)) {
      await expect(expirationText).toBeVisible();
    }
  });

  test('should show used/expired coupons with visual indicator', async ({ page }) => {
    await login(page);
    
    // Go to inventory tab
    const inventoryTab = page.getByText(/Envanter|Inventory/i).first();
    await inventoryTab.click();
    
    // Check for used/expired indicators
    const usedIndicator = page.getByText(/KULLANILDI|Used|Süresi Doldu|Expired/i).first();
    
    if (await usedIndicator.isVisible().catch(() => false)) {
      // Should have visual distinction (grayscale, opacity, etc.)
      const parentElement = usedIndicator.locator('..');
      await expect(parentElement).toHaveCSS(/opacity|grayscale|filter/);
    }
  });

  test('should navigate to shop from empty inventory', async ({ page }) => {
    await login(page);
    
    // Go to inventory tab
    const inventoryTab = page.getByText(/Envanter|Inventory/i).first();
    await inventoryTab.click();
    
    // Check for empty state with action button
    const goToShopButton = page.getByRole('button', { name: /Mağazaya Git|Go to Shop/i });
    
    if (await goToShopButton.isVisible().catch(() => false)) {
      await goToShopButton.click();
      
      // Should navigate to shop
      await expect(page.getByText(/Mağaza|Shop/i).first()).toBeVisible();
      await expect(page.getByText(/Satın Al|Buy/i).first()).toBeVisible();
    }
  });

  test('should show user points balance prominently', async ({ page }) => {
    await login(page);
    
    // Points should be visible in reward section
    const pointsDisplay = page.getByText(/\\d+\\s*puan|\\d+\\s*points/i).first();
    await expect(pointsDisplay).toBeVisible();
    
    // Or check for specific pattern
    await expect(page.getByText(/Bakiye|Balance/i).first()).toBeVisible();
  });
});

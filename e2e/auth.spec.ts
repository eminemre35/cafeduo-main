/**
 * E2E Tests - Authentication Flow
 * 
 * @description Login, logout, and auth protection tests
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show login modal when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/');
    
    // Should show the landing page with login button
    await expect(page.getByText('CafeDuo')).toBeVisible();
    await expect(page.getByText('Giriş Yap')).toBeVisible();
  });

  test('should open login modal when clicking login button', async ({ page }) => {
    await page.goto('/');
    
    // Click login button
    await page.getByText('Giriş Yap').click();
    
    // Login modal should appear
    await expect(page.getByPlaceholder('E-posta')).toBeVisible();
    await expect(page.getByPlaceholder('Şifre')).toBeVisible();
    await expect(page.getByRole('button', { name: /Giriş Yap/i })).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    // Enter invalid email
    await page.getByPlaceholder('E-posta').fill('invalid-email');
    await page.getByPlaceholder('Şifre').fill('password123');
    
    // Try to submit
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/Geçerli bir e-posta adresi girin/i)).toBeVisible();
  });

  test('should show validation errors for short password', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    // Enter valid email but short password
    await page.getByPlaceholder('E-posta').fill('test@example.com');
    await page.getByPlaceholder('Şifre').fill('123');
    
    // Try to submit
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    // Should show validation error
    await expect(page.getByText(/Şifre en az 6 karakter olmalı/i)).toBeVisible();
  });

  test('should toggle between login and register modes', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    // Initially in login mode
    await expect(page.getByRole('button', { name: /Giriş Yap/i })).toBeVisible();
    
    // Switch to register
    await page.getByText('Hesap oluştur').click();
    
    // Should show register form
    await expect(page.getByPlaceholder('Kullanıcı adı')).toBeVisible();
    await expect(page.getByPlaceholder('Bölüm')).toBeVisible();
    await expect(page.getByRole('button', { name: /Kayıt Ol/i })).toBeVisible();
    
    // Switch back to login
    await page.getByText('Giriş yap').click();
    
    // Should show login form again
    await expect(page.getByPlaceholder('E-posta')).toBeVisible();
    await expect(page.getByRole('button', { name: /Giriş Yap/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    // Enter non-existent credentials
    await page.getByPlaceholder('E-posta').fill('nonexistent@example.com');
    await page.getByPlaceholder('Şifre').fill('wrongpassword123');
    
    // Submit
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    // Wait for error toast/alert
    await expect(page.getByText(/Giriş başarısız/i).or(page.getByText(/Hatalı/i))).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    // Note: This requires a test user to exist in the database
    // Replace with actual test credentials
    await page.getByPlaceholder('E-posta').fill('test@example.com');
    await page.getByPlaceholder('Şifre').fill('testpassword123');
    
    // Submit
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    // Should redirect to dashboard or show dashboard elements
    await expect(page.getByText('Oyunlar').or(page.getByText('Oyun Lobisi'))).toBeVisible({ timeout: 5000 });
    
    // Verify token is stored
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('should persist login after page refresh', async ({ page }) => {
    // First login
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    await page.getByPlaceholder('E-posta').fill('test@example.com');
    await page.getByPlaceholder('Şifre').fill('testpassword123');
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    // Wait for dashboard
    await expect(page.getByText('Oyunlar').or(page.getByText('Oyun Lobisi'))).toBeVisible({ timeout: 5000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.getByText('Oyunlar').or(page.getByText('Oyun Lobisi'))).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.getByText('Giriş Yap').click();
    
    await page.getByPlaceholder('E-posta').fill('test@example.com');
    await page.getByPlaceholder('Şifre').fill('testpassword123');
    await page.getByRole('button', { name: /Giriş Yap/i }).click();
    
    await expect(page.getByText('Oyunlar').or(page.getByText('Oyun Lobisi'))).toBeVisible({ timeout: 5000 });
    
    // Click logout
    await page.getByText('Çıkış Yap').click();
    
    // Should be back to landing page
    await expect(page.getByText('CafeDuo')).toBeVisible();
    await expect(page.getByText('Giriş Yap')).toBeVisible();
    
    // Verify token is removed
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});

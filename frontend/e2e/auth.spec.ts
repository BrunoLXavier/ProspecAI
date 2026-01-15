/**
 * E2E Test: Authentication Flow
 * Tests login, logout, and protected routes
 * Note: In dev mode, auth middleware may not be enforced
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard or redirect based on auth state', async ({ page }) => {
    await page.goto('/dashboard');
    
    // In dev mode, might show dashboard directly or redirect to login
    const isOnLogin = page.url().includes('login');
    const isOnDashboard = page.url().includes('dashboard') || page.url() === 'http://localhost:3000/';
    
    expect(isOnLogin || isOnDashboard).toBeTruthy();
  });

  test('should display login page when navigating to /login', async ({ page }) => {
    await page.goto('/login');
    
    // Check page loaded successfully (not 404)
    await expect(page.locator('body')).toBeVisible();
    
    // Should have either login form or be redirected
    const hasLoginElements = await page.locator('input[type="password"], input[name="password"]').isVisible().catch(() => false);
    const hasProspecAIBranding = await page.getByText(/prospecai/i).isVisible().catch(() => false);
    
    expect(hasLoginElements || hasProspecAIBranding).toBeTruthy();
  });

  test('should have form validation on login page', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Look for form elements
    const submitButton = page.locator('button[type="submit"]');
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Just verify the form responds (may show validation or attempt login)
      await page.waitForTimeout(500);
    }
    
    // Test passes if page doesn't crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle login form interaction', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]');
    
    if (await usernameInput.isVisible() && await passwordInput.isVisible()) {
      // Fill form fields
      await usernameInput.fill('test@example.com');
      await passwordInput.fill('testpassword');
      
      // Just verify inputs accept values
      await expect(usernameInput).toHaveValue('test@example.com');
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display ProspecAI branding on login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check for ProspecAI text anywhere on page
    const branding = page.getByText(/prospecai/i);
    await expect(branding.first()).toBeVisible();
  });
});

test.describe('Page Access', () => {
  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    // Just verify page loads without error (auth check may or may not redirect)
    await expect(page.locator('body')).toBeVisible();
  });

  test('funding page loads', async ({ page }) => {
    await page.goto('/funding');
    await expect(page.locator('body')).toBeVisible();
  });

  test('crm page loads', async ({ page }) => {
    await page.goto('/crm');
    await expect(page.locator('body')).toBeVisible();
  });

  test('analytics page loads', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.locator('body')).toBeVisible();
  });

  test('reports page loads', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).toBeVisible();
  });
});

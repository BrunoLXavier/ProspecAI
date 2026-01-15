import { test, expect } from '@playwright/test';

test.describe('Login (Firefox)', () => {
  test('fills login form and verifies redirect away from /login', async ({ page }) => {
    const observed: Array<{ method: string; url: string; status?: number }> = [];

    page.on('request', (req) => {
      observed.push({ method: req.method(), url: req.url() });
    });

    page.on('response', (res) => {
      const idx = observed.findIndex((o) => o.url === res.url() && o.method === res.request().method());
      if (idx >= 0) observed[idx].status = res.status();
      else observed.push({ method: res.request().method(), url: res.url(), status: res.status() });
    });

    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const username = page.locator('input[name="email"], input[type="email"], input[name="username"], input[type="text"]').first();
    const password = page.locator('input[type="password"]');
    const submit = page.getByRole('button', { name: /entrar/i });

    // If form is present, attempt to fill and submit
    if (await username.isVisible().catch(() => false) && await password.isVisible().catch(() => false) && await submit.isVisible().catch(() => false)) {
      await username.fill(process.env.E2E_USER || 'admin@prospecai.com');
      await password.fill(process.env.E2E_PASS || 'Admin@123');

      // Wait until submit becomes enabled (AuthContext may be loading on mount)
      await expect(submit).toBeVisible();
      // Log submit outerHTML and disabled state to help debug
      const submitInfo = await submit.evaluate((el) => ({ outerHTML: el.outerHTML, disabled: (el as HTMLButtonElement).disabled }));
      console.log('Submit element info:', JSON.stringify(submitInfo));
      await expect(submit).toBeEnabled({ timeout: 5000 });

      // Click and wait for login POST response
      const [loginResponse] = await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/v1/auth/login') && res.status() === 200, { timeout: 10000 }).catch(() => null),
        submit.click(),
      ]);

      // Ensure login POST returned 200
      expect(!!loginResponse).toBeTruthy();

      // Wait for access token to be stored in localStorage
      await page.waitForFunction(() => !!localStorage.getItem('prospecai_access_token'), null, { timeout: 5000 });

      // Wait for dashboard heading to appear (dashboard loads after successful login)
      const dashboardHeading = page.getByRole('heading', { name: /dashboard/i });
      await expect(dashboardHeading).toBeVisible({ timeout: 5000 });
    }

    // Dump observed network, console and page errors for debugging
    console.log('Observed network calls:', JSON.stringify(observed.slice(0, 50), null, 2));
    console.log('Console messages:', JSON.stringify(consoleMessages.slice(0, 50), null, 2));
    console.log('Page errors:', JSON.stringify(pageErrors.slice(0, 50), null, 2));

    // Assert we are not stuck on /login (allow either dashboard or root)
    const currentUrl = page.url();
    expect(currentUrl.includes('/login')).toBeFalsy();
  });
});

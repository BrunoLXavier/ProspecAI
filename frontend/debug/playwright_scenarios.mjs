import { chromium } from 'playwright';

async function runScenario(name, storageItems = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[${name} - PAGE]`, msg.type(), msg.text()));
  page.on('response', r => console.log(`[${name} - RESP]`, r.status(), r.url()));

  // Set localStorage before navigation
  await page.addInitScript((items) => {
    for (const [k, v] of Object.entries(items)) {
      localStorage.setItem(k, v);
    }
  }, storageItems);

  console.log(`[${name}] Navigating to /login`);
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(`[${name}] Current path:`, await page.evaluate(() => location.pathname));

  await browser.close();
}

(async () => {
  // Scenario 1: No auth
  await runScenario('no-auth', {});

  // Scenario 2: refresh token only
  await runScenario('refresh-only', { prospecai_refresh_token: 'fake-refresh-token' });

  // Scenario 3: access token + user (authenticated)
  const fakeUser = JSON.stringify({ id: '1', email: 'admin@prospecai.com', username: 'admin', roles: ['admin'], emailVerified: true });
  await runScenario('auth', {
    prospecai_access_token: 'fake-access-token',
    prospecai_refresh_token: 'fake-refresh-token',
    prospecai_expires_at: (Date.now() + 3600000).toString(),
    prospecai_user: fakeUser,
  });

  // Scenario 4: expired token with refresh
  await runScenario('expired-with-refresh', {
    prospecai_access_token: 'expired-token',
    prospecai_refresh_token: 'fake-refresh-token',
    prospecai_expires_at: (Date.now() - 10000).toString(),
    prospecai_user: fakeUser,
  });
})();

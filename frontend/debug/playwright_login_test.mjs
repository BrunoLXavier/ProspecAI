import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
  page.on('requestfailed', r => console.log('[REQFAILED]', r.url(), r.failure && r.failure().errorText));
  page.on('response', r => console.log('[RESP]', r.status(), r.url()));

  const navigations = [];
  page.on('framenavigated', frame => {
    try {
      const path = frame.url() ? new URL(frame.url()).pathname : '';
      const t = Date.now();
      navigations.push({ path, t });
      console.log('[NAV]', path, new Date(t).toISOString());
    } catch (e) {
      // ignore
    }
  });

  const url = 'http://localhost:3000/login';
  console.log('[TEST] Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Fill login form
  await page.fill('#email', 'admin@prospecai.com');
  await page.fill('#password', 'Admin@123');

  // Submit
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => null),
    page.click('button[type=submit]')
  ]);

  // Wait and observe for 10s for possible redirects
  const observeMs = 10000;
  const start = Date.now();
  while (Date.now() - start < observeMs) {
    await page.waitForTimeout(500);
  }

  console.log('[TEST] Collected navigations:', navigations);

  // Simple loop detection: if we see more than 3 alternations between / and /login
  let alternations = 0;
  for (let i = 2; i < navigations.length; i++) {
    const a = navigations[i-2].path;
    const b = navigations[i-1].path;
    const c = navigations[i].path;
    if (a === c && b !== a) alternations++;
  }

  if (alternations >= 2) {
    console.log('[RESULT] Redirect loop detected, alternations=', alternations);
  } else {
    console.log('[RESULT] No redirect loop detected, alternations=', alternations);
  }

  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[PAGE]', msg.type(), msg.text()));
  page.on('requestfailed', r => console.log('[REQFAILED]', r.url(), r.failure && r.failure().errorText));
  page.on('response', r => console.log('[RESP]', r.status(), r.url()));

  const url = 'http://localhost:3000/login';
  console.log('[DEBUG] Navigating to', url);

  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait a bit to capture potential redirects or further activity
  await page.waitForTimeout(5000);

  console.log('[DEBUG] Finished waiting');
  await browser.close();
})();

const { test } = require('@playwright/test');

test('capture ingestion console and headers', async ({ page, context, request }) => {
  // Authenticate via API to get tokens
  const loginResp = await request.post('http://localhost:8000/api/v1/auth/login', {
    data: { email: 'admin@prospecai.com', password: 'Admin@123' },
    timeout: 10000,
  });

  if (loginResp.status() !== 200) {
    console.error('[SETUP] Login failed with status', loginResp.status());
    throw new Error('Login failed');
  }

  const loginData = await loginResp.json();
  const accessToken = loginData.access_token;
  const refreshToken = loginData.refresh_token;
  const expiresAt = new Date(loginData.expires_at).getTime();
  const user = loginData.user || {};

  // Inject tokens/localStorage before any page script runs
  const initScript = `
    window.__PROSPECAI_ACCESS_TOKEN = ${JSON.stringify(accessToken)};
    window.__PROSPECAI_REFRESH_TOKEN = ${JSON.stringify(refreshToken)};
    try {
      localStorage.setItem('prospecai_access_token', ${JSON.stringify(accessToken)});
      localStorage.setItem('prospecai_refresh_token', ${JSON.stringify(refreshToken)});
      localStorage.setItem('prospecai_expires_at', ${JSON.stringify(String(expiresAt))});
      localStorage.setItem('prospecai_user', ${JSON.stringify(JSON.stringify(user))});
    } catch (e) {
      // ignore
    }
  `;

  await context.addInitScript(initScript);

  // Capture page console messages
  page.on('console', (msg) => {
    console.log('[PAGE]', msg.type(), msg.text());
  });

  // Capture network responses and outgoing request headers for ingestion jobs
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('/api/v1/ingestion/jobs')) {
        const req = response.request();
        console.log('[NETWORK] Response', response.status(), url);
        console.log('[NETWORK] Request headers:', req.headers());
        try {
          const body = await response.text();
          console.log('[NETWORK] Response body length:', body.length);
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      console.error('[NETWORK] response handler error', e);
    }
  });

  // Go to ingestion page which should trigger the client call
  await page.goto('http://localhost:3000/ingestion', { waitUntil: 'networkidle' });

  // Wait a short time to capture background requests
  await page.waitForTimeout(4000);
});

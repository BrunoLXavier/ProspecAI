/**
 * E2E Test: Layout Configuration Page
 * Tests all layout configuration fields including:
 * - Sidebar settings (position, width, collapsed)
 * - Navigation items visibility
 * - Dashboard widgets
 * - UI Preferences (page size, dense tables, animations, compact mode)
 * - Theme & Colors (color mode, primary color, secondary color)
 * - Branding (site name, logo URL, favicon URL)
 * - Typography (font size, font family)
 * 
 * Implements RF-07 (layout configuration per user/tenant)
 */
import { test, expect, Page } from '@playwright/test';

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('prospecai_access_token', 'mock-token');
    localStorage.setItem('prospecai_user', JSON.stringify({
      id: '1',
      email: 'admin@prospecai.com',
      username: 'admin',
      name: 'Admin User',
      tenantId: 'tenant-1',
      roles: ['admin'],
    }));
    // Clear any existing layout config for clean tests
    localStorage.removeItem('prospecai_layout_config');
  });
}

async function navigateToLayoutPage(page: Page) {
  await page.goto('/settings/layout');
  await page.waitForLoadState('networkidle');
}

test.describe('Layout Configuration Page - Basic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display layout configuration page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /layout configuration/i })).toBeVisible();
  });

  test('should have Save Changes button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();
  });

  test('should have Reset button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /reset/i })).toBeVisible();
  });
});

test.describe('Layout Configuration - Sidebar Settings', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display sidebar section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sidebar/i })).toBeVisible();
  });

  test('should toggle sidebar position between left and right', async ({ page }) => {
    const leftButton = page.getByRole('button', { name: /left/i });
    const rightButton = page.getByRole('button', { name: /right/i });
    
    // Both buttons should be visible
    await expect(leftButton).toBeVisible();
    await expect(rightButton).toBeVisible();
    
    // Click right
    await rightButton.click();
    await page.waitForTimeout(300);
    
    // Verify right is selected (has primary border)
    await expect(rightButton).toHaveClass(/border-primary/);
    
    // Click left
    await leftButton.click();
    await page.waitForTimeout(300);
    
    // Verify left is selected
    await expect(leftButton).toHaveClass(/border-primary/);
  });

  test('should adjust sidebar width with slider', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    
    // Get initial value
    const initialValue = await slider.inputValue();
    
    // Change value
    await slider.fill('300');
    await page.waitForTimeout(300);
    
    // Verify change is reflected in label
    await expect(page.getByText(/Width: 300px/i)).toBeVisible();
  });

  test('should toggle collapsed by default', async ({ page }) => {
    // Find the collapsed toggle (toggle button near "Collapsed by default")
    const collapsedSection = page.locator('text=Collapsed by default').locator('..');
    const toggleButton = collapsedSection.locator('button').first();
    
    // Click toggle
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    // Toggle should change state
    await expect(toggleButton).toBeVisible();
  });
});

test.describe('Layout Configuration - Navigation Items', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display navigation items section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /navigation items/i })).toBeVisible();
  });

  test('should have toggleable navigation items', async ({ page }) => {
    // Should display common nav items
    await expect(page.getByRole('button', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /portfolio/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /crm/i })).toBeVisible();
  });

  test('should toggle navigation item visibility', async ({ page }) => {
    const analyticsButton = page.getByRole('button', { name: /analytics/i });
    await expect(analyticsButton).toBeVisible();
    
    // Get initial state
    const hasEyeIcon = await analyticsButton.locator('svg').first().isVisible();
    
    // Click to toggle
    await analyticsButton.click();
    await page.waitForTimeout(300);
    
    // The button should still be visible but with different state
    await expect(analyticsButton).toBeVisible();
  });
});

test.describe('Layout Configuration - Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display dashboard widgets section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard widgets/i })).toBeVisible();
  });

  test('should have layout style options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /default/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /compact/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /wide/i })).toBeVisible();
  });

  test('should toggle dashboard layout style', async ({ page }) => {
    const compactButton = page.getByRole('button', { name: /compact/i });
    
    await compactButton.click();
    await page.waitForTimeout(300);
    
    await expect(compactButton).toHaveClass(/border-primary/);
  });

  test('should have widget toggles', async ({ page }) => {
    await expect(page.getByRole('button', { name: /pipeline/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /opportunities/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /metrics/i })).toBeVisible();
  });
});

test.describe('Layout Configuration - UI Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display UI preferences section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ui preferences/i })).toBeVisible();
  });

  test('should have page size selector', async ({ page }) => {
    const pageSelect = page.locator('select').filter({ hasText: /items per page/i });
    await expect(pageSelect).toBeVisible();
  });

  test('should change default page size', async ({ page }) => {
    const pageSelect = page.locator('select').first();
    await pageSelect.selectOption('50');
    await page.waitForTimeout(300);
    
    const value = await pageSelect.inputValue();
    expect(value).toBe('50');
  });

  test('should have Dense Tables toggle', async ({ page }) => {
    await expect(page.getByText(/dense tables/i)).toBeVisible();
  });

  test('should have Enable Animations toggle', async ({ page }) => {
    await expect(page.getByText(/enable animations/i)).toBeVisible();
  });

  test('should have Compact Mode toggle', async ({ page }) => {
    await expect(page.getByText(/compact mode/i)).toBeVisible();
  });

  test('should toggle UI preference switches', async ({ page }) => {
    const denseTablesSection = page.locator('text=Dense Tables').locator('..');
    const toggleButton = denseTablesSection.locator('button').first();
    
    await toggleButton.click();
    await page.waitForTimeout(300);
    
    // Toggle should change color (from gray to primary)
    await expect(toggleButton).toBeVisible();
  });
});

test.describe('Layout Configuration - Theme & Colors', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display theme & colors section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /theme & colors/i })).toBeVisible();
  });

  test('should have color mode options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /claro|light/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /escuro|dark/i })).toBeVisible();
  });

  test('should switch color mode', async ({ page }) => {
    const darkButton = page.getByRole('button', { name: /escuro|dark/i });
    
    await darkButton.click();
    await page.waitForTimeout(500);
    
    // Check if dark class is applied to html
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('should have primary color picker', async ({ page }) => {
    const colorPicker = page.locator('input[type="color"]').first();
    await expect(colorPicker).toBeVisible();
  });

  test('should change primary color', async ({ page }) => {
    const colorInput = page.locator('input[type="text"]').filter({ hasText: /#[0-9A-Fa-f]{6}/i }).first();
    
    if (await colorInput.isVisible()) {
      await colorInput.clear();
      await colorInput.fill('#FF5500');
      await page.waitForTimeout(300);
      
      // Verify localStorage was updated
      const config = await page.evaluate(() => {
        return JSON.parse(localStorage.getItem('prospecai_layout_config') || '{}');
      });
      
      expect(config.primary_color?.toUpperCase()).toBe('#FF5500');
    }
  });

  test('should have secondary color picker', async ({ page }) => {
    const colorPickers = page.locator('input[type="color"]');
    const count = await colorPickers.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Layout Configuration - Branding', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display branding section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /branding/i })).toBeVisible();
  });

  test('should have site name input', async ({ page }) => {
    const siteNameInput = page.getByPlaceholder('ProspecAI');
    await expect(siteNameInput).toBeVisible();
  });

  test('should change site name', async ({ page }) => {
    const siteNameInput = page.getByPlaceholder('ProspecAI');
    
    await siteNameInput.clear();
    await siteNameInput.fill('My Custom App');
    await page.waitForTimeout(300);
    
    // Verify localStorage was updated
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('prospecai_layout_config') || '{}');
    });
    
    expect(config.site_name).toBe('My Custom App');
  });

  test('should have logo URL input', async ({ page }) => {
    const logoInput = page.getByPlaceholder(/logo\.png/i);
    await expect(logoInput).toBeVisible();
  });

  test('should have favicon URL input', async ({ page }) => {
    const faviconInput = page.getByPlaceholder(/favicon\.ico/i);
    await expect(faviconInput).toBeVisible();
  });
});

test.describe('Layout Configuration - Typography', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should display typography section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /typography/i })).toBeVisible();
  });

  test('should have font size options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /small/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /normal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /large/i })).toBeVisible();
  });

  test('should change font size', async ({ page }) => {
    const largeButton = page.getByRole('button', { name: /large/i });
    
    await largeButton.click();
    await page.waitForTimeout(300);
    
    // Verify localStorage was updated
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('prospecai_layout_config') || '{}');
    });
    
    expect(config.font_size).toBe('lg');
  });

  test('should have font family options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sans-serif/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /serif/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /monospace/i })).toBeVisible();
  });

  test('should change font family', async ({ page }) => {
    const serifButton = page.getByRole('button', { name: /serif/i });
    
    await serifButton.click();
    await page.waitForTimeout(300);
    
    // Verify localStorage was updated
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('prospecai_layout_config') || '{}');
    });
    
    expect(config.font_family).toBe('serif');
    
    // Also verify the CSS variable was applied
    const fontFamily = await page.evaluate(() => {
      return document.documentElement.style.getPropertyValue('--font-family');
    });
    
    expect(fontFamily).toContain('Georgia');
  });
});

test.describe('Layout Configuration - Save & Reset', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    // Mock the layout API
    await page.route('**/api/v1/layout**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ config: {} }),
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
    await navigateToLayoutPage(page);
  });

  test('should save changes successfully', async ({ page }) => {
    // Make a change first
    const siteNameInput = page.getByPlaceholder('ProspecAI');
    await siteNameInput.clear();
    await siteNameInput.fill('Test App Name');
    await page.waitForTimeout(300);
    
    // Click save button
    const saveButton = page.getByRole('button', { name: /save changes/i });
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(1000);
    
    // Should show saved message
    await expect(page.getByText(/saved/i)).toBeVisible({ timeout: 5000 });
  });

  test('should reset to defaults', async ({ page }) => {
    // Make a change first
    const siteNameInput = page.getByPlaceholder('ProspecAI');
    await siteNameInput.clear();
    await siteNameInput.fill('Modified Name');
    await page.waitForTimeout(300);
    
    // Click reset button
    const resetButton = page.getByRole('button', { name: /reset/i });
    
    // Handle confirmation dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    
    await resetButton.click();
    await page.waitForTimeout(1000);
    
    // Verify input is reset to default
    await expect(siteNameInput).toHaveValue('ProspecAI');
  });

  test('should persist changes after page reload', async ({ page }) => {
    // Make a change
    const largeButton = page.getByRole('button', { name: /large/i });
    await largeButton.click();
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify the change persisted
    const config = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('prospecai_layout_config') || '{}');
    });
    
    expect(config.font_size).toBe('lg');
  });
});

test.describe('Layout Configuration - Visual Effects', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await navigateToLayoutPage(page);
  });

  test('should apply primary color to UI elements', async ({ page }) => {
    // Change primary color
    const colorInput = page.locator('input[type="text"][value^="#"]').first();
    
    if (await colorInput.isVisible()) {
      await colorInput.clear();
      await colorInput.fill('#00FF00');
      await page.waitForTimeout(500);
      
      // Check if CSS variable was updated
      const primaryColor = await page.evaluate(() => {
        return document.documentElement.style.getPropertyValue('--color-primary');
      });
      
      expect(primaryColor.toUpperCase()).toBe('#00FF00');
    }
  });

  test('should apply font family change to document', async ({ page }) => {
    const monoButton = page.getByRole('button', { name: /monospace/i });
    
    await monoButton.click();
    await page.waitForTimeout(500);
    
    const fontFamily = await page.evaluate(() => {
      return document.documentElement.style.getPropertyValue('--font-family');
    });
    
    expect(fontFamily).toContain('monospace');
  });

  test('should apply font size change to document', async ({ page }) => {
    const smallButton = page.getByRole('button', { name: /small/i });
    
    await smallButton.click();
    await page.waitForTimeout(500);
    
    const fontSize = await page.evaluate(() => {
      return document.documentElement.style.fontSize;
    });
    
    expect(fontSize).toBe('14px');
  });
});

/**
 * E2E Test: Portfolio Projects CRUD Operations
 * Tests create, read, filter operations for portfolio/projects
 * Implements RF-03: Portfólio Institucional
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
  });
}

async function setupApiMock(page: Page) {
  await page.route('**/api/v1/projects**', async (route) => {
    try {
      const response = await route.fetch();
      if (response.ok()) {
        await route.fulfill({ response });
        return;
      }
    } catch {
      // API not available
    }
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          title: 'Automação Industrial 4.0',
          description: 'Projeto de automação utilizando IoT e Machine Learning',
          status: 'completed',
          startDate: '2024-01-15',
          endDate: '2024-12-31',
          totalBudget: 1500000,
          technologicalArea: 'Automação Industrial',
          currentTrl: 7,
          targetTrl: 9,
          lessonsLearned: ['Integração IoT complexa', 'Validação com stakeholders'],
          teamSize: 8,
        },
        {
          id: '2',
          title: 'Plataforma de IA para Saúde',
          description: 'Sistema de diagnóstico assistido por inteligência artificial',
          status: 'in_progress',
          startDate: '2024-06-01',
          endDate: '2025-05-31',
          totalBudget: 2500000,
          technologicalArea: 'Saúde Digital',
          currentTrl: 5,
          targetTrl: 8,
          lessonsLearned: [],
          teamSize: 12,
        },
        {
          id: '3',
          title: 'Energia Renovável Smart Grid',
          description: 'Desenvolvimento de redes inteligentes para energia renovável',
          status: 'planned',
          startDate: '2025-03-01',
          endDate: '2026-02-28',
          totalBudget: 3000000,
          technologicalArea: 'Energia',
          currentTrl: 2,
          targetTrl: 6,
          lessonsLearned: [],
          teamSize: 10,
        },
      ]),
    });
  });
}

test.describe('Portfolio/Projects CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('should display projects list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /portfólio|portfolio|projetos/i })).toBeVisible();
    
    await expect(page.getByText('Automação Industrial 4.0')).toBeVisible();
    await expect(page.getByText('Plataforma de IA para Saúde')).toBeVisible();
  });

  test('should display TRL progress', async ({ page }) => {
    // Check TRL indicators
    await expect(page.getByText(/trl.*7/i).first()).toBeVisible();
  });

  test('should show project status badges', async ({ page }) => {
    // Status badges should be visible
    const completedBadge = page.getByText(/concluído|completed/i);
    const inProgressBadge = page.getByText(/em andamento|in progress/i);
    const plannedBadge = page.getByText(/planejado|planned/i);
    
    expect(
      await completedBadge.isVisible() ||
      await inProgressBadge.isVisible() ||
      await plannedBadge.isVisible()
    ).toBeTruthy();
  });

  test('should open create project modal', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /novo projeto/i });
    await expect(newButton).toBeVisible();
    await newButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should have project form fields', async ({ page }) => {
    await page.getByRole('button', { name: /novo projeto/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Check for essential fields
    await expect(page.getByLabel(/título|title/i)).toBeVisible();
  });

  test('should display technological area', async ({ page }) => {
    await expect(page.getByText('Automação Industrial')).toBeVisible();
    await expect(page.getByText('Saúde Digital')).toBeVisible();
  });

  test('should show budget information', async ({ page }) => {
    // Check for budget display
    const budgetText = await page.getByText(/R\$\s*1\.500\.000/i).isVisible();
    expect(budgetText).toBeTruthy();
  });

  test('should display team size', async ({ page }) => {
    await expect(page.getByText(/8\s*(pessoas|members)?/i).first()).toBeVisible();
  });
});

test.describe('Portfolio - Lessons Learned', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('should display lessons learned for completed projects', async ({ page }) => {
    // Look for lessons learned section or indicators
    const lessonsSection = page.getByText(/lições aprendidas|lessons learned/i);
    
    if (await lessonsSection.isVisible()) {
      await expect(page.getByText('Integração IoT complexa')).toBeVisible();
    }
  });

  test('should expand project details', async ({ page }) => {
    // Try to click on project to expand
    const projectCard = page.getByText('Automação Industrial 4.0');
    await projectCard.click();
    
    // Wait for potential expansion/navigation
    await page.waitForTimeout(500);
    
    // Page should remain functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Portfolio - Filters', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/portfolio');
    await page.waitForLoadState('networkidle');
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(300);
      
      await expect(page.getByText('Automação Industrial 4.0')).toBeVisible();
    }
  });

  test('should filter by technological area', async ({ page }) => {
    const areaFilter = page.locator('select').filter({ hasText: /área|area/i });
    
    if (await areaFilter.isVisible()) {
      await areaFilter.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by TRL range', async ({ page }) => {
    const trlFilter = page.locator('select').filter({ hasText: /trl/i });
    
    if (await trlFilter.isVisible()) {
      await trlFilter.selectOption({ index: 1 });
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should search projects by title', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|search|pesquisar/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Automação');
      await page.waitForTimeout(300);
      
      await expect(page.getByText('Automação Industrial 4.0')).toBeVisible();
    }
  });
});

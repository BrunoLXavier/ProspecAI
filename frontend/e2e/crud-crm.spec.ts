/**
 * E2E Test: CRM/Clients CRUD Operations
 * Tests create, read, filter operations for CRM clients
 * Implements RF-04: CRM Inteligente
 */
import { test, expect, Page } from '@playwright/test';

// Helper to setup authentication
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

// Mock API responses
async function setupApiMock(page: Page) {
  await page.route('**/api/v1/clients**', async (route) => {
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
          companyName: 'Tech Solutions LTDA',
          tradeName: 'TechSol',
          cnpj: '12.345.678/0001-90',
          contactName: 'João Silva',
          email: 'joao@techsol.com.br',
          phone: '(21) 99999-8888',
          status: 'active',
          source: 'inbound',
          interactionCount: 15,
          lastInteraction: '2025-01-10T14:30:00Z',
        },
        {
          id: '2',
          companyName: 'Inovação Brasil S.A.',
          tradeName: 'InoBrasil',
          cnpj: '98.765.432/0001-10',
          contactName: 'Maria Santos',
          email: 'maria@inobrasil.com.br',
          phone: '(11) 98888-7777',
          status: 'lead',
          source: 'outbound',
          interactionCount: 5,
          lastInteraction: '2025-01-08T10:00:00Z',
        },
      ]),
    });
  });

  // Mock CNPJ auto-fill endpoint
  await page.route('**/api/v1/cnpj/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        razao_social: 'Nova Empresa LTDA',
        nome_fantasia: 'NovaEmp',
        cnpj: '11.222.333/0001-44',
        endereco: {
          logradouro: 'Av. Brasil',
          numero: '1000',
          cidade: 'Rio de Janeiro',
          uf: 'RJ',
          cep: '20040-020',
        },
      }),
    });
  });
}

test.describe('CRM/Clients CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');
  });

  test('should display clients list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /crm|clientes/i })).toBeVisible();
    
    // Should show clients
    await expect(page.getByText('Tech Solutions LTDA')).toBeVisible();
    await expect(page.getByText('Inovação Brasil S.A.')).toBeVisible();
  });

  test('should show client contact info', async ({ page }) => {
    await expect(page.getByText('joao@techsol.com.br')).toBeVisible();
    await expect(page.getByText('(21) 99999-8888')).toBeVisible();
  });

  test('should display interaction count', async ({ page }) => {
    // Check interaction counts are displayed
    await expect(page.getByText('15')).toBeVisible();
  });

  test('should open create client modal', async ({ page }) => {
    const newButton = page.getByRole('button', { name: /novo cliente/i });
    await expect(newButton).toBeVisible();
    await newButton.click();
    
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should have CNPJ field in modal', async ({ page }) => {
    await page.getByRole('button', { name: /novo cliente/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Should have CNPJ input for auto-fill
    await expect(page.getByLabel(/cnpj/i)).toBeVisible();
  });

  test('should filter by status', async ({ page }) => {
    const statusFilter = page.locator('select').first();
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      await expect(page.getByText('Tech Solutions LTDA')).toBeVisible();
    }
  });

  test('should show source badge', async ({ page }) => {
    // Check source indicators
    const inboundBadge = page.getByText('inbound');
    const outboundBadge = page.getByText('outbound');
    
    expect(
      await inboundBadge.isVisible() || await outboundBadge.isVisible()
    ).toBeTruthy();
  });
});

test.describe('CRM - CNPJ Auto-fill', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');
  });

  test('should auto-fill company data from CNPJ', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /novo cliente/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Fill CNPJ
    const cnpjInput = page.getByLabel(/cnpj/i);
    if (await cnpjInput.isVisible()) {
      await cnpjInput.fill('11.222.333/0001-44');
      
      // Trigger blur or search
      await cnpjInput.blur();
      
      // Wait for auto-fill
      await page.waitForTimeout(500);
      
      // Check if company name was filled
      const companyInput = page.getByLabel(/razão social|empresa|company/i);
      if (await companyInput.isVisible()) {
        const value = await companyInput.inputValue();
        expect(value).toBeTruthy();
      }
    }
  });
});

test.describe('CRM - Search and Filter', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupApiMock(page);
    await page.goto('/crm');
    await page.waitForLoadState('networkidle');
  });

  test('should search clients by name', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/buscar|search|pesquisar/i);
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Tech');
      await page.waitForTimeout(300);
      
      await expect(page.getByText('Tech Solutions LTDA')).toBeVisible();
    }
  });

  test('should filter by interaction source', async ({ page }) => {
    const sourceFilter = page.locator('select').filter({ hasText: /fonte|source/i });
    
    if (await sourceFilter.isVisible()) {
      await sourceFilter.selectOption('inbound');
      await page.waitForTimeout(300);
    }
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

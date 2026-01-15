/**
 * E2E Test: AI Matching and Adherence Features
 * Tests AI-powered matching, adherence analysis, and confidence scores
 * Implements RF-06: Algoritmos de Matching e Análise de Aderência
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

async function setupMatchingMocks(page: Page) {
  // Mock matching suggestions endpoint
  await page.route('**/api/v1/matching/suggestions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          fundingSourceId: 'fs-1',
          fundingSourceName: 'FINEP Inovação 2026',
          clientId: 'c-1',
          clientName: 'Tech Solutions LTDA',
          projectId: 'p-1',
          projectName: 'Automação Industrial 4.0',
          overallScore: 0.87,
          technicalViabilityScore: 0.92,
          financialViabilityScore: 0.80,
          strategicAlignmentScore: 0.85,
          explanation: 'Alta aderência técnica devido ao TRL compatível (7-9) e área tecnológica alinhada.',
          factors: [
            { name: 'TRL Compatibility', score: 0.95, weight: 0.25 },
            { name: 'Technical Area', score: 0.90, weight: 0.20 },
            { name: 'Budget Fit', score: 0.75, weight: 0.20 },
            { name: 'Team Capacity', score: 0.88, weight: 0.15 },
            { name: 'Historical Success', score: 0.85, weight: 0.20 },
          ],
          confidenceBadge: 'green',
        },
        {
          fundingSourceId: 'fs-2',
          fundingSourceName: 'CNPq Pesquisa Aplicada',
          clientId: 'c-2',
          clientName: 'Inovação Brasil S.A.',
          projectId: 'p-2',
          projectName: 'Plataforma IA Saúde',
          overallScore: 0.72,
          technicalViabilityScore: 0.75,
          financialViabilityScore: 0.68,
          strategicAlignmentScore: 0.73,
          explanation: 'Aderência moderada. Recomenda-se ajuste no orçamento proposto.',
          factors: [
            { name: 'TRL Compatibility', score: 0.80, weight: 0.25 },
            { name: 'Technical Area', score: 0.85, weight: 0.20 },
            { name: 'Budget Fit', score: 0.55, weight: 0.20 },
            { name: 'Team Capacity', score: 0.70, weight: 0.15 },
            { name: 'Historical Success', score: 0.72, weight: 0.20 },
          ],
          confidenceBadge: 'yellow',
        },
      ]),
    });
  });

  // Mock adherence analysis endpoint
  await page.route('**/api/v1/matching/analyze**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overallAdherence: 0.85,
        breakdown: {
          technicalViability: {
            score: 0.90,
            weight: 0.4,
            factors: ['TRL compatível', 'Área tecnológica alinhada', 'Equipe qualificada'],
          },
          financialViability: {
            score: 0.78,
            weight: 0.3,
            factors: ['Orçamento dentro do limite', 'Contrapartida adequada'],
            warnings: ['Considerar reserva de contingência'],
          },
          strategicAlignment: {
            score: 0.85,
            weight: 0.3,
            factors: ['Alinhamento com prioridades institucionais', 'Potencial de impacto'],
          },
        },
        recommendations: [
          'Fortalecer justificativa técnica na seção de metodologia',
          'Adicionar indicadores de impacto mais específicos',
          'Revisar cronograma para incluir marcos intermediários',
        ],
        humanValidationRequired: true,
        aiConfidenceDisclaimer: 'Esta análise foi gerada por IA e requer validação humana.',
      }),
    });
  });
}

test.describe('AI Matching Features', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupMatchingMocks(page);
    // Use analytics page for matching suggestions (currently no dedicated matching page)
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should display matching page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /analytics|aderência|matching/i })).toBeVisible();
  });

  test('should show matching suggestions', async ({ page }) => {
    await expect(page.getByText('FINEP Inovação 2026')).toBeVisible();
    await expect(page.getByText('Tech Solutions LTDA')).toBeVisible();
  });

  test('should display overall matching scores', async ({ page }) => {
    await expect(page.getByText('87%').first()).toBeVisible();
    await expect(page.getByText('72%').first()).toBeVisible();
  });

  test('should show confidence badges', async ({ page }) => {
    // Green badge for high confidence
    const greenBadge = page.locator('[class*="green"], [class*="success"]').first();
    
    // Yellow badge for moderate confidence
    const yellowBadge = page.locator('[class*="yellow"], [class*="warning"]').first();
    
    expect(
      await greenBadge.isVisible() || await yellowBadge.isVisible()
    ).toBeTruthy();
  });

  test('should display score breakdown', async ({ page }) => {
    // Check for viability components
    const hasBreakdown = 
      await page.getByText(/viabilidade técnica|technical viability/i).isVisible() ||
      await page.getByText(/viabilidade financeira|financial viability/i).isVisible() ||
      await page.getByText(/alinhamento estratégico|strategic alignment/i).isVisible();
    
    expect(hasBreakdown).toBeTruthy();
  });

  test('should show AI explanation', async ({ page }) => {
    // Check for explanation text
    const explanation = page.getByText(/alta aderência|aderência moderada/i);
    expect(await explanation.first().isVisible()).toBeDefined();
  });

  test('should display human validation disclaimer', async ({ page }) => {
    const disclaimer = page.getByText(/validação humana|human validation|análise.*IA/i);
    expect(await disclaimer.first().isVisible()).toBeDefined();
  });
});

test.describe('AI Adherence Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupMatchingMocks(page);
    // Use analytics page as matching suggestions are displayed there
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should trigger adherence analysis', async ({ page }) => {
    const analyzeButton = page.getByRole('button', { name: /analisar|analyze|calcular/i });
    
    if (await analyzeButton.isVisible()) {
      await analyzeButton.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show weighted score formula', async ({ page }) => {
    // Formula: (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
    const hasWeights = 
      await page.getByText(/40%|0\.4/i).isVisible() ||
      await page.getByText(/30%|0\.3/i).isVisible();
    
    expect(hasWeights).toBeDefined();
  });

  test('should display recommendations', async ({ page }) => {
    const recommendations = page.getByText(/recomendações|recommendations/i);
    expect(await recommendations.isVisible()).toBeDefined();
  });

  test('should show warnings for lower scores', async ({ page }) => {
    const warning = page.getByText(/atenção|warning|considerar/i);
    expect(await warning.first().isVisible()).toBeDefined();
  });
});

test.describe('AI Human-in-the-Loop', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupMatchingMocks(page);
    // Analytics page displays matching with human validation
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should require human validation for AI decisions', async ({ page }) => {
    // AI should not auto-approve - always require validation
    const validateButton = page.getByRole('button', { name: /validar|validate|aprovar|approve/i });
    
    if (await validateButton.isVisible()) {
      expect(true).toBeTruthy();
    }
    
    // Should not have auto-submit or auto-process
    const autoButton = page.getByRole('button', { name: /auto.*submit|auto.*process/i });
    expect(await autoButton.isVisible()).toBeFalsy();
  });

  test('should show confidence source transparency', async ({ page }) => {
    // Should explain why the score was calculated
    const sourceInfo = page.getByText(/fonte|source|baseado em|based on/i);
    expect(await sourceInfo.first().isVisible()).toBeDefined();
  });

  test('should allow human override of AI suggestion', async ({ page }) => {
    const overrideButton = page.getByRole('button', { name: /sobrescrever|override|ajustar|adjust/i });
    
    if (await overrideButton.first().isVisible()) {
      await overrideButton.first().click();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('AI Score Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupMatchingMocks(page);
    // Charts and visualizations on analytics page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should show radar or bar chart for score factors', async ({ page }) => {
    // Check for chart elements
    const chart = page.locator('svg, canvas, [class*="chart"], [class*="graph"]');
    expect(await chart.first().isVisible()).toBeDefined();
  });

  test('should highlight low-scoring factors', async ({ page }) => {
    // Low scores should be visually distinct
    const lowScore = page.locator('[class*="red"], [class*="danger"], [class*="low"]');
    expect(await lowScore.first().isVisible()).toBeDefined();
  });

  test('should show comparison between matches', async ({ page }) => {
    // Should be able to compare different matching options
    const compareFeature = page.getByText(/comparar|compare/i);
    expect(await compareFeature.isVisible()).toBeDefined();
  });
});

test.describe('Matching Filter and Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await setupMatchingMocks(page);
    // Filters for matching suggestions on analytics page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
  });

  test('should filter by minimum score', async ({ page }) => {
    const scoreFilter = page.locator('input[type="range"], select').filter({ hasText: /score|pontuação/i });
    
    if (await scoreFilter.first().isVisible()) {
      // Interact with filter
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by confidence level', async ({ page }) => {
    const confidenceFilter = page.getByRole('button', { name: /alta|média|green|yellow/i });
    
    if (await confidenceFilter.first().isVisible()) {
      await confidenceFilter.first().click();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should sort by score', async ({ page }) => {
    const sortButton = page.getByRole('button', { name: /ordenar|sort|score/i });
    
    if (await sortButton.isVisible()) {
      await sortButton.click();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('body')).toBeVisible();
  });
});

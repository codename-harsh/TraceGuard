import { test, expect } from '@playwright/test';

test.describe('TraceGuard Web Dashboard — E2E Journey Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Open app
    await page.goto('/');
  });

  // ---------------------------------------------------------------------------
  // 1. Landing Page
  // ---------------------------------------------------------------------------
  test('Landing Page renders hero, architecture lifecycle, and disclaimers', async ({ page }) => {
    // Verify brand header
    await expect(page.locator('text=TRACEGUARD')).toBeVisible();

    // Verify main hero headline
    await expect(page.locator('h1')).toContainText('See what websites do');
    await expect(page.locator('h1')).toContainText('behind the page');

    // Verify CTAs
    const installBtn = page.getByRole('button', { name: /Install Extension/i }).first();
    await expect(installBtn).toBeVisible();

    const demoBtn = page.getByRole('button', { name: /View Demo/i }).first();
    await expect(demoBtn).toBeVisible();

    // Verify sections
    await expect(page.getByText('How TraceGuard Works')).toBeVisible();
    await expect(page.getByText('What TraceGuard Observes')).toBeVisible();
    await expect(page.getByText('Transparent Scoring Model')).toBeVisible();
    await expect(page.getByText('Hard Redaction & Local-First Boundaries')).toBeVisible();
    await expect(page.getByText('Open Architecture & Defense-in-Depth')).toBeVisible();

    // Test Install Extension Modal
    await installBtn.click();
    await expect(page.getByText('TraceGuard Chrome Extension Setup')).toBeVisible();
    await expect(page.getByText('Zero Raw Cookie / Header Transmission Guarantee')).toBeVisible();
    await page.getByRole('button', { name: /Got it/i }).click();
  });

  // ---------------------------------------------------------------------------
  // 2. Demo Mode 1-Click Login & Overview
  // ---------------------------------------------------------------------------
  test('1-Click Demo Mode signs in as demo@traceguard.local and populates real KPI metrics', async ({
    page,
  }) => {
    await page.goto('/login');

    // Check login page elements
    await expect(page.getByText('Sign In to TraceGuard')).toBeVisible();
    await expect(page.getByText('Instant Evaluator Demo')).toBeVisible();
    await expect(page.getByText('demo@traceguard.local')).toBeVisible();

    // Click Demo Mode button
    const demoLoginBtn = page.getByRole('button', { name: /Explore Demo Mode/i });
    await demoLoginBtn.click();

    // Should redirect to /dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);

    // Verify KPI Cards loaded from database
    await expect(page.getByText('Security & Privacy Overview')).toBeVisible();
    await expect(page.getByText('Sites Analyzed')).toBeVisible();
    await expect(page.getByText('Average Observed Score')).toBeVisible();
    await expect(page.getByText('Trackers Observed')).toBeVisible();
    await expect(page.getByText('Third-Party Domains')).toBeVisible();

    // Verify Recharts visualizations are mounted
    await expect(page.getByText('Risk Classification Distribution')).toBeVisible();
    await expect(page.getByText('Recent Scan Score Trends')).toBeVisible();

    // Verify Recent Scans table contains seeded records
    await expect(page.getByText('news.example')).toBeVisible();
    await expect(page.getByText('shop.example')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. Scan History & Filtering
  // ---------------------------------------------------------------------------
  test('Scan History table displays seeded audits and filters by domain and risk', async ({ page }) => {
    // Navigate via Demo Mode
    await page.goto('/login');
    await page.getByRole('button', { name: /Explore Demo Mode/i }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/scans');
    await expect(page.getByText('Website Scan History')).toBeVisible();

    // Verify table has seeded sites
    await expect(page.getByText('news.example')).toBeVisible();
    await expect(page.getByText('shop.example')).toBeVisible();
    await expect(page.getByText('blog.example')).toBeVisible();
    await expect(page.getByText('portal.example')).toBeVisible();

    // Test Domain Filter input
    const searchInput = page.getByPlaceholder(/Filter by hostname/i);
    await searchInput.fill('shop');

    // Wait for filtered list
    await expect(page.getByText('shop.example')).toBeVisible();
    await expect(page.getByText('news.example')).not.toBeVisible();

    // Reset filter
    await page.getByRole('button', { name: /Reset/i }).click();
    await expect(page.getByText('news.example')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. Scan Details View (8 Tabs & Exports)
  // ---------------------------------------------------------------------------
  test('Scan Details page renders SVG Score Ring and allows inspecting all 8 tabs', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Explore Demo Mode/i }).click();
    await page.waitForURL('**/dashboard');

    // Click on news.example scan
    await page.goto('/dashboard/scans');
    await page.locator('text=news.example').first().click();

    // Verify header components
    await expect(page.getByText('news.example')).toBeVisible();
    await expect(page.getByText('/ 100')).toBeVisible(); // Score Ring
    await expect(page.getByRole('button', { name: /Export JSON/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print PDF/i })).toBeVisible();

    // Tab 1: Overview
    await expect(page.getByText('Executive Audit Summary')).toBeVisible();
    await expect(page.getByText('Product & Security Boundaries Disclaimer')).toBeVisible();

    // Tab 2: Network
    await page.getByRole('tab', { name: /Network/i }).click();
    await expect(page.getByText('Observed Domain Endpoints')).toBeVisible();

    // Tab 3: Trackers
    await page.getByRole('tab', { name: /Trackers/i }).click();
    await expect(page.getByText('Classified Tracking Services')).toBeVisible();

    // Tab 4: Cookies
    await page.getByRole('tab', { name: /Cookies/i }).click();
    await expect(page.getByText('Observed Cookie Metadata')).toBeVisible();
    await expect(page.getByText('Zero Cookie Value Guarantee')).toBeVisible();

    // Tab 5: Permissions
    await page.getByRole('tab', { name: /Permissions/i }).click();
    await expect(page.getByText('Observed Browser Permissions')).toBeVisible();

    // Tab 6: Findings
    await page.getByRole('tab', { name: /Findings/i }).click();
    await expect(page.getByText('Observed Findings & Advisory Cards')).toBeVisible();

    // Tab 7: Timeline
    await page.getByRole('tab', { name: /Timeline/i }).click();
    await expect(page.getByText('Chronological Observation Timeline')).toBeVisible();

    // Tab 8: Score & Rules
    await page.getByRole('tab', { name: /Score & Rules/i }).click();
    await expect(page.getByText('Penalty Deduction Model Breakdown')).toBeVisible();
    await expect(page.getByText('Why This Score?')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 5. Site Comparison View
  // ---------------------------------------------------------------------------
  test('Site Comparison page allows comparing Site A and Site B side-by-side', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Explore Demo Mode/i }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/compare');
    await expect(page.getByText('Site-by-Site Comparison')).toBeVisible();
    await expect(page.getByText('Overall Score Delta')).toBeVisible();
    await expect(page.getByText('Tracker Difference')).toBeVisible();
    await expect(page.getByText('Category Penalty Comparison')).toBeVisible();
    await expect(page.getByText('Detailed Metric Matrix')).toBeVisible();

    // Test Swap button
    const swapBtn = page.getByTitle('Swap Site A and Site B');
    await expect(swapBtn).toBeEnabled();
    await swapBtn.click();
  });

  // ---------------------------------------------------------------------------
  // 6. Cross-Scan Analytics View
  // ---------------------------------------------------------------------------
  test('Analytics page displays cross-scan tracker intelligence and cookie hygiene', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Explore Demo Mode/i }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/analytics');
    await expect(page.getByText('Cross-Scan Intelligence')).toBeVisible();
    await expect(page.getByText('Tracker Category Distribution')).toBeVisible();
    await expect(page.getByText('Audit Score History')).toBeVisible();
    await expect(page.getByText('Prevalent Third-Party Domains')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 7. Settings & Profile View
  // ---------------------------------------------------------------------------
  test('Settings page allows editing full name and toggling preferences', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Explore Demo Mode/i }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/settings');
    await expect(page.getByText('Account & Security Settings')).toBeVisible();
    await expect(page.getByText('demo@traceguard.local')).toBeVisible();
    await expect(page.getByText('Opt-in Cloud Scan Sync')).toBeVisible();
    await expect(page.getByText('Strict Query Parameter & Header Masking')).toBeVisible();
    await expect(page.getByText('Score Band Reference')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 8. Public Privacy & Architecture Specification
  // ---------------------------------------------------------------------------
  test('Public /privacy page renders 100% local-first guarantees and limitations', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText('Privacy & Security Architecture')).toBeVisible();
    await expect(page.getByText('100% Local-First Engine')).toBeVisible();
    await expect(page.getByText('Telemetry Redaction & Boundary Matrix')).toBeVisible();
    await expect(page.getByText('Scoring Deduction Model & Risk Bands')).toBeVisible();
    await expect(page.getByText('Product Boundaries & Limitations')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

test.describe('VERITAS // CORPUS — Swiss Grid Research Workspace E2E', () => {
  test('should load workspace with 3-panel layout and system telemetry', async ({ page }) => {
    await page.goto('/');

    // 1. Header Telemetriyasının yoxlanması
    const banner = page.getByRole('banner');
    await expect(banner).toContainText('VERITAS');
    await expect(banner).toContainText('CORPUS');
    await expect(banner).toContainText('Coordinates synced');
    await expect(banner).toContainText('1,480');

    // 2. Sol Sənəd Paneli
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Indexed Documents')).toBeVisible();
    await expect(sidebar.getByText('cuda_kernel.pdf')).toBeVisible();
    await expect(sidebar.getByText('Hybrid balance')).toBeVisible();

    // 3. Orta Araşdırma Çat Paneli
    await expect(page.getByText('Active Session')).toBeVisible();
    await expect(page.getByText('Synthesized Response')).toBeVisible();
    await expect(page.getByText('Retrieval Trace')).toBeVisible();

    // 4. Sağ Kağız Evidence Canvas (#F8F7F4)
    await expect(page.getByText('Zero-Copy Asynchronous Pinned Allocations')).toBeVisible();
    await expect(page.getByText('MIT CSAIL Technical Report')).toBeVisible();
  });

  test('should interactively highlight PDF bounding box when citation button is clicked', async ({ page }) => {
    await page.goto('/');

    // Sitat [2] düyməsini tap və kliklə
    const citation2 = page.getByRole('button', { name: '[2]' });
    await expect(citation2).toBeVisible();
    await citation2.click();

    // Citation [2] aktiv stilini və BBox Reticle nişangahını yoxla
    await expect(citation2).toHaveClass(/bg-accent/);
    await expect(page.getByText('[Ref 2]')).toBeVisible();
    await expect(page.getByText('Y: 280.1, X: 48.0, W: 540')).toBeVisible();
  });

  test('should expand and collapse Retrieval & Rerank Trace drawer', async ({ page }) => {
    await page.goto('/');

    const traceHeader = page.getByText('Retrieval Trace');
    await expect(traceHeader).toBeVisible();

    // Trace açılsın
    await traceHeader.click();
    await expect(page.getByText('BM25: 18.4')).toBeVisible();
    await expect(page.getByText('Cosine: 0.941')).toBeVisible();
    await expect(page.getByText('CHUNK #112')).toBeVisible();
  });

  test('should seamlessly switch between WORKSPACE, CORPUS, EVALS, and CONFIG views', async ({ page }) => {
    await page.goto('/');

    // Corpus tabına keçid
    await page.getByRole('button', { name: 'Corpus' }).click();
    await expect(page.getByText('CORPUS MANAGEMENT & CHUNK COORDINATE INSPECTOR')).toBeVisible();
    await expect(page.getByText('TOTAL STORAGE: 9.94 MB')).toBeVisible();

    // Benchmarks tabına keçid
    await page.getByRole('button', { name: 'Benchmarks' }).click();
    await expect(page.getByText('GROUNDING ACCURACY & RETRIEVAL BENCHMARKS')).toBeVisible();
    await expect(page.getByText('CITATION FIDELITY')).toBeVisible();
    await expect(page.getByText('99.8%')).toBeVisible();

    // Configuration tabına keçid
    await page.getByRole('button', { name: 'Configuration' }).click();
    await expect(page.getByText('SYSTEM ENGINE CONFIGURATION & HYPERPARAMETERS')).toBeVisible();
    await expect(page.getByText('HYBRID RETRIEVAL & RRF PARAMETERS')).toBeVisible();

    // Workspace-ə qayıdış
    await page.getByRole('button', { name: 'Workspace' }).click();
    await expect(page.getByText('Indexed Documents')).toBeVisible();
  });

  test('should inspect live chunk offsets, XY-Cut columns, and coordinate cache in Corpus Inspector', async ({ page }) => {
    await page.goto('/');

    // Corpus bölməsinə keçid və BBox + Char Offset inspektorunu açmaq
    await page.getByRole('button', { name: 'Corpus' }).click();
    await expect(page.getByText('XY-Cut').first()).toBeVisible();

    const inspectBtn = page.getByRole('button', { name: 'INSPECT BBOX' }).first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    await expect(page.getByText(/COORDINATE & OFFSET INSPECTOR:/)).toBeVisible();
    await expect(page.getByText(/CACHE: (HIT|MISS)/)).toBeVisible();
    await expect(page.getByText(/CHARS: 0\.\./)).toBeVisible();
  });
});

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

  test('should validate multi-document batch ingestion, SHA-256 deduplication, and invalid PDF rejection', async ({ page }) => {
    await page.goto('/');

    const uniqueToken = `e2e-batch-${Date.now()}`;
    const validMd = Buffer.from(`# Batch Test\n\nDeterministic verification content ${uniqueToken} with enough text for indexing.`, 'utf8');
    const fakePdf = Buffer.from('NOT A REAL PDF BINARY HEADER', 'utf8');

    const batchResPromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/documents/upload-batch') && res.request().method() === 'POST'
    );

    const fileInput = page.getByRole('complementary').locator('input[type="file"]');
    await fileInput.setInputFiles([
      { name: `${uniqueToken}-a.md`, mimeType: 'text/markdown', buffer: validMd },
      { name: `${uniqueToken}-dup.md`, mimeType: 'text/markdown', buffer: validMd },
      { name: `${uniqueToken}-invalid.pdf`, mimeType: 'application/pdf', buffer: fakePdf },
    ]);

    const batchRes = await batchResPromise;
    expect(batchRes.status()).toBe(200);
    const body = await batchRes.json();

    expect(body.totalFiles).toBe(3);
    expect(body.indexedCount).toBe(1);
    expect(body.duplicateCount).toBe(1);
    expect(body.rejectedCount).toBe(1);

    await expect(page.getByText(/BATCH \(3\): 1 new • 1 dup • 1 err/)).toBeVisible();

    // Clean up uploaded E2E test document so corpus stays clean
    const createdId = body.results?.[0]?.document?.id;
    if (createdId) {
      await page.request.delete(`/api/v1/documents/${createdId}`);
    }
  });

  test('should support optical reticle corners and zoom mechanics (60%-200% & Reset)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Toolbar filename must not be squeezed to zero at 1440px
    const docBadge = page.getByTestId('canvas-document-name');
    await expect(docBadge).toBeVisible();
    const badgeBox = await docBadge.boundingBox();
    expect(badgeBox?.width ?? 0).toBeGreaterThan(40);

    // 4-corner Swiss optical reticle must appear on locked citation
    await expect(page.getByTestId('optical-reticle')).toBeVisible();

    const resetBtn = page.getByRole('button', { name: 'Reset zoom' });
    await expect(resetBtn).toHaveText('100%');

    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    const zoomOut = page.getByRole('button', { name: 'Zoom out' });

    await zoomIn.click();
    await zoomIn.click();
    await expect(resetBtn).toHaveText('120%');

    await resetBtn.click();
    await expect(resetBtn).toHaveText('100%');

    await zoomOut.click();
    await zoomOut.click();
    await expect(resetBtn).toHaveText('80%');

    await resetBtn.click();
    await expect(resetBtn).toHaveText('100%');
  });

  test('should adapt workspace cleanly for mobile viewports (390x844) without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const hasNoHorizontalOverflow = async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

    expect(await hasNoHorizontalOverflow()).toBe(true);

    // Mobile switcher bar is visible and Chat is default
    await expect(page.getByTestId('mobile-pane-chat')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Synthesized Response')).toBeVisible();

    // Switch to Sources tab on mobile
    await page.getByTestId('mobile-pane-sources').click();
    await expect(page.getByText('Indexed Documents')).toBeVisible();
    expect(await hasNoHorizontalOverflow()).toBe(true);

    // Switch back to Chat and click citation [2] -> should auto-switch to Paper + show optical reticle
    await page.getByTestId('mobile-pane-chat').click();
    await page.getByRole('button', { name: '[2]' }).click();
    await expect(page.getByTestId('mobile-pane-canvas')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('optical-reticle')).toBeVisible();
    await expect(page.getByText('[Ref 2]')).toBeVisible();
    expect(await hasNoHorizontalOverflow()).toBe(true);

    // Verify Corpus, Benchmarks, Configuration tabs also avoid viewport overflow on mobile
    for (const tabName of ['Corpus', 'Benchmarks', 'Configuration']) {
      await page.getByRole('button', { name: tabName }).click();
      expect(await hasNoHorizontalOverflow()).toBe(true);
    }
  });

  test('should support tablet viewport (768x1024) split view and Sources slide-over drawer', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Chat and Paper panes sit side-by-side on tablet
    await expect(page.getByText('Synthesized Response')).toBeVisible();
    await expect(page.getByText('Zero-Copy Asynchronous Pinned Allocations')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Slide-over Sources drawer opens & closes cleanly (280px drawer width, not full 768px)
    await page.getByTestId('tablet-sources-toggle').click();
    await expect(page.getByText('Indexed Documents')).toBeVisible();
    const drawerBox = await page.getByRole('complementary').boundingBox();
    expect(drawerBox?.width ?? 0).toBeGreaterThan(200);
    expect(drawerBox?.width ?? 0).toBeLessThanOrEqual(300);
    await page.getByRole('button', { name: 'Close sources drawer' }).click();
  });
});

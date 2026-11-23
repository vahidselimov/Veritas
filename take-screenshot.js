const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');

async function capture() {
  console.log('Starting Next.js server...');
  const server = spawn('npm', ['run', 'start'], {
    shell: true,
    stdio: 'ignore',
  });

  // Serverin açılmasını gözləyirik
  await new Promise((r) => setTimeout(r, 3000));

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // Retina 2x kəskinlik
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Citation [1] düyməsinə klikləyirik
  const citationBtn = page.getByRole('button', { name: '[1]' });
  if (await citationBtn.isVisible()) {
    await citationBtn.click();
    console.log('Clicked citation [1]');
  }

  // Animasiyanın tamamlanması üçün 500ms gözləyirik
  await page.waitForTimeout(600);

  const outputPath = 'c:/Users/Hsyn/Desktop/veritas/VERITAS_CORPUS_Live_App.png';
  await page.screenshot({ path: outputPath });
  console.log('Live App screenshot saved to:', outputPath);

  await browser.close();
  server.kill();
  process.exit(0);
}

capture().catch((err) => {
  console.error('Error taking screenshot:', err);
  process.exit(1);
});

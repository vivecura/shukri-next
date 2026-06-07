const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/health-check', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Scroll to the steps section area
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/hc-steps-0.png' });
  
  // Scroll through the video experience
  const offsets = [1600, 2000, 2500, 3000, 3500, 4000, 4500];
  for (const y of offsets) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `screenshots/hc-steps-${y}.png` });
    console.log(`Captured at ${y}`);
  }
  await browser.close();
})();

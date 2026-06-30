import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to Login...');
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');

  console.log('Logging in as adjuster...');
  // Click the adjuster demo login button
  await page.click('text=理算员');
  // Wait for dashboard to load
  await page.waitForURL('**/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('Taking Dashboard screenshot...');
  await page.screenshot({ path: 'screenshot_1_dashboard.png', fullPage: true });

  console.log('Navigating to Claims List...');
  await page.goto('http://localhost:5173/claims');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('Taking Claims List screenshot...');
  await page.screenshot({ path: 'screenshot_2_claims_list.png', fullPage: true });

  console.log('Navigating to Chat Page...');
  await page.goto('http://localhost:5173/chat');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log('Taking Chat screenshot...');
  await page.screenshot({ path: 'screenshot_3_chat.png', fullPage: true });

  console.log('Navigating to Claim Detail...');
  await page.goto('http://localhost:5173/claims/CLM-202405-001');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  console.log('Taking Claim Detail screenshot...');
  await page.screenshot({ path: 'screenshot_4_claim_detail.png', fullPage: true });

  await browser.close();
  console.log('Screenshots captured successfully.');
})();

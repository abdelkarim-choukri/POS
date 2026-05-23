import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto('http://localhost:3000');
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

// Navigate to super admin page
await page.evaluate(() => {
  // Find and click the super admin link or navigate directly
  const links = Array.from(document.querySelectorAll('button, a'));
  const link = links.find(el => el.textContent?.includes('Super Admin') || el.textContent?.includes('super-admin'));
  if (link) link.click();
});

// Wait a moment for navigation
await page.waitForTimeout(2000);

// Take screenshot of current state
await page.screenshot({ path: 'screenshot-dashboard.png', fullPage: false });

// Now let's look at the page and check errors
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

console.log('Page URL:', page.url());
console.log('Page title:', await page.title());
console.log('Console errors:', errors);

await browser.close();

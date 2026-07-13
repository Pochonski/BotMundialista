import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    errors.push({ type: msg.type(), text: msg.text() });
  }
});
page.on('pageerror', err => {
  errors.push({ type: 'pageerror', text: err.message, stack: err.stack?.substring(0, 500) });
});

try {
  await page.goto('http://localhost:5173/historial/16', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('=== ERRORS ===');
  errors.forEach(e => console.log(JSON.stringify(e)));
  console.log('=== BODY TEXT ===');
  console.log(bodyText.substring(0, 800));
  const hasContainer = await page.evaluate(() => document.querySelector('.max-w-3xl') !== null);
  console.log('Has .max-w-3xl:', hasContainer);
  const hasSkeleton = await page.evaluate(() => document.querySelector('.skeleton') !== null);
  console.log('Has .skeleton:', hasSkeleton);
} catch (err) {
  console.log('ERROR:', err.message);
}

await browser.close();

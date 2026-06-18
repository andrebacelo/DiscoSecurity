const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  try {
    await page.goto('http://localhost:8080/?cena=perseguicao', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error('ERROR during goto:', e);
  }

  await browser.close();
})();

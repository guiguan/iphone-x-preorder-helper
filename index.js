/**
 * @Author: guiguan
 * @Date:   2017-10-16T21:55:57+11:00
 * @Last modified by:   guiguan
 * @Last modified time: 2017-10-17T11:32:32+11:00
 */

const puppeteer = require('puppeteer');

const BASE_URL = 'https://www.apple.com';
const { EMAIL, PASSWD } = process.env;
const SELECT_BUTTON_SELECTOR = '.as-purchaseinfo-button > button';

process.on('unhandledRejection', reason => {
  console.error(reason);
});

(async () => {
  const browser = await puppeteer.launch({
    headless: false
    // slowMo: 500,
    // devtools: true
  });
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/au/shop/favorites`);

  // Sign In
  await page.type('#login-appleId', EMAIL);
  await page.type('#login-password', PASSWD);
  await page.click('#sign-in');

  // Get list of favourites
  await page.waitFor('div.rs-favorites-itemcontent');
  const favouriteUrls = await page.evaluate(() => {
    const anchors = [...document.querySelectorAll('div.rs-favorites-itemcontent a')];
    const urls = anchors.map(anchor => anchor.getAttribute('href'));
    return [...new Set(urls)];
  });

  let needsAvailabilityCheck = true;

  const checkAndProceed = async url => {
    const subPage = await browser.newPage();
    await subPage.setViewport({
      width: 1280,
      height: 800
    });
    await subPage.goto(`${BASE_URL}${url}`);

    if (needsAvailabilityCheck) {
      console.log('Checking availability...');
      const isAvailable = await subPage.$eval(SELECT_BUTTON_SELECTOR, el => !el.disabled);

      if (isAvailable) {
        console.log('iPhone X is available now!');
        needsAvailabilityCheck = false;
      } else {
        console.log('iPhone X is not available yet. Waiting...');
        await subPage.waitFor(2000);
        await subPage.close();
        return;
      }
    }

    // Go select and order now!
    console.log('Opening order page...');
    let isOkay = false;
    do {
      try {
        await subPage.waitFor(2000);
        await subPage.click(SELECT_BUTTON_SELECTOR);
        isOkay = true;
      } catch (e) {
        console.log(e);
      }
    } while (!isOkay);
  };

  for (const url of favouriteUrls) {
    if (needsAvailabilityCheck) {
      while (needsAvailabilityCheck) {
        await checkAndProceed(url);
      }
    } else {
      await checkAndProceed(url);
    }
  }
})();

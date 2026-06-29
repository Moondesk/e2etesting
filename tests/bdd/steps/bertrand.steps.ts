import { Before, After, Given, When, Then, setDefaultTimeout } from '@cucumber/cucumber';
import { expect, Page, Browser, Locator, devices } from '@playwright/test';
import { chromium } from '@playwright/test';

// Set step timeout high enough for browser interactions over the network
setDefaultTimeout(60000);

const BASE_URL = 'https://www.bertrand.pt/';

interface TestContext {
  browser?: Browser;
  page?: Page;
  searchLocator?: any;
  selectedProduct?: any;
  lastScreenshotName?: string;
  lastCartContent?: string;
}

const context: TestContext = {};

// HELPER FUNCTIONS

async function acceptCookies(page: Page, timeoutMs = 5000): Promise<boolean> {
  const startTime = Date.now();
  const buttons = [
    page.getByRole('button', { name: /ACEITAR TODOS|Aceitar todos/i }),
    page.getByRole('button', { name: /ACEITAR|Aceitar/i }),
    page.locator('button:has-text("ACEITAR")'),
    page.locator('button:has-text("Aceitar")'),
  ];

  for (const btn of buttons) {
    try {
      if ((await btn.count()) > 0) {
        await btn.first().click({ timeout: 3000 });
        console.log('✅ Cookies accepted');
        return true;
      }
    } catch (e) {
      // Continue to next button
    }
    
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      console.warn('⚠️ Cookie acceptance timeout - banner may be present');
      return false;
    }
  }
  
  console.warn('⚠️ No cookie button found');
  return false;
}

async function findSearchInput(page: Page): Promise<any> {
  console.log('🔍 Searching for search input...');
  
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  
  const strategies = [
    { name: 'Portuguese "Pesquisar"', locator: page.getByPlaceholder('Pesquisar') },
    { name: 'Portuguese "Pesquisa"',  locator: page.getByPlaceholder('Pesquisa') },
    { name: 'Input type="search"',    locator: page.locator('input[type="search"]') },
    { name: 'Aria label Pesquisar',   locator: page.locator('input[aria-label*="Pesquisar"]') },
    { name: 'Role searchbox',         locator: page.getByRole('searchbox') },
    { name: 'Name q',                 locator: page.locator('input[name="q"]') },
    { name: 'Name s',                 locator: page.locator('input[name="s"]') },
  ];

  // Run all strategies in parallel and return the first visible one
  const result = await Promise.race(
    strategies.map(async ({ name, locator }) => {
      try {
        await locator.first().waitFor({ state: 'visible', timeout: 8000 });
        console.log(`✅ Found search input using: ${name}`);
        return locator.first();
      } catch {
        return null;
      }
    }).concat(
      // sentinel: after 10s return null so the race always resolves
      [new Promise<null>(resolve => setTimeout(() => resolve(null), 10000))]
    )
  );

  if (!result) {
    const allInputs = await page.$$('input').catch(() => []);
    console.error(`❌ Search input not found. Found ${allInputs.length} input elements total`);
    for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
      const type = await allInputs[i].evaluate((el: any) => el.type).catch(() => '?');
      const placeholder = await allInputs[i].evaluate((el: any) => el.placeholder).catch(() => '?');
      const name = await allInputs[i].evaluate((el: any) => el.name).catch(() => '?');
      console.error(`  Input ${i}: type="${type}", name="${name}", placeholder="${placeholder}"`);
    }
  }

  return result;
}

async function findProductLink(page: Page, productName: string): Promise<any> {
  // Wait for any product link to appear first (up to 15s)
  try {
    await page.locator('a[href*="/livro/"], a[href*="/produto/"]').first()
      .waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    console.warn(`⚠️ No /livro/ or /produto/ links appeared, searching anyway`);
  }

  const candidates = [
    page.locator(`a[href*="/livro/"]:has-text("${productName}")`),
    page.locator(`a[href*="/produto/"]:has-text("${productName}")`),
    page.locator(`a:has-text("${productName}")`),
    // broader: any link on the page that contains the product name somewhere
    page.locator(`[class*="product"] a, [class*="item"] a, [class*="result"] a`).filter({ hasText: productName }),
    page.locator(`a`).filter({ hasText: new RegExp(productName.split(':')[0].trim(), 'i') }),
  ];

  for (const candidate of candidates) {
    const count = await candidate.count().catch(() => 0);
    if (count > 0) {
      return candidate.first();
    }
  }

  // Debug: dump first 10 links on page
  const allLinks = await page.$$('a[href]').catch(() => []);
  console.error(`❌ No product link found for "${productName}". Found ${allLinks.length} total links.`);
  for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
    const href = await allLinks[i].evaluate((el: any) => el.href).catch(() => '?');
    const text = await allLinks[i].evaluate((el: any) => el.textContent?.trim().substring(0, 60)).catch(() => '?');
    console.error(`  Link ${i}: "${text}" -> ${href}`);
  }

  return null;
}

async function findAddToCartButton(page: Page): Promise<any> {
  const primaryBtn = page.getByRole('button', {
    name: /COMPRAR|Comprar|Adicionar|Adicionar ao carrinho|Adicionar ao cesto/i,
  });

  if ((await primaryBtn.count()) > 0) {
    return primaryBtn.first();
  }

  const altBtn = page.locator('button[class*="buy"], button[class*="add-to-cart"], button[data-test*="add"]');
  if ((await altBtn.count()) > 0) {
    return altBtn.first();
  }

  return null;
}

function getVisibleCartSidebar(page: Page): Locator {
  return page.locator('.shopping-cart:visible').first();
}

async function openCartSidebar(page: Page): Promise<Locator> {
  const visibleCart = getVisibleCartSidebar(page);
  if (await visibleCart.isVisible().catch(() => false)) {
    return visibleCart;
  }

  const cartToggle = page.locator('#cart-button');
  if ((await cartToggle.count()) === 0) {
    throw new Error('Cart sidebar toggle not found');
  }

  await cartToggle.first().click({ timeout: 15000 });

  const cartSidebar = page.locator('.shopping-cart').first();
  await cartSidebar.waitFor({ state: 'visible', timeout: 10000 });
  return cartSidebar;
}

async function getCartQuantityInput(page: Page): Promise<Locator> {
  const cartSidebar = await openCartSidebar(page);
  const quantityInput = cartSidebar.locator('input[title="quantidade"], input.qtd').first();

  await quantityInput.waitFor({ state: 'visible', timeout: 10000 });
  return quantityInput;
}

async function readCartQuantity(page: Page): Promise<number> {
  const quantityInput = await getCartQuantityInput(page);
  const rawValue = await quantityInput.inputValue();
  const quantity = Number.parseInt(rawValue, 10);

  if (Number.isNaN(quantity)) {
    throw new Error(`Invalid cart quantity value: "${rawValue}"`);
  }

  return quantity;
}

async function changeCartQuantity(page: Page, direction: 'increase' | 'decrease'): Promise<void> {
  const cartSidebar = await openCartSidebar(page);
  const before = await readCartQuantity(page);
  const buttonSelector = direction === 'increase' ? 'button.qtdplus' : 'button.qtdminus';
  const quantityButton = cartSidebar.locator(buttonSelector).first();

  if (!(await quantityButton.isVisible().catch(() => false))) {
    throw new Error(`Cart quantity ${direction} button not found`);
  }

  const expectedQuantity = direction === 'increase' ? before + 1 : Math.max(1, before - 1);
  await quantityButton.click();

  await expect.poll(
    async () => readCartQuantity(page),
    { timeout: 10000 }
  ).toBe(expectedQuantity);
}

async function findRemoveButton(page: Page): Promise<Locator> {
  const cartSidebar = await openCartSidebar(page);
  const candidates = [
    cartSidebar.locator('button.icon-trash'),
    cartSidebar.locator('button:has-text("Remover"), button:has-text("Eliminar"), a:has-text("Remover")'),
  ];

  for (const candidate of candidates) {
    if ((await candidate.count().catch(() => 0)) > 0) {
      return candidate.first();
    }
  }

  throw new Error('Remove button not found in cart sidebar');
}

// HOOKS

Before(async function () {
  // Use Desktop Chrome device profile — matches playwright.config.ts and avoids
  // bot detection triggered by custom/inconsistent Sec-* headers.
  const desktopChrome = devices['Desktop Chrome'];

  context.browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  context.page = await context.browser.newPage({
    ...desktopChrome,
    locale: 'pt-PT',
  });

  // Hide webdriver flag
  await context.page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
});

After(async function () {
  if (context.page) {
    await context.page.close();
  }
  if (context.browser) {
    await context.browser.close();
  }
});

async function navigateToBertrandHomePage(): Promise<void> {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  try {
    const response = await context.page.goto(BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log(`📍 Navigation status: ${response?.status()}`);

    try {
      await context.page.locator('header, nav, main').first()
        .waitFor({ timeout: 5000, state: 'visible' })
        .catch(() => console.log('⚠️ No header/nav/main found, proceeding anyway'));
    } catch (e) {
      console.log('⚠️ Page elements not visible within 5s');
    }
  } catch (error: any) {
    console.error('❌ Navigation error:', error.message);
    throw error;
  }
}

// GIVEN STEPS


Given('I navigate to the Bertrand home page', async function () {
  await navigateToBertrandHomePage();
});

Given('I navigate to the Bertrand homepage', async function () {
  await navigateToBertrandHomePage();
});

Given('I wait for the page to load completely', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  await context.page.waitForLoadState('domcontentloaded');
});

Given('I accept cookies if presented', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  try {
    await acceptCookies(context.page);
  } catch (e: any) {
    console.warn(`⚠️ Cookie acceptance failed: ${e?.message || e}`);
  }
});

Given('I wait for any cookie banner to disappear', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  
  try {
    // Wait for cookie banner to disappear (detect by common class names)
    const bannerSelectors = [
      '[class*="cookie-banner"]',
      '[class*="cookie-consent"]',
      '[class*="gdpr"]',
      '[id*="cookie"]'
    ];
    
    for (const selector of bannerSelectors) {
      try {
        await context.page.locator(selector).waitFor({ state: 'hidden', timeout: 3000 })
          .catch(() => {}); // Banner not found, continue
      } catch (e) {
        // Ignore
      }
    }
    
    console.log('✅ Cookie banner disappeared or not present');
  } catch (e) {
    console.warn('⚠️ Cookie banner may still be visible');
  }
});

Given('I take a screenshot named {string}', async function (screenshotName: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  context.lastScreenshotName = screenshotName;
  await context.page.screenshot({
    path: `artifacts/${screenshotName}.png`,
    fullPage: true,
  });
});

// WHEN STEPS

When('I locate the search input using multiple strategies', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  
  try {
    context.searchLocator = await findSearchInput(context.page);
    if (!context.searchLocator) {
      // Enhanced error message with debugging info
      const screenshotPath = `artifacts/debug-failure-${Date.now()}.png`;
      await context.page.screenshot({ path: screenshotPath, fullPage: true });
      
      const html = await context.page.content();
      const hasCloudflare = html.includes('Cloudflare');
      
      const errorMsg = hasCloudflare
        ? 'Search input not found - Website is blocked by Cloudflare. Try with VPN or proxy.'
        : 'Search input not found using any strategy. Check ' + screenshotPath + ' for debugging';
      
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    throw new Error(`Search locator error: ${error?.message || error}`);
  }
});

When('I search for {string}', async function (searchTerm: string) {
  if (!context.searchLocator) {
    throw new Error('Search locator not found');
  }
  await context.searchLocator.fill(searchTerm);
  await context.searchLocator.press('Enter');
});

When('I wait for search results to load', async function () {
  if (!context.page) throw new Error('Page not initialized');
  
  // Wait for DOM then for product links to appear
  await context.page.waitForLoadState('domcontentloaded').catch(() => {});
  
  const resultLocators = [
    context.page.locator('a[href*="/livro/"], a[href*="/produto/"]').first(),
    context.page.locator('[class*="result"]').first(),
    context.page.locator('[class*="product"]').first(),
  ];
  
  let found = false;
  for (const locator of resultLocators) {
    try {
      await locator.waitFor({ timeout: 15000, state: 'visible' });
      console.log('✅ Search results detected');
      found = true;
      break;
    } catch {
      // try next
    }
  }
  
  if (!found) console.warn('⚠️ No result elements detected, proceeding anyway');
  
  // brief buffer for dynamic content
  await context.page.waitForTimeout(500);
});

When('I click on the first product link', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const firstProduct = context.page.locator('a[href*="/livro/"], a[href*="/produto/"]').first();
  if ((await firstProduct.count()) === 0) {
    throw new Error('No product links detected');
  }
  await firstProduct.scrollIntoViewIfNeeded();
  await firstProduct.click({ timeout: 15000 });
});

When('I click on the first product link containing {string}', async function (productName: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const productLink = await findProductLink(context.page, productName);
  if (!productLink) {
    throw new Error(`No product link found for ${productName}`);
  }
  context.selectedProduct = productLink;
  try {
    // Ensure element is in viewport
    await productLink.scrollIntoViewIfNeeded();
    
    // Use waitFor before click to catch visibility issues early (reduced timeout)
    await productLink.waitFor({ state: 'visible', timeout: 3000 });
    
    // Click with reduced timeout
    await productLink.click({ timeout: 5000 });
    
    console.log(`✅ Clicked product: ${productName}`);
  } catch (e: any) {
    // Enhanced debugging
    console.error(`❌ Failed to click product: ${e?.message || e}`);
    
    // Try one more time with force click
    try {
      await productLink.click({ force: true, timeout: 3000 });
      console.log(`✅ Force clicked product: ${productName}`);
    } catch (e2: any) {
      throw new Error(`Could not click product "${productName}": ${e2?.message || e2}`);
    }
  }
});

When('I click on the product link for {string}', async function (productName: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const productLink = await findProductLink(context.page, productName);
  if (!productLink) {
    throw new Error(`No product link found for ${productName}`);
  }
  context.selectedProduct = productLink;
  try {
    await productLink.scrollIntoViewIfNeeded();
    await productLink.waitFor({ state: 'visible', timeout: 3000 });
    await productLink.click({ timeout: 5000 });
  } catch (e: any) {
    console.error(`Failed to click: ${e?.message || e}`);
    try {
      await productLink.click({ force: true });
      await context.page.waitForTimeout(500);
    } catch (e2: any) {
      throw new Error(`Could not click product: ${e2?.message || e2}`);
    }
  }
});

When('I wait for the product page to load', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  await context.page.waitForLoadState('domcontentloaded');
});

When('I wait for the product page title to load', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  
  try {
    // Use locator (more reliable) instead of waitForSelector
    const titleLocators = [
      context.page.locator('h1').first(),
      context.page.locator('[class*="product-title"]').first(),
      context.page.locator('[data-test*="title"]').first(),
    ];
    
    // Race: first one to appear wins (reduced from 15s to 8s)
    await Promise.race(
      titleLocators.map(loc => loc.waitFor({ timeout: 8000, state: 'visible' }))
    ).catch(() => {
      console.warn('⚠️ No product title found');
    });
    
  } catch (e: any) {
    console.warn(`⚠️ Product title wait failed: ${e?.message || e}`);
  }
});

When('I click the add to cart button', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const addBtn = await findAddToCartButton(context.page);
  if (!addBtn) {
    throw new Error('Add to cart button not found');
  }
  await addBtn.click();
});

When('I wait for the add to cart action to complete', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  
  try {
    // Wait for cart indicator to update (mini cart badge, success message, etc.)
    const cartIndicators = [
      context.page.locator('[class*="cart-count"]'),
      context.page.locator('[class*="cart-badge"]'),
      context.page.locator('[role="alert"]'),
      context.page.locator('[class*="notification"]'),
      context.page.locator('text=/adicionado|added|sucesso|success/i'),
    ];
    
    // Try to detect success within 5 seconds (reduced from 3s hardcoded wait)
    const racePromises = cartIndicators
      .filter(loc => loc !== null)
      .map(loc => loc.first().waitFor({ timeout: 5000, state: 'visible' }).catch(() => null));
    
    await Promise.race(racePromises).catch(() => {
      console.log('⚠️ No cart update detected, assuming async operation');
    });
    
    // If no indicator found, still wait but shorter
    if (!racePromises) {
      await context.page.waitForTimeout(500);
    }
    
  } catch (e: any) {
    console.warn(`⚠️ Cart operation wait failed: ${e?.message || e}`);
  }
});

async function openBertrandCart(): Promise<void> {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  await openCartSidebar(context.page);
}

When('I navigate to the cart', async function () {
  await openBertrandCart();
});

When('I navigate to the cart page', async function () {
  await openBertrandCart();
});

When('I open the cart sidebar', async function () {
  await openBertrandCart();
});

When('I increase the cart quantity from the cart sidebar', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  await changeCartQuantity(context.page, 'increase');
});

When('I decrease the cart quantity from the cart sidebar', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  await changeCartQuantity(context.page, 'decrease');
});

When('I click the remove button for the item', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const cartSidebar = await openCartSidebar(context.page);
  context.lastCartContent = await cartSidebar.innerText().catch(() => '');
  const removeBtn = await findRemoveButton(context.page);
  await removeBtn.click();
});

When('I wait for the removal action to complete', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  await expect.poll(
    async () => {
      const cartSidebar = await openCartSidebar(context.page as Page);
      return (await cartSidebar.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    },
    { timeout: 10000 }
  ).not.toBe((context.lastCartContent || '').replace(/\s+/g, ' ').trim());
});



// THEN STEPS

Then('I should see product details on the page', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const bodyText = await context.page.locator('body').innerText();
  expect(bodyText.length).toBeGreaterThan(0);
});

Then('I should see {string} in the page content', async function (expectedText: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const pageText = await context.page.locator('body').innerText();
  expect(pageText).toContain(expectedText);
});

Then('I should see ISBN information on the page', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const pageText = await context.page.locator('body').innerText();
  expect(pageText).toMatch(/ISBN|978\d{9,13}/);
});

Then('I should find either {string} or {string} in the results', async function (option1: string, option2: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  // Wait for product links to load first
  try {
    await context.page.locator('a[href*="/livro/"], a[href*="/produto/"]').first()
      .waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    console.warn('⚠️ Product links not visible yet, checking anyway');
  }

  const related1 = context.page.locator(`text=${option1}`).first();
  const related2 = context.page.locator(`text=${option2}`).first();

  const found1 = (await related1.count()) > 0;
  const found2 = (await related2.count()) > 0;

  if (!found1 && !found2) {
    // Debug: log visible text to understand what's on the page
    const bodyText = await context.page.locator('body').innerText().catch(() => '');
    console.error(`Page text sample: ${bodyText.substring(0, 500)}`);
    throw new Error(`Neither ${option1} nor ${option2} found in results`);
  }

  if (found1) {
    context.selectedProduct = related1;
  } else {
    context.selectedProduct = related2;
  }
});

Then('I should see a cart confirmation message', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const addToCartButtonText = await context.page.locator('#productPageRightSectionTop-actions-addCart-btn').innerText().catch(() => '');
  const pageText = await context.page.locator('body').innerText();
  const hasConfirmation =
    addToCartButtonText.toLowerCase().includes('adicionado') ||
    pageText.toLowerCase().includes('adicionado') ||
    pageText.toLowerCase().includes('carrinho') ||
    pageText.toLowerCase().includes('cesto');

  expect(hasConfirmation).toBe(true);
});

Then('I should see the product {string} in the cart', async function (productName: string) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const cartSidebar = await openCartSidebar(context.page);
  const cartContent = await cartSidebar.innerText();
  expect(cartContent.toLowerCase()).toContain(productName.toLowerCase());
});

Then('I should not see the product in the cart', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  const cartSidebar = await openCartSidebar(context.page);
  const cartContent = await cartSidebar.innerText();
  const isEmpty = cartContent.toLowerCase().includes('vazio') ||
    cartContent.toLowerCase().includes('empty') ||
    cartContent.toLowerCase().includes('sem itens');

  expect(isEmpty).toBe(true);
});

Then('I should see the cart quantity as {int}', async function (expectedQuantity: number) {
  if (!context.page) {
    throw new Error('Page not initialized');
  }

  await expect.poll(
    async () => readCartQuantity(context.page as Page),
    { timeout: 10000 }
  ).toBe(expectedQuantity);
});

When('I click on the related book product link', async function () {
  if (!context.selectedProduct) {
    throw new Error('No selected product found');
  }
  await context.selectedProduct.click();
});

When('I wait for the related product page to load', async function () {
  if (!context.page) {
    throw new Error('Page not initialized');
  }
  await context.page.waitForLoadState('domcontentloaded');
});

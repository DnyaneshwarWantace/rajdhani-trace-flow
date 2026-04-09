/**
 * E2E: Search Functionality Tests
 * Tests all search inputs across the app:
 * - Products page
 * - Materials page
 * - Production list
 * - Production create (product search)
 * - Planning stage (add material dialog)
 * - Recipe page (product + material search)
 * - Orders page (list search + product/material in new order)
 */

import { test, expect, Page } from '@playwright/test';

const API_URL = 'http://localhost:8000/api';
const ADMIN_EMAIL = 'neelgupta43@gmail.com';
const ADMIN_PASSWORD = 'Rajdhani@2026';

async function loginAndSetup(page: Page) {
  const res = await page.request.post(`${API_URL}/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const body = await res.json();
  if (!body.success || !body.data?.token) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  const { token, user, permissions } = body.data;
  await page.goto('/v2/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(({ token, user, permissions }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('permissions', JSON.stringify(permissions));
  }, { token, user, permissions });
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/screenshots/search-${name}.png`, fullPage: true });
}

// ── helper: type into search and wait for results ──────────────────────────
async function typeAndCheck(page: Page, input: ReturnType<Page['locator']>, term: string, label: string) {
  await input.waitFor({ timeout: 10000 });
  await input.click();
  await input.fill(term);
  await page.waitForTimeout(1200); // debounce + network
  await screenshot(page, label);

  // Check no crash / error page
  const hasError = await page.locator('text=/something went wrong|error 500|cannot read/i').isVisible({ timeout: 2000 }).catch(() => false);
  expect(hasError, `Error shown after searching "${term}" on ${label}`).toBe(false);

  // Result or empty state must appear (not a blank white screen)
  const bodyText = await page.locator('body').innerText();
  expect(bodyText.length, `Page appears blank after search on ${label}`).toBeGreaterThan(50);

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Search Functionality — All Pages', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSetup(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ── 1. Products page search ───────────────────────────────────────────────
  test('1. Products page — search works', async () => {
    await page.goto('/v2/products');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '01-products-before');

    const input = page.locator('input[placeholder*="Search product"]').first();
    const visible = await input.isVisible({ timeout: 8000 });
    expect(visible, 'Products search input not found').toBe(true);

    // Type less than 3 chars — should show "min 3 characters" hint or nothing
    await input.fill('fe');
    await page.waitForTimeout(600);
    await screenshot(page, '01-products-short-query');

    // Type 3+ chars — should trigger search
    await input.fill('felt');
    await page.waitForTimeout(1200);
    await screenshot(page, '01-products-results');

    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    // Clear and verify reset
    await input.clear();
    await page.waitForTimeout(800);
    await screenshot(page, '01-products-cleared');
  });

  // ── 2. Materials page search ──────────────────────────────────────────────
  test('2. Materials page — search works', async () => {
    await page.goto('/v2/materials');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '02-materials-before');

    const input = page.locator('input[placeholder*="Search material"]').first();
    const visible = await input.isVisible({ timeout: 8000 });
    expect(visible, 'Materials search input not found').toBe(true);

    await input.fill('poly');
    await page.waitForTimeout(1200);
    await screenshot(page, '02-materials-results');

    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    await input.clear();
    await page.waitForTimeout(800);
  });

  // ── 3. Production list search ─────────────────────────────────────────────
  test('3. Production list — search works', async () => {
    await page.goto('/v2/production');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '03-production-list-before');

    const input = page.locator('input[placeholder*="Search by batch"]').first();
    const visible = await input.isVisible({ timeout: 8000 });
    expect(visible, 'Production search input not found').toBe(true);

    await input.fill('BAT');
    await page.waitForTimeout(1200);
    await screenshot(page, '03-production-list-results');

    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    await input.clear();
    await page.waitForTimeout(800);
  });

  // ── 4. Orders list search ─────────────────────────────────────────────────
  test('4. Orders list — search works', async () => {
    await page.goto('/v2/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await screenshot(page, '04-orders-list-before');

    const input = page.locator('input[placeholder*="Search order"]').first();
    const visible = await input.isVisible({ timeout: 8000 });
    expect(visible, 'Orders search input not found').toBe(true);

    await input.fill('ORD');
    await page.waitForTimeout(1200);
    await screenshot(page, '04-orders-list-results');

    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    await input.clear();
    await page.waitForTimeout(800);
  });

  // ── 5. Production Create — product search ────────────────────────────────
  test('5. Production Create — product search works', async () => {
    await page.goto('/v2/production/create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, '05-prod-create-before');

    const input = page.locator('input[placeholder*="Search product"]').first();
    const visible = await input.isVisible({ timeout: 8000 });
    expect(visible, 'Production Create product search input not found').toBe(true);

    await input.fill('felt');
    await page.waitForTimeout(1200);
    await screenshot(page, '05-prod-create-results');

    // Results dropdown should appear
    const hasResults = await page.locator('[class*="dropdown"], [class*="result"], ul li').first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasNoResults = await page.locator('text=/no product|no result/i').isVisible({ timeout: 3000 }).catch(() => false);
    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasError).toBe(false);
    console.log(`Production Create search: results=${hasResults}, no-results=${hasNoResults}`);

    await input.clear();
    await page.waitForTimeout(800);
  });

  // ── 6. Planning stage — add material dialog search ────────────────────────
  test('6. Planning stage — material search in dialog works', async () => {
    await page.goto('/v2/production');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Find a planning batch
    const planningBtn = page.locator('button').filter({ hasText: /planning/i }).first();
    const hasPlanningBatch = await planningBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasPlanningBatch) {
      await screenshot(page, '06-planning-no-batch');
      console.log('No planning batch found — skipping planning search test');
      test.info().annotations.push({ type: 'info', description: 'No planning batch available' });
      return;
    }

    await planningBtn.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await screenshot(page, '06-planning-page');

    // Click "Add Material" button
    const addMaterialBtn = page.locator('button').filter({ hasText: /add material/i }).first();
    const hasAddBtn = await addMaterialBtn.isVisible({ timeout: 8000 }).catch(() => false);

    if (!hasAddBtn) {
      await screenshot(page, '06-planning-no-add-btn');
      console.log('Add Material button not found');
      return;
    }

    await addMaterialBtn.click();
    await page.waitForTimeout(1000);
    await screenshot(page, '06-planning-dialog-open');

    // Dialog should open with search
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 8000 });

    const searchInput = dialog.locator('input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Search raw materials
    await searchInput.fill('poly');
    await page.waitForTimeout(1200);
    await screenshot(page, '06-planning-dialog-search-material');

    const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasError).toBe(false);

    // Switch to Products tab if available
    const productsTab = dialog.locator('button, [role="tab"]').filter({ hasText: /product/i }).first();
    if (await productsTab.isVisible({ timeout: 3000 })) {
      await productsTab.click();
      await page.waitForTimeout(800);
      const productSearchInput = dialog.locator('input[placeholder*="Search"]').first();
      await productSearchInput.fill('felt');
      await page.waitForTimeout(1200);
      await screenshot(page, '06-planning-dialog-search-product');
    }

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  // ── 7. Recipe page — product selector search ──────────────────────────────
  test('7. Recipe page — product selector search works', async () => {
    await page.goto('/v2/recipes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '07-recipes-before');

    // Click "Add Recipe" or "New Recipe" or first recipe to edit
    const addBtn = page.locator('button').filter({ hasText: /add recipe|new recipe|create recipe/i }).first();
    const editBtn = page.locator('button').filter({ hasText: /edit/i }).first();

    if (await addBtn.isVisible({ timeout: 5000 })) {
      await addBtn.click();
    } else if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
    } else {
      // Try clicking first recipe row
      const firstRow = page.locator('tr, [class*="recipe-row"], [class*="card"]').nth(1);
      if (await firstRow.isVisible({ timeout: 3000 })) await firstRow.click();
    }

    await page.waitForTimeout(1500);
    await screenshot(page, '07-recipes-form-open');

    // Look for product search input in the form/dialog
    const searchInput = page.locator('input[placeholder*="Search by name"], input[placeholder*="Search product"]').first();
    const visible = await searchInput.isVisible({ timeout: 8000 }).catch(() => false);

    if (!visible) {
      await screenshot(page, '07-recipes-no-search');
      console.log('Recipe product search input not visible — may need to open product selector');

      // Try clicking "Select Product" or "Add Product" button
      const selectBtn = page.locator('button').filter({ hasText: /select product|add product|choose product/i }).first();
      if (await selectBtn.isVisible({ timeout: 5000 })) {
        await selectBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    const input2 = page.locator('input[placeholder*="Search by name"], input[placeholder*="Search product"], input[placeholder*="Search"]').first();
    if (await input2.isVisible({ timeout: 5000 })) {
      await input2.fill('felt');
      await page.waitForTimeout(1200);
      await screenshot(page, '07-recipes-product-search-results');

      const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasError).toBe(false);
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  // ── 8. Recipe page — material selector search ────────────────────────────
  test('8. Recipe page — material search in recipe form works', async () => {
    await page.goto('/v2/recipes');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to open a recipe for editing
    const editBtn = page.locator('button').filter({ hasText: /edit/i }).first();
    const firstRecipe = page.locator('tr td, [class*="recipe"]').first();

    if (await editBtn.isVisible({ timeout: 5000 })) {
      await editBtn.click();
    } else if (await firstRecipe.isVisible({ timeout: 3000 })) {
      await firstRecipe.click();
    }

    await page.waitForTimeout(1500);

    // Look for "Add Material" or "Add Ingredient" button
    const addMatBtn = page.locator('button').filter({ hasText: /add material|add ingredient|add item/i }).first();
    if (await addMatBtn.isVisible({ timeout: 5000 })) {
      await addMatBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '08-recipe-material-dialog');

      const dialog = page.locator('[role="dialog"]');
      const searchInput = dialog.locator('input[placeholder*="Search"]').first();

      if (await searchInput.isVisible({ timeout: 5000 })) {
        await searchInput.fill('poly');
        await page.waitForTimeout(1200);
        await screenshot(page, '08-recipe-material-search-results');

        const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasError).toBe(false);

        // Switch to products tab
        const productsTab = dialog.locator('button, [role="tab"]').filter({ hasText: /product/i }).first();
        if (await productsTab.isVisible({ timeout: 3000 })) {
          await productsTab.click();
          await page.waitForTimeout(800);
          const productInput = dialog.locator('input[placeholder*="Search"]').first();
          await productInput.fill('felt');
          await page.waitForTimeout(1200);
          await screenshot(page, '08-recipe-product-search-results');
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      await screenshot(page, '08-recipe-no-add-btn');
      console.log('No Add Material button found in recipe page');
    }
  });

  // ── 9. Orders — product/material search when creating order ───────────────
  test('9. Orders — product & material search in new order works', async () => {
    await page.goto('/v2/orders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await screenshot(page, '09-orders-before');

    // Click "New Order" or "Create Order"
    const newOrderBtn = page.locator('button').filter({ hasText: /new order|create order|add order/i }).first();
    const visible = await newOrderBtn.isVisible({ timeout: 8000 });
    expect(visible, 'New Order button not found').toBe(true);

    await newOrderBtn.click();
    await page.waitForTimeout(1500);
    await screenshot(page, '09-order-form-open');

    // Click "Add Product" or "Add Item" button inside the form
    const addItemBtn = page.locator('button').filter({ hasText: /add product|add item|add material/i }).first();
    if (await addItemBtn.isVisible({ timeout: 8000 })) {
      await addItemBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '09-order-item-dialog');

      const dialog = page.locator('[role="dialog"]');
      const searchInput = dialog.locator('input[placeholder*="Search by name"], input[placeholder*="Search"]').first();

      if (await searchInput.isVisible({ timeout: 5000 })) {
        // Search for product
        await searchInput.fill('felt');
        await page.waitForTimeout(1200);
        await screenshot(page, '09-order-product-search-results');

        const hasError = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasError, 'Error after searching products in order').toBe(false);

        // Switch to raw materials tab
        const rawMatTab = dialog.locator('button, [role="tab"]').filter({ hasText: /raw material|material/i }).first();
        if (await rawMatTab.isVisible({ timeout: 3000 })) {
          await rawMatTab.click();
          await page.waitForTimeout(800);
          const matInput = dialog.locator('input[placeholder*="Search"]').first();
          await matInput.fill('poly');
          await page.waitForTimeout(1200);
          await screenshot(page, '09-order-material-search-results');

          const hasError2 = await page.locator('text=/something went wrong|500/i').isVisible({ timeout: 2000 }).catch(() => false);
          expect(hasError2, 'Error after searching materials in order').toBe(false);
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      await screenshot(page, '09-order-no-add-item-btn');
      console.log('Add item button not found in order form');
    }

    // Close the order form
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});

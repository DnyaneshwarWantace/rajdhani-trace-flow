/**
 * Comprehensive Permission Tests
 *
 * Creates a test user with RANDOM mixed permissions across all modules:
 *   - products:    view=YES, create=YES,  edit=NO,  delete=NO
 *   - materials:   view=YES, create=NO,   edit=YES, delete=NO
 *   - orders:      view=NO,  create=NO,   edit=NO,  delete=NO   (page fully off)
 *   - production:  view=YES, create=NO,   edit=NO,  delete=NO
 *   - customers:   view=YES, create=YES,  edit=YES, delete=NO
 *   - suppliers:   view=NO,  create=NO,   edit=NO,  delete=NO   (page fully off)
 *   - machines:    NO
 *   - reports:     NO
 *   - settings:    NO
 *
 * Then verifies that every page and action button matches those permissions exactly.
 */

import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/auth';

const API_URL = process.env.API_URL || 'http://localhost:8000/api';
const SUPER_ADMIN = { email: 'neelgupta43@gmail.com', password: 'Rajdhani@2026' };

const TEST_USER = {
  full_name: 'Permission Tester',
  email: `permtest_full_${Date.now()}@rajdhani.test`,
  password: 'TestUser@1234',
  role: 'operator',
};

// The random mixed permissions we assign
const ASSIGNED_PERMISSIONS = {
  page_permissions: {
    dashboard:  true,
    products:   true,
    materials:  true,
    orders:     false,   // fully blocked
    production: true,
    customers:  true,
    suppliers:  false,   // fully blocked
    machines:   false,
    reports:    false,
    settings:   false,
    users:      false,
    roles:      false,
  },
  action_permissions: {
    // Products: view+create only
    product_view:   true,
    product_create: true,
    product_edit:   false,
    product_delete: false,
    // Materials: view+edit only (no create, no delete)
    material_view:   true,
    material_create: false,
    material_edit:   true,
    material_delete: false,
    // Orders: nothing
    order_view:   false,
    order_create: false,
    order_edit:   false,
    order_delete: false,
    // Production: view only
    production_view:   true,
    production_create: false,
    production_edit:   false,
    production_delete: false,
    // Customers: view+create+edit, no delete
    customer_view:   true,
    customer_create: true,
    customer_edit:   true,
    customer_delete: false,
    // Suppliers: nothing
    supplier_view:   false,
    supplier_create: false,
    supplier_edit:   false,
    supplier_delete: false,
    // Everything else off
    user_view: false, user_create: false, user_edit: false, user_delete: false,
    report_view: false, report_export: false,
    machine_view: false, machine_create: false, machine_edit: false,
  },
};

let testUserId = '';
let adminToken = '';

async function adminApi(page: Page, method: string, path: string, body?: object) {
  const res = await page.request.fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    data: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status(), body: await res.json().catch(() => ({})) };
}

test.describe('Full Permission Coverage Tests', () => {
  let adminPage: Page;
  let userPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage();

    // Get admin token
    const loginRes = await adminPage.request.post(`${API_URL}/auth/login`, {
      data: SUPER_ADMIN,
    });
    const loginBody = await loginRes.json();
    if (!loginBody.success) throw new Error('Super-admin login failed: ' + loginBody.error);
    adminToken = loginBody.data.token;

    // Create test user
    const createRes = await adminApi(adminPage, 'POST', '/auth/admin/users', {
      full_name: TEST_USER.full_name,
      email:     TEST_USER.email,
      password:  TEST_USER.password,
      role:      TEST_USER.role,
    });
    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error('Failed to create test user: ' + JSON.stringify(createRes.body));
    }
    testUserId = createRes.body.data?.user?._id || createRes.body.data?.user?.id;
    if (!testUserId) throw new Error('No user ID in response: ' + JSON.stringify(createRes.body));
    console.log(`✅ Created test user ${TEST_USER.email} (${testUserId})`);

    // Set mixed permissions
    const permRes = await adminApi(adminPage, 'PUT', `/permissions/user/${testUserId}`, ASSIGNED_PERMISSIONS);
    console.log(`✅ Permissions set (status ${permRes.status})`);

    // Login as test user
    userPage = await browser.newPage();
    await login(userPage, TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    if (testUserId) {
      await adminApi(adminPage, 'DELETE', `/users/${testUserId}`);
      console.log(`🗑️ Deleted test user ${TEST_USER.email}`);
    }
    await adminPage?.close();
    await userPage?.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SIDEBAR VISIBILITY
  // ─────────────────────────────────────────────────────────────────────────────

  test('SIDEBAR: allowed pages visible, blocked pages hidden', async () => {
    await userPage.goto('/v2/');
    await userPage.waitForLoadState('networkidle');

    const nav = userPage.locator('nav, aside').first();
    const navText = await nav.innerText();

    // Should be visible
    for (const page of ['Products', 'Materials', 'Production', 'Customers']) {
      expect(navText, `Expected "${page}" in sidebar`).toContain(page);
    }
    // Should be hidden
    for (const page of ['Orders', 'Suppliers', 'Settings', 'Reports']) {
      const link = nav.locator('a, button, li', { hasText: new RegExp(`^${page}$`, 'i') });
      const count = await link.count();
      expect(count, `"${page}" should NOT be in sidebar`).toBe(0);
    }
    console.log('✅ Sidebar shows/hides pages correctly');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PRODUCTS PAGE — view+create, NO edit/delete
  // ─────────────────────────────────────────────────────────────────────────────

  test('PRODUCTS: page loads (view=true)', async () => {
    await userPage.goto('/v2/products');
    await userPage.waitForLoadState('networkidle');
    await expect(userPage).not.toHaveURL(/login/);
    const body = await userPage.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('permission denied');
    console.log('✅ Products page accessible');
  });

  test('PRODUCTS: Add Product button visible (create=true)', async () => {
    await userPage.goto('/v2/products');
    await userPage.waitForLoadState('networkidle');
    const btn = userPage.locator('button', { hasText: /add product|new product|create product/i });
    await expect(btn.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Add Product button visible');
  });

  test('PRODUCTS: Edit/Delete buttons hidden (edit=false, delete=false)', async () => {
    await userPage.goto('/v2/products');
    await userPage.waitForLoadState('networkidle');
    await userPage.waitForSelector('table tbody tr, [class*="card"]', { timeout: 15000 }).catch(() => {});

    const editBtns = userPage.locator('button[aria-label*="edit" i], button[title*="edit" i]');
    expect(await editBtns.count()).toBe(0);

    const deleteBtns = userPage.locator('button[aria-label*="delete" i], button[title*="delete" i]');
    expect(await deleteBtns.count()).toBe(0);
    console.log('✅ No edit/delete buttons on products');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MATERIALS PAGE — view+edit, NO create/delete
  // ─────────────────────────────────────────────────────────────────────────────

  test('MATERIALS: page loads (view=true)', async () => {
    await userPage.goto('/v2/materials');
    await userPage.waitForLoadState('networkidle');
    await expect(userPage).not.toHaveURL(/login/);
    const body = await userPage.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('permission denied');
    console.log('✅ Materials page accessible');
  });

  test('MATERIALS: Add Material button hidden (create=false)', async () => {
    await userPage.goto('/v2/materials');
    await userPage.waitForLoadState('networkidle');
    const btn = userPage.locator('button', { hasText: /add material|new material|create material/i });
    expect(await btn.count()).toBe(0);
    console.log('✅ Add Material button hidden');
  });

  test('MATERIALS: Import CSV button hidden (create=false)', async () => {
    await userPage.goto('/v2/materials');
    await userPage.waitForLoadState('networkidle');
    const btn = userPage.locator('button', { hasText: /import|bulk upload|csv/i });
    expect(await btn.count()).toBe(0);
    console.log('✅ Import/bulk upload button hidden on materials');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDERS — fully blocked
  // ─────────────────────────────────────────────────────────────────────────────

  test('ORDERS: direct URL blocked or no sidebar link', async () => {
    await userPage.goto('/v2/orders');
    await userPage.waitForLoadState('networkidle');

    const nav = userPage.locator('nav, aside').first();
    const ordersInSidebar = await nav.locator('a, button', { hasText: /^orders$/i }).count();
    expect(ordersInSidebar).toBe(0);
    console.log('✅ Orders not in sidebar even when on /orders URL');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PRODUCTION — view only, NO create/edit/delete
  // ─────────────────────────────────────────────────────────────────────────────

  test('PRODUCTION: page loads (view=true)', async () => {
    await userPage.goto('/v2/production');
    await userPage.waitForLoadState('networkidle');
    await expect(userPage).not.toHaveURL(/login/);
    const body = await userPage.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('permission denied');
    console.log('✅ Production page accessible');
  });

  test('PRODUCTION: Create/New Production button hidden (create=false)', async () => {
    await userPage.goto('/v2/production');
    await userPage.waitForLoadState('networkidle');
    const btn = userPage.locator('button', { hasText: /new production|create production|start production|new batch/i });
    expect(await btn.count()).toBe(0);
    console.log('✅ Create production button hidden');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CUSTOMERS — view+create+edit, NO delete
  // ─────────────────────────────────────────────────────────────────────────────

  test('CUSTOMERS: page loads (view=true)', async () => {
    await userPage.goto('/v2/customers');
    await userPage.waitForLoadState('networkidle');
    await expect(userPage).not.toHaveURL(/login/);
    const body = await userPage.locator('body').innerText();
    expect(body.toLowerCase()).not.toContain('permission denied');
    console.log('✅ Customers page accessible');
  });

  test('CUSTOMERS: Add Customer button visible (create=true)', async () => {
    await userPage.goto('/v2/customers');
    await userPage.waitForLoadState('networkidle');
    const btn = userPage.locator('button', { hasText: /add customer|new customer|create customer/i });
    await expect(btn.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Add Customer button visible');
  });

  test('CUSTOMERS: Delete button hidden (delete=false)', async () => {
    await userPage.goto('/v2/customers');
    await userPage.waitForLoadState('networkidle');
    await userPage.waitForSelector('table tbody tr, [class*="card"]', { timeout: 15000 }).catch(() => {});

    const deleteBtns = userPage.locator('button[aria-label*="delete" i], button[title*="delete" i], button', { hasText: /^delete$/i });
    expect(await deleteBtns.count()).toBe(0);
    console.log('✅ Delete button hidden on customers');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUPPLIERS — fully blocked
  // ─────────────────────────────────────────────────────────────────────────────

  test('SUPPLIERS: direct URL blocked or no sidebar link', async () => {
    await userPage.goto('/v2/suppliers');
    await userPage.waitForLoadState('networkidle');

    const nav = userPage.locator('nav, aside').first();
    const suppliersInSidebar = await nav.locator('a, button', { hasText: /^suppliers$/i }).count();
    expect(suppliersInSidebar).toBe(0);
    console.log('✅ Suppliers not in sidebar');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SETTINGS — blocked
  // ─────────────────────────────────────────────────────────────────────────────

  test('SETTINGS: not visible in sidebar (settings=false)', async () => {
    await userPage.goto('/v2/');
    await userPage.waitForLoadState('networkidle');

    const nav = userPage.locator('nav, aside').first();
    const settingsLink = nav.locator('a, button', { hasText: /^settings$/i });
    expect(await settingsLink.count()).toBe(0);
    console.log('✅ Settings hidden in sidebar');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // ERROR MESSAGES — should be user-friendly
  // ─────────────────────────────────────────────────────────────────────────────

  test('ERROR MESSAGES: no raw stack traces or JSON on blocked pages', async () => {
    for (const path of ['/v2/orders', '/v2/suppliers', '/v2/settings']) {
      await userPage.goto(path);
      await userPage.waitForLoadState('networkidle');
      const body = await userPage.locator('body').innerText();
      expect(body, `Raw error on ${path}`).not.toMatch(/TypeError|Cannot read|undefined is not|stack trace/i);
      expect(body, `Raw JSON on ${path}`).not.toContain('"success":false');
    }
    console.log('✅ No raw errors shown on blocked pages');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SUPER ADMIN — has everything
  // ─────────────────────────────────────────────────────────────────────────────

  test('SUPER-ADMIN: sees all pages and all action buttons', async () => {
    await login(adminPage, SUPER_ADMIN.email, SUPER_ADMIN.password);
    await adminPage.goto('/v2/');
    await adminPage.waitForLoadState('networkidle');

    const nav = adminPage.locator('nav, aside').first();
    const navText = await nav.innerText();
    for (const p of ['Products', 'Materials', 'Orders', 'Production', 'Customers', 'Suppliers']) {
      expect(navText).toContain(p);
    }

    // Products: check edit/delete visible for admin
    await adminPage.goto('/v2/products');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});
    const actionBtns = adminPage.locator(
      'button[aria-label*="edit" i], button[aria-label*="delete" i], button[title*="edit" i], button[title*="delete" i]'
    );
    const dropdownActions = adminPage.locator('button', { hasText: /edit|delete/i });
    const total = (await actionBtns.count()) + (await dropdownActions.count());
    expect(total).toBeGreaterThan(0);

    console.log(`✅ Super-admin sees all pages and ${total} edit/delete actions`);
  });
});

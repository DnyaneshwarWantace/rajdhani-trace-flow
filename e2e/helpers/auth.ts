import { Page } from '@playwright/test';

export const TEST_ADMIN = {
  email: process.env.TEST_ADMIN_EMAIL || 'neelgupta43@gmail.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'Rajdhani@2026',
};

export const TEST_OPERATOR = {
  email: process.env.TEST_OPERATOR_EMAIL || 'neelgupta43@gmail.com',
  password: process.env.TEST_OPERATOR_PASSWORD || 'Rajdhani@2026',
};

const API_URL = process.env.API_URL || 'http://localhost:8000/api';

/**
 * Login via API call and inject token into localStorage — much faster than UI login.
 */
export async function login(page: Page, email: string, password: string) {
  // Get token from API directly
  const response = await page.request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  const body = await response.json();

  if (!body.success || !body.data?.token) {
    throw new Error(`Login failed for ${email}: ${body.error || 'unknown error'}`);
  }

  const { token, user, permissions } = body.data;

  // Navigate to the app root first so localStorage is set in the right origin
  await page.goto('/v2/');
  await page.waitForLoadState('domcontentloaded');

  // Inject auth state into localStorage
  await page.evaluate(
    ({ token, user, permissions }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('permissions', JSON.stringify(permissions));
    },
    { token, user, permissions }
  );

  // Reload so the app picks up the auth state
  await page.reload();
  await page.waitForLoadState('networkidle');
}

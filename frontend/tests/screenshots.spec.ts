import { test, expect } from '@playwright/test';

test.describe('Application Screenshots', () => {
  const BASE_URL = 'http://localhost:3000';

  test('Dashboard Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/01_dashboard.png', fullPage: true });
  });

  test('Subscriptions Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscriptions`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/02_subscriptions.png', fullPage: true });
  });

  test('Add Subscription Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/subscriptions/add`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/03_add_subscription.png', fullPage: true });
  });

  test('Expenses Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/expenses`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/04_expenses.png', fullPage: true });
  });

  test('Add Expense Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/expenses/add`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/05_add_expense.png', fullPage: true });
  });

  test('Insights Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/insights`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/06_insights.png', fullPage: true });
  });

  test('Profile Page', async ({ page }) => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForTimeout(2000); // Wait for 2 seconds
    await page.screenshot({ path: 'tests/screenshots/07_profile.png', fullPage: true });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display main elements', async ({ page }) => {
    await page.goto('/');

    // Check main heading
    await expect(page.locator('h1')).toContainText('Backend Infrastructure');
    
    // Check CTA buttons
    await expect(page.getByRole('button', { name: /Start Building Free/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /View Pricing/i })).toBeVisible();
    
    // Check navigation
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should navigate to dashboard when clicking CTA', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: /Start Building Free/i }).click();
    
    // Should redirect to dashboard or auth
    await expect(page).toHaveURL(/\/(dashboard|auth)/);
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');
    
    await page.getByRole('button', { name: /View Pricing/i }).click();
    
    await expect(page).toHaveURL('/pricing');
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');
    
    // Check feature cards
    await expect(page.getByText('AI Schema Generation')).toBeVisible();
    await expect(page.getByText('Smart Caching')).toBeVisible();
    await expect(page.getByText('Auth Templates')).toBeVisible();
    await expect(page.getByText('Direct Deployment')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Mobile menu should be visible
    await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    
    // Content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
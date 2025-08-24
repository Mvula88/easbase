import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/auth/login');
    
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('should navigate to signup', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByText(/don't have an account/i).click();
    
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should handle forgot password flow', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.getByText(/forgot password/i).click();
    
    await expect(page).toHaveURL('/auth/forgot-password');
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Use test credentials
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('testpassword123');
    
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Should redirect to dashboard after successful login
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });
});
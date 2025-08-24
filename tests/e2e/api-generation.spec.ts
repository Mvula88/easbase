import { test, expect } from '@playwright/test';

test.describe('Schema Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
  });

  test('should generate schema from prompt', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to schema generator
    await page.getByRole('button', { name: /generate schema/i }).click();
    
    // Enter prompt
    const promptInput = page.getByPlaceholder(/describe your application/i);
    await promptInput.fill('E-commerce platform with products and orders');
    
    // Generate
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Wait for result
    await expect(page.getByText(/schema generated successfully/i)).toBeVisible({
      timeout: 30000
    });
    
    // Check if SQL is displayed
    await expect(page.getByText(/CREATE TABLE/i)).toBeVisible();
  });

  test('should use cached result for similar prompts', async ({ page }) => {
    await page.goto('/dashboard');
    
    // First generation
    await page.getByRole('button', { name: /generate schema/i }).click();
    await page.getByPlaceholder(/describe your application/i).fill('Social network with posts');
    await page.getByRole('button', { name: /generate/i }).click();
    
    await page.waitForSelector('[data-testid="generation-complete"]');
    
    // Second generation with similar prompt
    await page.getByPlaceholder(/describe your application/i).clear();
    await page.getByPlaceholder(/describe your application/i).fill('Social network with posts and comments');
    await page.getByRole('button', { name: /generate/i }).click();
    
    // Should show cached indicator
    await expect(page.getByText(/retrieved from cache/i)).toBeVisible({
      timeout: 5000
    });
  });

  test('should deploy schema to project', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Assume schema is already generated
    await page.getByRole('button', { name: /deploy/i }).click();
    
    // Select project
    await page.getByRole('combobox', { name: /select project/i }).click();
    await page.getByRole('option', { name: /test project/i }).click();
    
    // Confirm deployment
    await page.getByRole('button', { name: /confirm deploy/i }).click();
    
    // Wait for deployment
    await expect(page.getByText(/deployment successful/i)).toBeVisible({
      timeout: 20000
    });
  });
});
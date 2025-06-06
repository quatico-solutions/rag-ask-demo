import { test, expect } from '@playwright/test';

test('ask form returns mock answer and shows debug info', async ({ page }) => {
  await page.goto('/?data=example-fruits');
  await page.fill('input[name="question"]', 'Test question');
  await page.click('input[type="submit"]');
  await expect(page.locator('h1')).toHaveText('Q: Test question');
  await expect(page.locator('blockquote')).toHaveText('Hello from mock');
  await page.click('details:has-text("Request") summary');
  const debugText = await page.locator('details:has-text("Request") pre').innerText();
  const debug = JSON.parse(debugText);
  expect(debug.request.model).toBe('gpt-3.5-turbo');
  expect(debug.completion.choices[0].message.content).toBe('Hello from mock');
  expect(Array.isArray(debug.relevantDocs)).toBeTruthy();
  expect(debug.relevantDocs.length).toBeGreaterThan(0);
});
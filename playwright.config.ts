import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:8787',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: 'USE_MOCK_OPENAI=true tsx src/server.ts',
    url: 'http://localhost:8787',
    timeout: 120 * 1000,
    reuseExistingServer: false,
  },
});
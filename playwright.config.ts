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
    // Start the server directly without nodemon to avoid kill permission issues
    command: 'USE_MOCK_OPENAI=true tsx src/server.ts',
    url: 'http://localhost:8787',
    timeout: 120 * 1000,
    // Always start a fresh server to avoid permission issues
    reuseExistingServer: false,
  },
});
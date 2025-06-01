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
    command: 'cross-env USE_MOCK_OPENAI=true AI_COMPLETION_PROVIDER=openai AI_COMPLETION_MODEL=gpt-3.5-turbo AI_EMBEDDING_PROVIDER=openai AI_EMBEDDING_MODEL=text-embedding-ada-002 OPENAI_API_KEY=test-key tsx src/server.ts',
    url: 'http://localhost:8787',
    timeout: 120 * 1000,
    reuseExistingServer: false,
  },
});
# bitbucket-pull-request-rag

A minimal OpenAI Retrieval-Augmented Generation (RAG) semantic search demo using Node.js, TypeScript, Hono, and OpenAI embeddings & completions.

## Running the App

1. **Install dependencies**
   ```sh
   pnpm install
   # or
   npm install
   ```

2. **Set your OpenAI API key**
   ```sh
   export OPENAI_API_KEY=sk-...
   ```

3. **Run the server with native TypeScript**
   ```sh
   node --import tsx src/server.ts
   ```

4. **Open** [http://localhost:8787](http://localhost:8787) **in your browser.**
   - You’ll see a form to submit a question (all UI is native HTML, no styling).
   - After submitting a question, you’ll see the answer and the most relevant example passages from the in-memory dataset.

**No Vite/dev web frontend.** All logic runs in Node using the Hono web server and OpenAI API.

## Available Scripts

- `pnpm dev` - start development server (with hot-reloading via nodemon)
- `pnpm build` - build for production
- `pnpm serve` - preview production build
- `pnpm type-check` - run TypeScript compiler in noEmit mode
- `pnpm lint` - run ESLint
- `pnpm format` - run Prettier formatting
- `pnpm test` - run Jest tests
- `pnpm test:e2e` - run Playwright end-to-end tests with mocked OpenAI responses

## End-to-End Tests

Playwright is used for E2E testing with a mocked OpenAI API. Tests start the server automatically.

1. Install dependencies and Playwright browsers:
   ```sh
   pnpm install
   npx playwright install
   ```
2. Run E2E tests:
   ```sh
   pnpm test:e2e
   ```

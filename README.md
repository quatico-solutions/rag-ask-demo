# RAG Ask Demo

Demo and starter kit for a RAG application using OpenAI's API and Hono.js

## Features

- Semantic search
- Retrieval-Augmented Generation (RAG)
- OpenAI embeddings & completions
- Hono.js

## Running the App

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Set your OpenAI API key**

   ```sh
   export OPENAI_API_KEY=sk-...
   ```

3. **Run the server with watching and hot-reloading**

   ```sh
   pnpm run dev
   ```

4. **Open** [http://localhost:8787](http://localhost:8787) **in your browser.**
   - You’ll see a form to submit a question (all UI is native HTML, no styling).
   - After submitting a question, you’ll see the answer and the most relevant example passages from the in-memory dataset.

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

1. Run E2E tests:

   ```sh
   pnpm test:e2e
   ```

# RAG Ask Demo

Demo and starter kit for a RAG application using OpenAI's API and Hono.js

## How This Demo Works

This application demonstrates a complete Retrieval-Augmented Generation (RAG) pipeline that allows users to ask questions about custom datasets. Here's how it works:

### AI Integration & RAG Setup

The demo implements semantic search using OpenAI's embedding and completion APIs, following the principles outlined in [OpenAI's Retrieval Guide](https://platform.openai.com/docs/guides/retrieval#semantic-search).

**RAG Pipeline:**
1. **Document Embedding**: All documents in a dataset are converted to embeddings using OpenAI's `text-embedding-ada-002` model
2. **Query Processing**: User questions are embedded using the same model
3. **Semantic Search**: The system finds the most relevant documents using cosine similarity between embeddings
4. **Context Injection**: Relevant documents are injected into a prompt template as context
5. **AI Generation**: OpenAI's `gpt-3.5-turbo` generates responses based on the context and question

**Key AI Components:**
- **Embeddings**: Convert text to vector representations for semantic similarity
- **Semantic Search**: Find relevant documents without exact keyword matching
- **Prompt Engineering**: System prompts guide the AI's behavior and response style
- **Context Window Management**: Only the most relevant documents are included to stay within token limits

### Dataset Structure

Each dataset is a folder in the `data/` directory containing three files:

```
data/
├── example-fruits/
│   ├── docs.md           # Documents separated by ***
│   ├── system-prompt.md  # AI behavior instructions
│   └── user-template.md  # Message template with {{context}} and {{question}} placeholders
├── example-nodejs/
│   ├── docs.md
│   ├── system-prompt.md
│   └── user-template.md
└── ...
```

**Document Format (`docs.md`):**
Documents are stored in markdown format, separated by `***` lines. YAML frontmatter is automatically stripped.

```markdown
---
description: "Example dataset"
---

First document content here.

***

Second document with more information.

***

Third document about something else.
```

### Customizing Data Loading

The data loading system is modular and extensible. The core types are:

```typescript
/**
 * Abstract base class for loading documents from various sources.
 * Implement this class to support different data sources like JSON files,
 * databases, APIs, etc.
 * 
 * @example
 * ```typescript
 * class DatabaseDocumentLoader extends DocumentLoader {
 *   async loadDocuments(dataSet: string): Promise<Doc[]> {
 *     const rows = await db.query('SELECT * FROM docs WHERE dataset = ?', [dataSet]);
 *     return rows.map(row => ({ id: row.id, text: row.content }));
 *   }
 * }
 * ```
 */
export abstract class DocumentLoader {
  /**
   * Load documents for a given dataset.
   * @param dataSet - The name/identifier of the dataset to load
   * @returns Promise resolving to an array of documents
   */
  abstract loadDocuments(dataSet: string): Promise<Doc[]>;
}
```

**To add your own dataset:**
1. Create a new folder in `data/` with your dataset name
2. Add the three required markdown files
3. The system will automatically discover and load your dataset

**To customize data loading:**
1. Extend the `DocumentLoader` class in `src/dataset/DocumentLoader.ts`
2. Implement your custom `loadDocuments()` method
3. Update the semantic search to use your custom loader

### Web Server & UI

The application uses **Hono.js** as a lightweight web framework:

- **Route Handling**: Simple GET/POST routes for the web interface
- **Form Processing**: Native HTML forms submit questions via POST
- **Server-Side Rendering**: HTML is generated server-side with embedded results
- **Static UI**: No JavaScript frontend - pure HTML forms and server responses

**Request Flow:**
1. User visits `/` and selects a dataset
2. User submits question via HTML form
3. Server processes question through RAG pipeline  
4. Server renders results page with answer and debug information
5. Debug section shows the complete request/response data and context used

The UI is intentionally minimal to focus on the RAG functionality rather than frontend complexity.

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
   cp .env_example .env
   ```

   Then edit `.env` and set your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-...
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

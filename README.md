# RAG Ask Demo

Demo and starter kit for a RAG application using OpenAI's API and Hono.js

> **Enhanced Version Available!** This demo now includes an enhanced RAG implementation with intelligent document chunking and hybrid search. Run `pnpm dev:enhanced` to try it out.

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
- **Embedding Cache**: Automatically cache embeddings by content hash to avoid redundant API calls
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
│   ├── user-template.md  # Message template with {{context}} and {{question}} placeholders
│   └── embeddings/       # Cached embeddings (auto-generated)
├── example-nodejs/
│   ├── docs.md
│   ├── system-prompt.md
│   ├── user-template.md
│   └── embeddings/       # Cached embeddings (auto-generated)
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

**Embedding Cache (`embeddings/`):**
The system automatically caches embeddings to avoid redundant API calls and improve performance. Embeddings are organized by provider and model in subfolders: `embeddings/{provider}/{model}/`. Each document's embedding is stored as a JSON file named by the SHA256 hash of its content:

- **Provider Isolation**: Different AI providers and models use separate cache directories
- **Cache Invalidation**: When document content changes, the hash changes, automatically invalidating old embeddings
- **Performance**: Subsequent runs load embeddings from cache instead of calling the API
- **Model Support**: Works with OpenAI, LM Studio, and other embedding providers
- **Storage Format**: Each cache file contains the embedding vector, original text, content hash, and metadata

### Embedding Management Scripts

The project includes convenient scripts for managing cached embeddings:

**Generate embeddings for a dataset:**
```bash
pnpm embeddings:generate example-fruits
```
Creates embedding cache files for all documents in the specified dataset. Requires `OPENAI_API_KEY` environment variable.

**Clean unused cache files:**
```bash
pnpm embeddings:clean example-fruits  
```
Removes cache files that no longer correspond to current document content (useful after editing documents).

**Update embeddings (generate + clean):**
```bash
pnpm embeddings:update example-fruits
```
Runs both generate and clean operations in sequence - the recommended way to refresh embeddings after making changes.

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

## Enhanced RAG Features

The enhanced version (`pnpm dev:enhanced`) includes significant improvements for better retrieval quality:

### 1. **Intelligent Document Chunking**
- **Automatic Chunking**: Large documents are automatically split into ~500 token chunks
- **Sentence Preservation**: Chunks respect sentence boundaries for better readability
- **Overlapping Context**: Chunks include overlapping content to preserve context
- **Smart Threshold**: Only documents >1.5x chunk size are split (avoids unnecessary chunking)

### 2. **Hybrid Search**
- **Dual Scoring**: Combines embedding similarity with keyword matching
- **Better Precision**: Excellent for finding specific terms, error codes, or technical details
- **Configurable Weights**: Adjust the balance between semantic and keyword search
- **Keyword Highlighting**: Shows matching keywords in search results

### 3. **Enhanced Context Display**
- **Chunk Metadata**: Shows which document and chunk each result comes from
- **Score Transparency**: Displays relevance scores for each result
- **Highlighted Excerpts**: Shows keyword matches in context
- **Configurable Results**: Choose how many results to retrieve (1-10)

### Example Improvements:
```
Query: "What is the API timeout?"

Basic RAG:
- Returns entire 2000-word API documentation section
- User must scan through to find timeout information

Enhanced RAG:
- Returns specific chunk: "The API timeout is set to 30 seconds by default..."
- Highlights the matching keywords
- Shows relevance score and chunk location
```

### Running the Enhanced Version:

```bash
# Development mode with hot-reloading
pnpm dev:enhanced

# Production mode
pnpm start:enhanced
```

The enhanced server runs on the same port (8787) and is fully backwards compatible with existing datasets.

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

### Server Commands
- `pnpm dev` - start development server (basic RAG)
- `pnpm dev:enhanced` - start enhanced development server (with chunking and hybrid search)
- `pnpm start` - run production server (basic RAG)
- `pnpm start:enhanced` - run production enhanced server

### Development Commands
- `pnpm type-check` - run TypeScript compiler in noEmit mode
- `pnpm test` - run Jest tests
- `pnpm test:e2e` - run Playwright end-to-end tests with mocked OpenAI responses
- `pnpm ci` - run all checks (type-check, tests, e2e)

### Embedding Management
- `pnpm embeddings:generate <dataset>` - generate cached embeddings for a dataset
- `pnpm embeddings:clean <dataset>` - remove unused cached embeddings for a dataset  
- `pnpm embeddings:update <dataset>` - generate new embeddings and clean unused ones

### Cache Management
- `pnpm cache:list` - list all cached embeddings organized by provider and model
- `pnpm cache:clear <dataset> [provider] [model]` - clear specific or all caches
- `pnpm cache:setup <dataset>` - create directories for popular embedding models

## End-to-End Tests

Playwright is used for E2E testing with a mocked OpenAI API. Tests start the server automatically.

1. Run E2E tests:

   ```sh
   pnpm test:e2e
   ```

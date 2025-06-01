# Agents and Project Memory

This file is used to store the project memory for all agents. It should contain key
information and context that agents need to assist with development, debugging,
and decision making.

## How to Use

1. **Project Context**: Brief overview of the project's purpose, architecture, and
   main components.
2. **Design Decisions**: Document major design or implementation decisions, along
   with their rationale and any trade-offs considered.
3. **Open Tasks and Issues**: List outstanding tasks, bugs, or technical debt that
   agents should be aware of.
4. **References**: Include links to relevant documentation, tickets, or external
   resources.
5. **Update Regularly**: Whenever the project context changes or new decisions are
   made, update this file to keep the memory current.
6. **MANDATORY COMMITS**: You MUST commit after completing each user command/instruction. This is not optional:
   - **In Sandbox**: Suggest `git add . && git commit --all -m 'message'` command with concise commit message
   - **Not in Sandbox**: ALWAYS commit directly using git commands after completing work
   - **Every Command**: Each user instruction must result in a commit when code/files are changed
   - **No Exceptions**: Even small changes, configuration updates, or documentation edits must be committed
   - **Immediate Action**: Commit as soon as the requested work is complete, don't wait for user prompting

7. **Run Tests**: After each change, run both unit tests (`pnpm test`) and end-to-end tests (`pnpm test:e2e`) to catch regressions early.
8. **Dependency Management**: Install pnpm globally via corepack (`pnpm i -g corepack`). Always use the pnpm CLI (`pnpm`) to add or remove dependencies so that correct versions are recorded in `package.json`.
9. **Documentation Updates**: Always update documentation when changing code, especially:
   - **README.md**: Update when adding features, changing architecture, or modifying usage instructions
   - **AGENTS.md**: Update project context, design decisions, open tasks, AND the codebase map when making significant changes
   - **JSDoc/TSDoc**: Add comprehensive comments to new types, classes, and functions
   - **Code Examples**: Update examples in README when APIs or usage patterns change
   - **Codebase Map**: CRITICAL - Update the codebase map section whenever you:
     * Add new files or directories
     * Create new functions or utilities
     * Move or rename existing code
     * Add new dependencies or scripts
     * Change file purposes or responsibilities
   - The codebase map is as important as the architecture overview and helps future agents navigate the project efficiently
10. **File Naming Convention**: Follow consistent naming schemes:
   - **Functions/utilities**: `kebab-case` (e.g., `semantic-search.ts`, `template-loader.ts`)
   - **Classes**: `PascalCase` (e.g., `DocumentLoader.ts`, `UserManager.ts`)
   - **Tests**: Match the file they test with `.test.ts` suffix
11. **Node.js Built-in Imports**: Always import Node.js built-in modules with the `node:` prefix for clarity and future compatibility:
   - **Correct**: `import * as path from 'node:path'`, `import { readFile } from 'node:fs/promises'`
   - **Incorrect**: `import * as path from 'path'`, `import { readFile } from 'fs/promises'`
12. **Documentation Strategy**: Prefer comprehensive JSDoc/TSDoc comments for implementation details and README for architecture:
   - **JSDoc/TSDoc**: Complete API documentation with examples, parameters, return types, and usage patterns
   - **README**: High-level architecture, data flow, system design, and getting started information
   - **Code Comments**: Minimal but exhaustive - only explain unusual implementations, workarounds, or performance optimizations
   - **Avoid**: Obvious comments that restate what the code clearly shows

13. **Configuration Management Strategy**: Fail fast with helpful error messages instead of silent fallbacks:
   - **No Default Values**: Don't provide fallback strings for required configuration (API keys, model names, etc.)
   - **Strict Validation**: Validate all required environment variables at startup with clear error messages
   - **Helpful Errors**: Include examples and guidance in configuration error messages
   - **Environment Precedence**: Shell environment variables override .env file values (use `dotenv.config({ override: false })`)
   - **Test Configuration**: Use `cross-env` in package.json scripts to set test environment variables explicitly
   - **Mock Support**: Provide `USE_MOCK_OPENAI=true` environment variable for testing without real API calls

## Sections

- **Project Overview**: High-level description of the project.
- **Architecture Diagram**: (optional) ASCII diagram or linked image.
- **Key Dependencies**: Major libraries, frameworks, and tools.
- **Design Decisions**: Decisions, rationale, and alternatives.
- **Codebase Map**: Detailed structure and important locations.
- **Open Tasks and Issues**: Outstanding work items.
- **References**: Links to specs, design docs, tickets, or external resources.

By centralizing the project memory in this file, all agents and collaborators will have
a single source of truth for important project information.

## Project Overview

RAG Ask Demo is a demonstration and starter kit for a Retrieval-Augmented Generation (RAG) application. It shows how to build semantic search with OpenAI's embeddings API and generate contextual responses using their completion API. The application uses Hono.js as a lightweight web framework.

## Architecture Diagram

```
User Request → Web Server (Hono.js) → RAG Pipeline
                                      ├─ Document Loader
                                      ├─ Embedding Generation
                                      ├─ Semantic Search  
                                      ├─ Context Injection
                                      └─ AI Completion → Response
```

## Key Dependencies

- **@ai-sdk/openai** (^1.3.22): AI SDK for OpenAI integration
- **ai** (^3.0.23): Vercel AI SDK for text generation
- **hono** (^4.7.10): Lightweight web framework
- **@hono/node-server** (^1.14.3): Node.js adapter for Hono
- **openai** (^4.24.0): OpenAI client library
- **dotenv** (^16.5.0): Environment variable management
- **TypeScript** (^5.8.3): Type safety and modern JavaScript
- **Jest** (^29.6.1): Unit testing framework
- **Playwright** (^1.38.0): End-to-end testing

## Design Decisions

1. **Dual AI Provider Support**: Supports both OpenAI and LMStudio for flexibility
2. **Embedding Cache**: SHA256-based caching system to minimize API costs
3. **Modular Document Loading**: Abstract `DocumentLoader` class for extensibility
4. **Server-Side Only**: No client-side JavaScript for simplicity
5. **Environment-Based Config**: All configuration via environment variables with strict validation

## Codebase Map

### Project Structure
```
rag-ask-demo/
├── src/                    # Source code
│   ├── ai/                # AI provider integration
│   ├── dataset/           # Document loading and templates
│   ├── features/          # Core features (semantic search)
│   ├── support/           # Utilities (caching)
│   ├── types/             # TypeScript type definitions
│   ├── view/              # HTML generation utilities
│   └── server.ts          # Main HTTP server
├── data/                  # Datasets directory
│   └── {dataset}/         # Individual dataset folders
│       ├── docs.md        # Documents (separated by ***)
│       ├── system-prompt.md
│       ├── user-template.md
│       └── embeddings/    # Cached embeddings
├── scripts/               # Utility scripts
├── tests/                 # E2E tests
└── dotenv-config.ts       # Environment loading

```

### Key Files and Functions

#### AI Integration (`src/ai/`)
- **provider-config.ts**
  - `getAIConfig()` (line 58): Validate and load AI configuration
  - `createProviders()` (line 151): Create AI provider instances
  - `ConfigurationError` (line 30): Custom error with helpful messages
- **embeddings.ts**
  - `generateEmbedding()` (line 25): Generate single embedding
  - `cosineSimilarity()` (line 96): Calculate vector similarity
  - `findSimilarEmbeddings()` (line 134): Find top-K similar documents
- **completions.ts**
  - `generateCompletion()` (line 39): Generate text completion
  - `generateRAGResponse()` (line 82): Generate RAG response with context

#### Dataset Management (`src/dataset/`)
- **DocumentLoader.ts**
  - `Doc` interface (line 8): Document structure
  - `DocumentLoader` abstract class (line 32): Base loader class
  - `MarkdownDocumentLoader` (line 68): Load from markdown files
- **template-loader.ts**
  - `loadSystemPrompt()` (line 17): Load system instructions
  - `loadUserTemplate()` (line 39): Load user message template
  - `fillUserTemplate()` (line 66): Replace template placeholders

#### Features (`src/features/`)
- **semantic-search.ts**
  - `loadDocs()` (line 16): Load documents for a dataset
  - `embedAllDocsWithAI()` (line 30): Embed documents with caching
  - `findRelevantDocsWithAI()` (line 57): Find semantically similar docs

#### Support Utilities (`src/support/`)
- **embedding-cache.ts**
  - `EmbeddingCache` (line 40): Original cache implementation
  - `EmbeddingCacheAI` (line 209): AI SDK-based cache
  - Cache location: `data/{dataset}/embeddings/{hash}.json`

#### Server (`src/server.ts`)
- **Endpoints**:
  - `GET /` (line 33): Dataset selection form
  - `POST /ask` (line 66): Process questions
- **Key features**: Request logging, debug info display

#### View Utilities (`src/view/`)
- **html.ts**: `htmlBody()`, `escapeHtml()` functions
- **frontmatter.ts**: `stripFrontmatter()` for YAML removal

#### Scripts (`scripts/`)
- **embeddings-generate.js**: Generate embeddings for a dataset
- **embeddings-clean.js**: Remove unused cache files
- **embeddings-update.js**: Generate + clean in one command

### Important Patterns and Utilities

1. **Error Handling**: ConfigurationError provides helpful setup guidance
2. **Mock Support**: `USE_MOCK_OPENAI=true` for testing without API calls
3. **Content Hashing**: SHA256 hashes for cache invalidation
4. **Template System**: Markdown templates with `{{context}}` and `{{question}}`
5. **Document Separation**: Use `***` to separate documents in docs.md
6. **Environment Config**: Required vars validated at startup, no silent defaults

### Database Schemas

No traditional database - uses file-based storage:
- Documents: Markdown files in `data/{dataset}/docs.md`
- Embeddings: JSON files in `data/{dataset}/embeddings/{hash}.json`
- Cache format: `{ embedding: number[], text: string, hash: string, metadata: {...} }`

## Open Tasks and Issues

- Consider adding support for additional AI providers beyond OpenAI and LMStudio
- Explore vector database integration for larger datasets
- Add rate limiting and request queuing for API calls

## References

- [OpenAI Retrieval Guide](https://platform.openai.com/docs/guides/retrieval#semantic-search)
- [Hono.js Documentation](https://hono.dev/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

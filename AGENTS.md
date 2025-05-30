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
   - **AGENTS.md**: Update project context, design decisions, and open tasks when making significant changes
   - **JSDoc/TSDoc**: Add comprehensive comments to new types, classes, and functions
   - **Code Examples**: Update examples in README when APIs or usage patterns change
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
- **Open Tasks and Issues**: Outstanding work items.
- **References**: Links to specs, design docs, tickets, or external resources.

By centralizing the project memory in this file, all agents and collaborators will have
a single source of truth for important project information.

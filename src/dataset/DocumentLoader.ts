import { readdir, readFile } from 'node:fs/promises';
import { stripFrontmatter } from '../view/frontmatter';
import { extname, join } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Represents a document with text content and optional embedding vector.
 * Used in semantic search and RAG applications.
 */
export interface Doc {
  /** Unique identifier for the document */
  id: string;
  /** The text content of the document */
  text: string;
  /** Optional embedding vector for semantic similarity calculations */
  embedding?: number[];
}

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

/**
 * Document loader that reads from markdown files in the data directory.
 * Expects files at `data/{dataSet}/docs.md` with documents separated by `***`.
 * Automatically strips YAML frontmatter and filters out empty blocks.
 *
 * @example
 * Given a file `data/example/docs.md`:
 * ```markdown
 * ---
 * title: Example Dataset
 * ---
 *
 * First document content.
 *
 * ***
 *
 * Second document content.
 * ```
 *
 * Will produce:
 * ```typescript
 * [
 *   { id: "1", text: "First document content." },
 *   { id: "2", text: "Second document content." }
 * ]
 * ```
 */
export class MarkdownDocumentLoader extends DocumentLoader {

  async loadDocumentsFromDocsMd(dataSet: string): Promise<Doc[]> {
    const data = await readFile(
      `${process.cwd()}/data/${dataSet}/docs.md`,
      'utf-8'
    );
    const content = stripFrontmatter(data);
    // Split on markdown separator and trim
    const blocks = content.split(/^\*{3}$/m).map(b => b.trim()).filter(Boolean);
    return blocks.map((text, idx) => ({ id: (idx + 1).toString(), text }));
  }

  async loadDocuments(dataSet: string): Promise<Doc[]> {

    const docsMdExists = existsSync(
      `${process.cwd()}/data/${dataSet}/docs.md`
    );

    if (docsMdExists) {
      return this.loadDocumentsFromDocsMd(dataSet);
    }

    const dataDir = `${process.cwd()}/data/${dataSet}/docs`;
    const files = await readdir(dataDir);
    const mdFiles = files.filter(file => extname(file).toLowerCase() === '.md' && file.startsWith('pr'));

    return await Promise.all(mdFiles.map(async file => {
      const filePath = join(dataDir, file);
      const data = await readFile(filePath, 'utf-8');
      const content = stripFrontmatter(data);
      const doc: Doc = {
        id: `${file}:1`,
        text: content.trim(),
      }

      return doc;
    }));
  }
}
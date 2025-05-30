import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import * as path from 'node:path';
import { Doc } from '../dataset/DocumentLoader';

/**
 * Cached embedding data structure stored in JSON files.
 */
interface CachedEmbedding {
  /** SHA256 hash of the document text content */
  contentHash: string;
  /** The document text that was embedded */
  text: string;
  /** The embedding vector for the document */
  embedding: number[];
  /** Timestamp when the embedding was created */
  createdAt: string;
  /** Model used to create the embedding */
  model: string;
}

/**
 * Manages caching of document embeddings to avoid redundant API calls.
 * Stores embeddings in `data/{dataSet}/embeddings/` directory as JSON files,
 * using SHA256 content hashes as filenames for cache invalidation.
 * 
 * @example
 * ```typescript
 * const cache = new EmbeddingCache('example-fruits');
 * 
 * // Load cached embeddings for documents
 * await cache.loadCachedEmbeddings(documents);
 * 
 * // Embed any documents that don't have cached embeddings
 * await cache.embedDocuments(openai, documents);
 * ```
 */
export class EmbeddingCache {
  private readonly dataSet: string;
  private readonly embeddingsDir: string;

  constructor(dataSet: string) {
    this.dataSet = dataSet;
    this.embeddingsDir = path.join(process.cwd(), 'data', dataSet, 'embeddings');
  }

  /**
   * Generate SHA256 hash of text content for cache key.
   * @param text - The text content to hash
   * @returns SHA256 hash as hexadecimal string
   */
  private hashContent(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /**
   * Get the file path for a cached embedding.
   * @param contentHash - SHA256 hash of the content
   * @returns Full path to the cache file
   */
  private getCacheFilePath(contentHash: string): string {
    return path.join(this.embeddingsDir, `${contentHash}.json`);
  }

  /**
   * Ensure the embeddings directory exists.
   */
  private async ensureEmbeddingsDir(): Promise<void> {
    try {
      await access(this.embeddingsDir);
    } catch {
      await mkdir(this.embeddingsDir, { recursive: true });
    }
  }

  /**
   * Load a cached embedding from disk if it exists.
   * @param contentHash - SHA256 hash of the content
   * @returns Cached embedding data or null if not found
   */
  private async loadCachedEmbedding(contentHash: string): Promise<CachedEmbedding | null> {
    try {
      const filePath = this.getCacheFilePath(contentHash);
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data) as CachedEmbedding;
    } catch {
      return null;
    }
  }

  /**
   * Save an embedding to the cache.
   * @param doc - Document with embedding to cache
   * @param model - Model used to create the embedding
   */
  private async saveCachedEmbedding(doc: Doc, model: string): Promise<void> {
    if (!doc.embedding) {
      throw new Error('Document has no embedding to cache');
    }

    await this.ensureEmbeddingsDir();

    const contentHash = this.hashContent(doc.text);
    const cached: CachedEmbedding = {
      contentHash,
      text: doc.text,
      embedding: doc.embedding,
      createdAt: new Date().toISOString(),
      model
    };

    const filePath = this.getCacheFilePath(contentHash);
    await writeFile(filePath, JSON.stringify(cached, null, 2));
  }

  /**
   * Load cached embeddings for documents that have them.
   * Updates the documents in-place with cached embeddings.
   * @param documents - Array of documents to load cached embeddings for
   * @returns Number of documents that had cached embeddings loaded
   */
  async loadCachedEmbeddings(documents: Doc[]): Promise<number> {
    let loadedCount = 0;

    for (const doc of documents) {
      if (doc.embedding) {
        continue; // Already has embedding
      }

      const contentHash = this.hashContent(doc.text);
      const cached = await this.loadCachedEmbedding(contentHash);

      if (cached && cached.text === doc.text) {
        doc.embedding = cached.embedding;
        loadedCount++;
      }
    }

    return loadedCount;
  }

  /**
   * Embed documents that don't have embeddings using OpenAI API and cache results.
   * Only processes documents that don't already have embeddings loaded.
   * @param openai - OpenAI client instance
   * @param documents - Array of documents to embed
   * @param model - Embedding model to use (default: text-embedding-ada-002)
   * @returns Number of documents that were newly embedded
   */
  async embedDocuments(openai: any, documents: Doc[], model: string = 'text-embedding-ada-002'): Promise<number> {
    const docsToEmbed = documents.filter(doc => !doc.embedding);
    
    if (docsToEmbed.length === 0) {
      return 0;
    }

    // Embed documents
    for (const doc of docsToEmbed) {
      const resp = await openai.embeddings.create({
        model,
        input: doc.text,
      });
      doc.embedding = resp.data[0].embedding;

      // Cache the new embedding
      await this.saveCachedEmbedding(doc, model);
    }

    return docsToEmbed.length;
  }

  /**
   * Clear all cached embeddings for this dataset.
   * Useful for testing or when you want to force regeneration.
   */
  async clearCache(): Promise<void> {
    try {
      const { readdir, unlink } = await import('fs/promises');
      const files = await readdir(this.embeddingsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await unlink(path.join(this.embeddingsDir, file));
        }
      }
    } catch {
      // Directory doesn't exist or other error - that's fine
    }
  }
}
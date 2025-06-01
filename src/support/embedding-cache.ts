import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import * as path from 'node:path';
import { Doc } from '../dataset/DocumentLoader';
import { generateEmbedding, generateEmbeddings } from '../ai/embeddings';
import { getAIConfig } from '../ai/provider-config';

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
  /** Provider used to create the embedding */
  provider: string;
  /** Cache key components for verification */
  cacheKey: {
    contentHash: string;
    model: string;
    provider: string;
  };
}

/**
 * Manages caching of document embeddings to avoid redundant API calls.
 * Stores embeddings in organized subfolders: `data/{dataSet}/embeddings/{provider}/{model}/`
 * Uses SHA256 content hashes as filenames with model/provider in the path for cache isolation.
 * 
 * Cache organization:
 * - `data/example-fruits/embeddings/openai/text-embedding-ada-002/abc123.json`
 * - `data/example-fruits/embeddings/lmstudio/all-MiniLM-L6-v2/def456.json`
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
  private readonly baseEmbeddingsDir: string;

  constructor(dataSet: string) {
    this.dataSet = dataSet;
    this.baseEmbeddingsDir = path.join(process.cwd(), 'data', dataSet, 'embeddings');
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
   * Generate a safe directory name from model identifier.
   * Replaces problematic characters with hyphens.
   * @param model - Model identifier
   * @returns Safe directory name
   */
  private safeModelName(model: string): string {
    return model.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/--+/g, '-');
  }

  /**
   * Get the cache directory for a specific provider and model.
   * @param provider - AI provider (e.g., 'openai', 'lmstudio')
   * @param model - Model identifier
   * @returns Full path to the cache directory
   */
  private getCacheDir(provider: string, model: string): string {
    return path.join(this.baseEmbeddingsDir, provider, this.safeModelName(model));
  }

  /**
   * Get the file path for a cached embedding.
   * @param contentHash - SHA256 hash of the content
   * @param provider - AI provider
   * @param model - Model identifier
   * @returns Full path to the cache file
   */
  private getCacheFilePath(contentHash: string, provider: string, model: string): string {
    const cacheDir = this.getCacheDir(provider, model);
    return path.join(cacheDir, `${contentHash}.json`);
  }

  /**
   * Ensure the cache directory exists for a specific provider and model.
   * @param provider - AI provider
   * @param model - Model identifier
   */
  private async ensureCacheDir(provider: string, model: string): Promise<void> {
    const cacheDir = this.getCacheDir(provider, model);
    try {
      await access(cacheDir);
    } catch {
      await mkdir(cacheDir, { recursive: true });
    }
  }

  /**
   * Load a cached embedding from disk if it exists.
   * @param contentHash - SHA256 hash of the content
   * @param provider - AI provider
   * @param model - Model identifier
   * @returns Cached embedding data or null if not found
   */
  private async loadCachedEmbedding(
    contentHash: string,
    provider: string,
    model: string
  ): Promise<CachedEmbedding | null> {
    try {
      const filePath = this.getCacheFilePath(contentHash, provider, model);
      const data = await readFile(filePath, 'utf-8');
      const cached = JSON.parse(data) as CachedEmbedding;
      
      // Verify cache key matches to ensure integrity
      if (
        cached.cacheKey?.contentHash === contentHash &&
        cached.cacheKey?.model === model &&
        cached.cacheKey?.provider === provider
      ) {
        return cached;
      }
      
      // Cache key mismatch - treat as cache miss
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save an embedding to the cache.
   * @param doc - Document with embedding to cache
   * @param model - Model used to create the embedding
   * @param provider - Provider used to create the embedding
   */
  private async saveCachedEmbedding(doc: Doc, model: string, provider: string): Promise<void> {
    if (!doc.embedding) {
      throw new Error('Document has no embedding to cache');
    }

    await this.ensureCacheDir(provider, model);

    const contentHash = this.hashContent(doc.text);
    const cached: CachedEmbedding = {
      contentHash,
      text: doc.text,
      embedding: doc.embedding,
      createdAt: new Date().toISOString(),
      model,
      provider,
      cacheKey: {
        contentHash,
        model,
        provider
      }
    };

    const filePath = this.getCacheFilePath(contentHash, provider, model);
    await writeFile(filePath, JSON.stringify(cached, null, 2));
  }

  /**
   * Load cached embeddings for documents that have them.
   * Updates the documents in-place with cached embeddings.
   * Uses the current AI configuration to determine provider and model.
   * @param documents - Array of documents to load cached embeddings for
   * @returns Number of documents that had cached embeddings loaded
   */
  async loadCachedEmbeddings(documents: Doc[]): Promise<number> {
    // Get current AI config to determine which cache to check
    const config = getAIConfig();
    let loadedCount = 0;

    for (const doc of documents) {
      if (doc.embedding) {
        continue; // Already has embedding
      }

      const contentHash = this.hashContent(doc.text);
      const cached = await this.loadCachedEmbedding(
        contentHash,
        config.embeddingProvider,
        config.embeddingModel
      );

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

      // Cache the new embedding with provider info
      await this.saveCachedEmbedding(doc, model, 'openai');
    }

    return docsToEmbed.length;
  }

  /**
   * Clear cached embeddings for this dataset.
   * @param provider - Specific provider to clear (optional, clears all if not specified)
   * @param model - Specific model to clear (optional, clears all for provider if not specified)
   */
  async clearCache(provider?: string, model?: string): Promise<void> {
    try {
      const { readdir, unlink, rm } = await import('fs/promises');
      
      if (provider && model) {
        // Clear specific provider/model combination
        const cacheDir = this.getCacheDir(provider, model);
        await rm(cacheDir, { recursive: true, force: true });
      } else if (provider) {
        // Clear all models for a specific provider
        const providerDir = path.join(this.baseEmbeddingsDir, provider);
        await rm(providerDir, { recursive: true, force: true });
      } else {
        // Clear entire cache
        await rm(this.baseEmbeddingsDir, { recursive: true, force: true });
      }
    } catch {
      // Silently ignore errors (directory doesn't exist, permission issues, etc.)
    }
  }
}

/**
 * Manages caching of document embeddings using the AI SDK.
 * Uses organized subfolders and provider-aware cache keys like EmbeddingCache.
 * This is the recommended cache implementation for new code.
 * 
 * @example
 * ```typescript
 * const cache = new EmbeddingCacheAI('example-fruits');
 * 
 * // Load cached embeddings for documents
 * await cache.loadCachedEmbeddings(documents);
 * 
 * // Embed any documents that don't have cached embeddings
 * await cache.embedDocuments(documents);
 * ```
 */
export class EmbeddingCacheAI {
  private readonly dataSet: string;
  private readonly baseEmbeddingsDir: string;

  constructor(dataSet: string) {
    this.dataSet = dataSet;
    this.baseEmbeddingsDir = path.join(process.cwd(), 'data', dataSet, 'embeddings');
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
   * Generate a safe directory name from model identifier.
   * Replaces problematic characters with hyphens.
   * @param model - Model identifier
   * @returns Safe directory name
   */
  private safeModelName(model: string): string {
    return model.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/--+/g, '-');
  }

  /**
   * Get the cache directory for a specific provider and model.
   * @param provider - AI provider (e.g., 'openai', 'lmstudio')
   * @param model - Model identifier
   * @returns Full path to the cache directory
   */
  private getCacheDir(provider: string, model: string): string {
    return path.join(this.baseEmbeddingsDir, provider, this.safeModelName(model));
  }

  /**
   * Get the file path for a cached embedding.
   * @param contentHash - SHA256 hash of the content
   * @param provider - AI provider
   * @param model - Model identifier
   * @returns Full path to the cache file
   */
  private getCacheFilePath(contentHash: string, provider: string, model: string): string {
    const cacheDir = this.getCacheDir(provider, model);
    return path.join(cacheDir, `${contentHash}.json`);
  }

  /**
   * Ensure the cache directory exists for a specific provider and model.
   * @param provider - AI provider
   * @param model - Model identifier
   */
  private async ensureCacheDir(provider: string, model: string): Promise<void> {
    const cacheDir = this.getCacheDir(provider, model);
    try {
      await access(cacheDir);
    } catch {
      await mkdir(cacheDir, { recursive: true });
    }
  }

  /**
   * Load a cached embedding from disk if it exists.
   * @param contentHash - SHA256 hash of the content
   * @param provider - AI provider
   * @param model - Model identifier
   * @returns Cached embedding data or null if not found
   */
  private async loadCachedEmbedding(
    contentHash: string,
    provider: string,
    model: string
  ): Promise<CachedEmbedding | null> {
    try {
      const filePath = this.getCacheFilePath(contentHash, provider, model);
      const data = await readFile(filePath, 'utf-8');
      const cached = JSON.parse(data) as CachedEmbedding;
      
      // Verify cache key matches to ensure integrity
      if (
        cached.cacheKey?.contentHash === contentHash &&
        cached.cacheKey?.model === model &&
        cached.cacheKey?.provider === provider
      ) {
        return cached;
      }
      
      // Cache key mismatch - treat as cache miss
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save an embedding to the cache.
   * @param doc - Document with embedding to cache
   * @param model - Model used to create the embedding
   * @param provider - Provider used to create the embedding
   */
  private async saveCachedEmbedding(doc: Doc, model: string, provider: string): Promise<void> {
    if (!doc.embedding) {
      throw new Error('Document has no embedding to cache');
    }

    await this.ensureCacheDir(provider, model);

    const contentHash = this.hashContent(doc.text);
    const cached: CachedEmbedding = {
      contentHash,
      text: doc.text,
      embedding: doc.embedding,
      createdAt: new Date().toISOString(),
      model,
      provider,
      cacheKey: {
        contentHash,
        model,
        provider
      }
    };

    const filePath = this.getCacheFilePath(contentHash, provider, model);
    await writeFile(filePath, JSON.stringify(cached, null, 2));
  }

  /**
   * Load cached embeddings for documents that have them.
   * Updates the documents in-place with cached embeddings.
   * Uses the current AI configuration to determine provider and model.
   * @param documents - Array of documents to load cached embeddings for
   * @returns Number of documents that had cached embeddings loaded
   */
  async loadCachedEmbeddings(documents: Doc[]): Promise<number> {
    // Get current AI config to determine which cache to check
    const config = getAIConfig();
    let loadedCount = 0;

    for (const doc of documents) {
      if (doc.embedding) {
        continue; // Already has embedding
      }

      const contentHash = this.hashContent(doc.text);
      const cached = await this.loadCachedEmbedding(
        contentHash,
        config.embeddingProvider,
        config.embeddingModel
      );

      if (cached && cached.text === doc.text) {
        doc.embedding = cached.embedding;
        loadedCount++;
      }
    }

    return loadedCount;
  }

  /**
   * Embed documents that don't have embeddings using AI SDK and cache results.
   * Only processes documents that don't already have embeddings loaded.
   * @param documents - Array of documents to embed
   * @returns Number of documents that were newly embedded
   */
  async embedDocuments(documents: Doc[]): Promise<number> {
    const docsToEmbed = documents.filter(doc => !doc.embedding);
    
    if (docsToEmbed.length === 0) {
      return 0;
    }

    const config = getAIConfig();

    // Embed documents using AI SDK
    for (const doc of docsToEmbed) {
      doc.embedding = await generateEmbedding(doc.text);
      
      // Cache the new embedding with provider info
      await this.saveCachedEmbedding(doc, config.embeddingModel, config.embeddingProvider);
    }

    return docsToEmbed.length;
  }

  /**
   * Clear cached embeddings for this dataset.
   * @param provider - Specific provider to clear (optional, clears all if not specified)
   * @param model - Specific model to clear (optional, clears all for provider if not specified)
   */
  async clearCache(provider?: string, model?: string): Promise<void> {
    try {
      const { readdir, unlink, rm } = await import('fs/promises');
      
      if (provider && model) {
        // Clear specific provider/model combination
        const cacheDir = this.getCacheDir(provider, model);
        await rm(cacheDir, { recursive: true, force: true });
      } else if (provider) {
        // Clear all models for a specific provider
        const providerDir = path.join(this.baseEmbeddingsDir, provider);
        await rm(providerDir, { recursive: true, force: true });
      } else {
        // Clear entire cache
        await rm(this.baseEmbeddingsDir, { recursive: true, force: true });
      }
    } catch {
      // Silently ignore errors (directory doesn't exist, permission issues, etc.)
    }
  }
}
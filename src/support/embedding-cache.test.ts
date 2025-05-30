import { EmbeddingCache } from './embedding-cache';
import { Doc } from '../dataset/DocumentLoader';
import { writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const testDataDir = path.join(os.tmpdir(), 'embedding-cache-test-' + Date.now());
const testDataSet = 'test-dataset';
const testEmbeddingsDir = path.join(testDataDir, 'data', testDataSet, 'embeddings');

// Mock OpenAI client
const mockOpenAI = {
  embeddings: {
    create: jest.fn().mockImplementation(({ input }: any) => ({
      data: [{ embedding: new Array(1536).fill(0.1) }] // Mock embedding vector
    }))
  }
};

beforeAll(async () => {
  await mkdir(path.join(testDataDir, 'data', testDataSet), { recursive: true });
});

afterAll(async () => {
  await rm(testDataDir, { recursive: true, force: true });
});

let originalCwd: () => string;

beforeEach(() => {
  // Mock process.cwd() to return our test directory
  originalCwd = process.cwd;
  process.cwd = () => testDataDir;
  
  // Clean up any previous test state
  mockOpenAI.embeddings.create.mockClear();
});

afterEach(() => {
  // Restore original process.cwd
  process.cwd = originalCwd;
});

describe('EmbeddingCache', () => {
  let cache: EmbeddingCache;
  let testDocs: Doc[];

  beforeEach(() => {
    cache = new EmbeddingCache(testDataSet);
    testDocs = [
      { id: '1', text: 'First test document' },
      { id: '2', text: 'Second test document' },
      { id: '3', text: 'Third test document' }
    ];
  });

  describe('loadCachedEmbeddings', () => {
    test('returns 0 when no cache exists', async () => {
      const count = await cache.loadCachedEmbeddings(testDocs);
      expect(count).toBe(0);
      expect(testDocs.every(doc => !doc.embedding)).toBe(true);
    });

    test('loads cached embeddings when they exist', async () => {
      // First, create cache by embedding documents
      await cache.embedDocuments(mockOpenAI, testDocs);
      
      // Reset embeddings
      testDocs.forEach(doc => delete doc.embedding);
      
      // Load from cache
      const count = await cache.loadCachedEmbeddings(testDocs);
      
      expect(count).toBe(3);
      expect(testDocs.every(doc => doc.embedding && doc.embedding.length === 1536)).toBe(true);
    });

    test('skips documents that already have embeddings', async () => {
      // Give first doc an embedding
      testDocs[0].embedding = new Array(1536).fill(0.5);
      
      // Create cache for other documents
      await cache.embedDocuments(mockOpenAI, testDocs.slice(1));
      
      // Reset embeddings except first
      testDocs.slice(1).forEach(doc => delete doc.embedding);
      
      // Load from cache
      const count = await cache.loadCachedEmbeddings(testDocs);
      
      expect(count).toBe(2); // Only loaded 2 from cache
      expect(testDocs[0].embedding![0]).toBe(0.5); // Original embedding preserved
      expect(testDocs[1].embedding![0]).toBe(0.1); // Loaded from cache
      expect(testDocs[2].embedding![0]).toBe(0.1); // Loaded from cache
    });
  });

  describe('embedDocuments', () => {
    test('embeds documents without embeddings and caches them', async () => {
      const count = await cache.embedDocuments(mockOpenAI, testDocs);
      
      expect(count).toBe(3);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
      expect(testDocs.every(doc => doc.embedding && doc.embedding.length === 1536)).toBe(true);
      
      // Verify cache files were created
      const files = await import('node:fs/promises').then(fs => fs.readdir(testEmbeddingsDir));
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(3);
    });

    test('skips documents that already have embeddings', async () => {
      // Give first two docs embeddings
      testDocs[0].embedding = new Array(1536).fill(0.5);
      testDocs[1].embedding = new Array(1536).fill(0.6);
      
      const count = await cache.embedDocuments(mockOpenAI, testDocs);
      
      expect(count).toBe(1); // Only embedded the third document
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(1);
      expect(testDocs[0].embedding![0]).toBe(0.5); // Original preserved
      expect(testDocs[1].embedding![0]).toBe(0.6); // Original preserved
      expect(testDocs[2].embedding![0]).toBe(0.1); // Newly embedded
    });

    test('returns 0 when all documents already have embeddings', async () => {
      // Give all docs embeddings
      testDocs.forEach(doc => doc.embedding = new Array(1536).fill(0.5));
      
      const count = await cache.embedDocuments(mockOpenAI, testDocs);
      
      expect(count).toBe(0);
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled();
    });

    test('caches embeddings with correct metadata', async () => {
      // Start with fresh cache and docs to isolate this test
      const freshCache = new EmbeddingCache(testDataSet);
      const singleDoc = [{ id: '1', text: 'Fresh test document for metadata test' }];
      
      await freshCache.embedDocuments(mockOpenAI, singleDoc, 'custom-model');
      
      // Read the cache file directly
      const files = await import('node:fs/promises').then(fs => fs.readdir(testEmbeddingsDir));
      const cacheFile = files.find(f => f.endsWith('.json') && f.includes(
        require('node:crypto').createHash('sha256').update('Fresh test document for metadata test', 'utf8').digest('hex')
      ))!;
      const cacheData = JSON.parse(await readFile(path.join(testEmbeddingsDir, cacheFile), 'utf-8'));
      
      expect(cacheData).toMatchObject({
        text: 'Fresh test document for metadata test',
        model: 'custom-model',
        embedding: expect.any(Array)
      });
      expect(cacheData.contentHash).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
      expect(cacheData.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
    });
  });

  describe('cache invalidation', () => {
    test('does not load cache when content changes', async () => {
      // Create cache
      await cache.embedDocuments(mockOpenAI, testDocs);
      
      // Change document content
      testDocs[0].text = 'Modified first document';
      testDocs.forEach(doc => delete doc.embedding);
      
      // Try to load from cache
      const count = await cache.loadCachedEmbeddings(testDocs);
      
      expect(count).toBe(2); // Only 2 unchanged documents loaded from cache
      expect(testDocs[0].embedding).toBeUndefined(); // Modified doc not loaded
      expect(testDocs[1].embedding).toBeDefined(); // Unchanged doc loaded
      expect(testDocs[2].embedding).toBeDefined(); // Unchanged doc loaded
    });
  });

  describe('clearCache', () => {
    test('removes all cached embedding files', async () => {
      // Start with fresh cache for this test
      const freshCache = new EmbeddingCache(testDataSet);
      const freshDocs = [
        { id: '1', text: 'Clear cache test doc 1' },
        { id: '2', text: 'Clear cache test doc 2' }
      ];
      
      // Create cache
      await freshCache.embedDocuments(mockOpenAI, freshDocs);
      
      // Verify files exist
      let files = await import('fs/promises').then(fs => fs.readdir(testEmbeddingsDir));
      const initialJsonFiles = files.filter(f => f.endsWith('.json'));
      expect(initialJsonFiles.length).toBeGreaterThan(0);
      
      // Clear cache
      await freshCache.clearCache();
      
      // Verify files are gone
      files = await import('fs/promises').then(fs => fs.readdir(testEmbeddingsDir));
      expect(files.filter(f => f.endsWith('.json'))).toHaveLength(0);
    });

    test('handles non-existent cache directory gracefully', async () => {
      const newCache = new EmbeddingCache('non-existent-dataset');
      await expect(newCache.clearCache()).resolves.not.toThrow();
    });
  });

  describe('integration with semantic search', () => {
    test('full workflow: embed, cache, reload from cache', async () => {
      // First run: embed and cache
      const newEmbedded1 = await cache.embedDocuments(mockOpenAI, testDocs);
      expect(newEmbedded1).toBe(3);
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
      
      // Reset embeddings
      testDocs.forEach(doc => delete doc.embedding);
      mockOpenAI.embeddings.create.mockClear();
      
      // Second run: load from cache
      const cached = await cache.loadCachedEmbeddings(testDocs);
      const newEmbedded2 = await cache.embedDocuments(mockOpenAI, testDocs);
      
      expect(cached).toBe(3); // All loaded from cache
      expect(newEmbedded2).toBe(0); // None newly embedded
      expect(mockOpenAI.embeddings.create).not.toHaveBeenCalled(); // No API calls
      expect(testDocs.every(doc => doc.embedding && doc.embedding.length === 1536)).toBe(true);
    });
  });
});
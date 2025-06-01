import { ChunkedDocumentLoader } from './ChunkedDocumentLoader';
import { readFile } from 'node:fs/promises';

// Mock fs/promises
jest.mock('node:fs/promises');
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('ChunkedDocumentLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadDocuments', () => {
    it('should load and chunk large documents', async () => {
      const largeDoc = Array(500).fill('word').join(' '); // ~650 tokens
      const mockContent = `---
title: Test Dataset
---

${largeDoc}

***

Small document with just a few words.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({
        maxTokens: 200,
        overlapTokens: 50,
        preserveSentences: false
      });
      
      const docs = await loader.loadDocuments('test');
      
      // Should have multiple chunks for the large doc + 1 for the small doc
      expect(docs.length).toBeGreaterThan(2);
      
      // Check that large document was chunked
      const chunkedDocs = docs.filter(doc => (doc as any).metadata?.isChunk === true);
      expect(chunkedDocs.length).toBeGreaterThan(1);
      
      // Check that small document was not chunked
      const nonChunkedDocs = docs.filter(doc => (doc as any).metadata?.isChunk === false);
      expect(nonChunkedDocs).toHaveLength(1);
      expect(nonChunkedDocs[0].text).toBe('Small document with just a few words.');
    });

    it('should preserve sentence boundaries when enabled', async () => {
      const mockContent = `First sentence here. Second sentence with more words. Third sentence is also included. Fourth sentence continues. Fifth sentence adds content. Sixth sentence wraps up.

***

Another short document.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({
        maxTokens: 20,
        overlapTokens: 10,
        preserveSentences: true
      });
      
      const docs = await loader.loadDocuments('test');
      
      // Check that sentences are preserved in chunks
      const chunks = docs.filter(doc => doc.id.includes('chunk'));
      chunks.forEach(chunk => {
        const sentences = chunk.text.split(/(?<=[.!?])\s+/);
        sentences.forEach(sentence => {
          if (sentence.trim()) {
            expect(sentence).toMatch(/[.!?]$/);
          }
        });
      });
    });

    it('should handle empty documents', async () => {
      const mockContent = `

***

   

***

Valid content here.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader();
      const docs = await loader.loadDocuments('test');
      
      // Should only have the valid document
      expect(docs).toHaveLength(1);
      expect(docs[0].text).toBe('Valid content here.');
    });

    it('should maintain document-chunk relationships', async () => {
      // Create a document that will definitely chunk
      // Need more than 150 tokens (100 * 1.5) to trigger chunking
      const sentences = [];
      for (let i = 0; i < 20; i++) {
        sentences.push(`This is sentence number ${i} with some words.`);
      }
      const largeDoc = sentences.join(' '); // Should be well over 150 tokens
      const mockContent = `${largeDoc}`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({ maxTokens: 100, preserveSentences: true });
      const docs = await loader.loadDocuments('test');
      
      // All chunks should reference the same document
      const chunks = docs.filter(doc => (doc as any).metadata?.isChunk === true);
      expect(chunks.length).toBeGreaterThan(1);
      
      const documentIds = new Set(chunks.map(chunk => (chunk as any).metadata.documentId));
      expect(documentIds.size).toBe(1);
      expect(documentIds.has('1')).toBe(true);
      
      // Check chunk indexing
      chunks.forEach((chunk, index) => {
        expect((chunk as any).metadata.chunkIndex).toBe(index);
        expect((chunk as any).metadata.totalChunks).toBe(chunks.length);
      });
    });

    it('should generate unique IDs for chunks', async () => {
      const largeDoc = Array(200).fill('word').join(' '); // ~260 tokens
      const mockContent = `${largeDoc}

***

${largeDoc}`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({ maxTokens: 100 });
      const docs = await loader.loadDocuments('test');
      
      const ids = new Set(docs.map(doc => doc.id));
      expect(ids.size).toBe(docs.length);
    });
  });

  describe('loadOriginalDocuments', () => {
    it('should load documents without chunking', async () => {
      const largeDoc = Array(500).fill('word').join(' ');
      const mockContent = `${largeDoc}

***

Small document.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({ maxTokens: 100 });
      const docs = await loader.loadOriginalDocuments('test');
      
      expect(docs).toHaveLength(2);
      expect(docs[0].text).toBe(largeDoc);
      expect(docs[1].text).toBe('Small document.');
    });
  });

  describe('getDocumentChunks', () => {
    it('should retrieve all chunks for a specific document', async () => {
      const sentences = [];
      for (let i = 0; i < 20; i++) {
        sentences.push(`Sentence ${i} has multiple words in it.`);
      }
      const largeDoc = sentences.join(' ');
      const mockContent = `Small doc.

***

${largeDoc}

***

Another small doc.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({ maxTokens: 100 });
      
      // Get chunks for document ID "2" (the large doc)
      const chunks = await loader.getDocumentChunks('test', '2');
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect((chunk as any).metadata.documentId).toBe('2');
        expect((chunk as any).metadata.isChunk).toBe(true);
      });
    });

    it('should return empty array for non-chunked documents', async () => {
      const mockContent = `Small doc 1.

***

Small doc 2.`;

      mockReadFile.mockResolvedValue(mockContent);
      
      const loader = new ChunkedDocumentLoader({ maxTokens: 500 });
      const chunks = await loader.getDocumentChunks('test', '1');
      
      expect(chunks).toHaveLength(0);
    });
  });
});
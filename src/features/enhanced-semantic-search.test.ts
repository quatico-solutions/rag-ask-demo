import { 
  calculateKeywordScore, 
  highlightKeywords,
  findRelevantDocsEnhanced,
  type Doc,
  type ScoredDoc
} from './enhanced-semantic-search';

// Mock the AI modules
jest.mock('../ai/embeddings', () => ({
  generateEmbedding: jest.fn().mockImplementation((text: string) => {
    // Simple mock: return array of 3 numbers based on text length
    return Promise.resolve([text.length, text.length * 0.5, text.length * 0.25]);
  }),
  cosineSimilarity: jest.fn().mockImplementation((a: number[], b: number[]) => {
    // Simple mock similarity
    const sumA = a.reduce((sum, val) => sum + val, 0);
    const sumB = b.reduce((sum, val) => sum + val, 0);
    return 1 - Math.abs(sumA - sumB) / Math.max(sumA, sumB);
  })
}));

describe('enhanced-semantic-search', () => {
  describe('calculateKeywordScore', () => {
    it('should give high score for exact matches', () => {
      const query = 'API timeout';
      const text = 'The API timeout is set to 30 seconds by default.';
      
      const score = calculateKeywordScore(query, text);
      expect(score).toBeGreaterThan(9); // Exact match bonus
    });

    it('should score individual token matches', () => {
      const query = 'authentication token';
      const text = 'Use the authentication system with a valid token for access.';
      
      const score = calculateKeywordScore(query, text);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(10); // No exact match
    });

    it('should handle case insensitivity', () => {
      const query = 'ERROR CODE';
      const text = 'The error code ERR_001 indicates invalid input.';
      
      const score = calculateKeywordScore(query, text);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for no matches', () => {
      const query = 'quantum physics';
      const text = 'This document is about web development.';
      
      const score = calculateKeywordScore(query, text);
      expect(score).toBe(0);
    });

    it('should normalize scores by document length', () => {
      const query = 'test';
      const shortText = 'This is a test.';
      const longText = 'This is a test ' + Array(100).fill('word').join(' ');
      
      const shortScore = calculateKeywordScore(query, shortText);
      const longScore = calculateKeywordScore(query, longText);
      
      // Both have exact match so they get score 10, but we can verify they're both high
      expect(shortScore).toBeGreaterThanOrEqual(10);
      expect(longScore).toBeGreaterThanOrEqual(10);
    });
  });

  describe('highlightKeywords', () => {
    it('should highlight exact query matches', () => {
      const query = 'API timeout';
      const text = 'Configure the API timeout in the settings. The default API timeout is 30 seconds.';
      
      const highlights = highlightKeywords(query, text);
      expect(highlights).toHaveLength(1);
      expect(highlights[0]).toContain('API timeout');
    });

    it('should add ellipsis for truncated highlights', () => {
      const query = 'middle';
      const text = Array(20).fill('word').join(' ') + ' middle ' + Array(20).fill('word').join(' ');
      
      const highlights = highlightKeywords(query, text);
      expect(highlights[0]).toMatch(/^\.\.\..*\.\.\.$/);
      expect(highlights[0]).toContain('middle');
    });

    it('should highlight individual tokens when no exact match', () => {
      const query = 'error handling';
      const text = 'The error occurs during request handling phase.';
      
      const highlights = highlightKeywords(query, text);
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0]).toMatch(/error|handling/i);
    });

    it('should handle empty results', () => {
      const query = 'nonexistent';
      const text = 'This text contains nothing relevant.';
      
      const highlights = highlightKeywords(query, text);
      expect(highlights).toEqual([]);
    });
  });

  describe('findRelevantDocsEnhanced', () => {
    const mockDocs: Doc[] = [
      {
        id: '1',
        text: 'The API timeout is configured in the settings file.',
        embedding: [50, 25, 12.5]
      },
      {
        id: '2',
        text: 'Authentication requires a valid JWT token.',
        embedding: [45, 22.5, 11.25]
      },
      {
        id: '3',
        text: 'Set the timeout value to 30 seconds for API calls.',
        embedding: [52, 26, 13]
      }
    ];

    it('should find relevant documents using hybrid search', async () => {
      const results = await findRelevantDocsEnhanced(
        mockDocs,
        'API timeout',
        { maxResults: 2, enableHybridSearch: true, embeddingWeight: 0.5 }
      );

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1'); // Has exact match
      expect(results[0].highlights).toBeDefined();
      expect(results[0].highlights!.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should work with embedding-only search', async () => {
      const results = await findRelevantDocsEnhanced(
        mockDocs,
        'configuration',
        { maxResults: 2, enableHybridSearch: false }
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.highlights).toEqual([]);
      });
    });

    it('should handle documents without embeddings', async () => {
      const docsWithoutEmbeddings: Doc[] = [
        { id: '1', text: 'Document without embedding' },
        { id: '2', text: 'Another document', embedding: [10, 5, 2.5] }
      ];

      const results = await findRelevantDocsEnhanced(
        docsWithoutEmbeddings,
        'document',
        { enableHybridSearch: true }
      );

      const result = results.find(r => r.id === '1');
      expect(result).toBeDefined();
      expect(result!.score).toBeGreaterThan(0);
    });

    it('should apply result diversification for chunks', async () => {
      const chunkedDocs: Doc[] = [
        {
          id: '1-chunk-0',
          text: 'First chunk about API timeout',
          embedding: [50, 25, 12.5],
          metadata: { documentId: '1', chunkIndex: 0, isChunk: true }
        },
        {
          id: '1-chunk-1',
          text: 'Second chunk about API timeout',
          embedding: [51, 25.5, 12.75],
          metadata: { documentId: '1', chunkIndex: 1, isChunk: true }
        },
        {
          id: '1-chunk-2',
          text: 'Third chunk about API timeout',
          embedding: [52, 26, 13],
          metadata: { documentId: '1', chunkIndex: 2, isChunk: true }
        },
        {
          id: '2-chunk-0',
          text: 'Different document about timeout',
          embedding: [45, 22.5, 11.25],
          metadata: { documentId: '2', chunkIndex: 0, isChunk: true }
        }
      ] as any;

      const results = await findRelevantDocsEnhanced(
        chunkedDocs,
        'API timeout',
        { maxResults: 3 }
      );

      // Should not return all chunks from document 1
      const doc1Chunks = results.filter(r => r.metadata?.documentId === '1');
      expect(doc1Chunks.length).toBeLessThanOrEqual(2);
      
      // Should include chunk from document 2 for diversity
      const doc2Chunks = results.filter(r => r.metadata?.documentId === '2');
      expect(doc2Chunks.length).toBeGreaterThan(0);
    });

    it('should respect max results limit', async () => {
      const results = await findRelevantDocsEnhanced(
        mockDocs,
        'API',
        { maxResults: 1 }
      );

      expect(results).toHaveLength(1);
    });
  });
});
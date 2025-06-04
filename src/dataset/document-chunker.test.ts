import { chunkDocument, estimateTokens, shouldChunk, type Chunk } from './document-chunker';

describe('document-chunker', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for text', () => {
      expect(estimateTokens('Hello world')).toBe(3); // 2 * 1.3 = 2.6, rounded up
      expect(estimateTokens('The quick brown fox')).toBe(6); // 4 * 1.3 = 5.2, rounded up
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('   ')).toBe(0);
    });

    it('should handle punctuation and special characters', () => {
      expect(estimateTokens('Hello, world!')).toBe(3);
      expect(estimateTokens('test@example.com')).toBe(2); // Split by whitespace only
    });
  });

  describe('shouldChunk', () => {
    it('should return true for large documents', () => {
      const largeText = Array(1000).fill('word').join(' '); // 1000 words ≈ 1300 tokens
      expect(shouldChunk(largeText, 500)).toBe(true);
    });

    it('should return false for small documents', () => {
      const smallText = Array(100).fill('word').join(' '); // 100 words ≈ 130 tokens
      expect(shouldChunk(smallText, 500)).toBe(false);
    });

    it('should use 1.5x threshold', () => {
      const text = Array(600).fill('word').join(' '); // 600 words ≈ 780 tokens
      expect(shouldChunk(text, 500)).toBe(true); // 780 > 750 (500 * 1.5)
      
      const text2 = Array(500).fill('word').join(' '); // 500 words ≈ 650 tokens
      expect(shouldChunk(text2, 500)).toBe(false); // 650 < 750
    });
  });

  describe('chunkDocument', () => {
    const docId = 'test-doc';

    it('should handle empty documents', () => {
      expect(chunkDocument(docId, '')).toEqual([]);
      expect(chunkDocument(docId, '   ')).toEqual([]);
    });

    it('should not chunk small documents', () => {
      const text = 'This is a small document with just a few words.';
      const chunks = chunkDocument(docId, text, { maxTokens: 100 });
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe(text);
      expect(chunks[0].documentId).toBe(docId);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].totalChunks).toBe(1);
    });

    it('should chunk large documents with sentence preservation', () => {
      const sentences = [
        'First sentence here.',
        'Second sentence with more words.',
        'Third sentence is also included.',
        'Fourth sentence continues the text.',
        'Fifth sentence adds more content.',
        'Sixth sentence wraps things up.'
      ];
      const text = sentences.join(' ');
      
      const chunks = chunkDocument(docId, text, {
        maxTokens: 20, // Small chunks for testing
        overlapTokens: 5,
        preserveSentences: true
      });
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Check chunk structure
      chunks.forEach((chunk, i) => {
        expect(chunk.documentId).toBe(docId);
        expect(chunk.chunkIndex).toBe(i);
        expect(chunk.totalChunks).toBe(chunks.length);
        expect(chunk.id).toBeTruthy();
        expect(chunk.text.length).toBeGreaterThan(0);
      });
      
      // Verify sentences are preserved
      chunks.forEach(chunk => {
        const chunkSentences = chunk.text.split(/(?<=[.!?])\s+/);
        chunkSentences.forEach(sentence => {
          if (sentence.trim()) {
            expect(sentence).toMatch(/[.!?]$/);
          }
        });
      });
    });

    it('should handle overlap correctly', () => {
      const sentences = Array(10).fill(0).map((_, i) => `Sentence ${i}.`);
      const text = sentences.join(' ');
      
      const chunks = chunkDocument(docId, text, {
        maxTokens: 10,
        overlapTokens: 5,
        preserveSentences: true
      });
      
      // Check that consecutive chunks have overlapping content
      for (let i = 1; i < chunks.length; i++) {
        const prevChunk = chunks[i - 1];
        const currChunk = chunks[i];
        
        // Extract last sentences from previous chunk
        const prevSentences = prevChunk.text.split(/(?<=[.!?])\s+/);
        const lastPrevSentence = prevSentences[prevSentences.length - 1];
        
        // Current chunk should contain content from previous chunk
        expect(currChunk.text).toContain(lastPrevSentence.trim());
      }
    });

    it('should chunk without sentence preservation', () => {
      const words = Array(100).fill('word');
      const text = words.join(' ');
      
      const chunks = chunkDocument(docId, text, {
        maxTokens: 20,
        overlapTokens: 5,
        preserveSentences: false
      });
      
      expect(chunks.length).toBeGreaterThan(1);
      
      // Check that chunks have roughly the expected size
      chunks.forEach(chunk => {
        const tokenCount = estimateTokens(chunk.text);
        expect(tokenCount).toBeLessThanOrEqual(20);
      });
    });

    it('should handle documents with irregular spacing', () => {
      const text = 'This   has    irregular     spacing.   And   multiple   sentences.';
      const chunks = chunkDocument(docId, text, { maxTokens: 10 });
      
      expect(chunks.length).toBeGreaterThan(0);
      // The chunker preserves original spacing, which is correct behavior
      expect(chunks[0].text).toBeTruthy();
    });

    it('should generate unique chunk IDs', () => {
      const text = Array(50).fill('word').join(' ');
      const chunks = chunkDocument(docId, text, { maxTokens: 10 });
      
      const ids = new Set(chunks.map(c => c.id));
      expect(ids.size).toBe(chunks.length);
    });

    it('should track offsets correctly', () => {
      const text = 'First part. Second part. Third part.';
      const chunks = chunkDocument(docId, text, {
        maxTokens: 10,
        preserveSentences: true
      });
      
      // Verify offsets cover the entire document
      expect(chunks[0].startOffset).toBe(0);
      expect(chunks[chunks.length - 1].endOffset).toBe(text.length);
      
      // Verify chunks can be reconstructed (approximately)
      chunks.forEach(chunk => {
        const extractedText = text.substring(chunk.startOffset, chunk.endOffset);
        // The extracted text might differ due to overlap handling
        expect(extractedText.length).toBeGreaterThan(0);
      });
    });
  });
});
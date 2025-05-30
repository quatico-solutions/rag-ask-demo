import { generateEmbedding, generateEmbeddings } from './embeddings';
import { generateCompletion, generateRAGResponse } from './completions';

describe('AI Mock Functions', () => {
  beforeAll(() => {
    // Ensure mock mode is enabled for these tests
    process.env.USE_MOCK_OPENAI = 'true';
  });

  describe('Mock Embeddings', () => {
    it('should generate mock embeddings without API calls', async () => {
      const embedding = await generateEmbedding('test text');
      
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(1536); // Standard OpenAI embedding size
      expect(typeof embedding[0]).toBe('number');
    });

    it('should generate multiple mock embeddings', async () => {
      const embeddings = await generateEmbeddings(['text 1', 'text 2']);
      
      expect(embeddings).toBeDefined();
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings.length).toBe(2);
      expect(embeddings[0].length).toBe(1536);
      expect(embeddings[1].length).toBe(1536);
    });

    it('should generate deterministic mock embeddings', async () => {
      const embedding1 = await generateEmbedding('test');
      const embedding2 = await generateEmbedding('test');
      
      expect(embedding1).toEqual(embedding2);
    });
  });

  describe('Mock Completions', () => {
    it('should generate mock completions without API calls', async () => {
      const completion = await generateCompletion('Hello world');
      
      expect(completion).toBeDefined();
      expect(typeof completion).toBe('string');
      expect(completion).toContain('Mock response to: Hello world');
    });

    it('should generate mock RAG responses', async () => {
      const response = await generateRAGResponse(
        'What is Node.js?',
        ['Node.js is a runtime environment', 'Node.js uses V8 engine']
      );
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response).toContain('Mock response to: What is Node.js?');
    });

    it('should include system prompt in mock response', async () => {
      const completion = await generateCompletion('Hello', {
        systemPrompt: 'You are a helpful assistant'
      });
      
      expect(completion).toContain('System: You are a helpful assistant');
    });
  });
});
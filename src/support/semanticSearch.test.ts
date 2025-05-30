import { Doc, loadDocs, embedAllDocs, findRelevantDocs, cosineSimilarity } from './semanticSearch';

describe('semanticSearch', () => {
  describe('cosineSimilarity', () => {
    it('calculates cosine similarity correctly', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3];
      const c = [3, 2, 1];
      expect(cosineSimilarity(a, b)).toBeCloseTo(1);
      expect(cosineSimilarity(a, c)).toBeCloseTo((1 * 3 + 2 * 2 + 3 * 1) / (Math.sqrt(14) * Math.sqrt(14)));
    });

    it('returns 0 when a vector is zero', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    });
  });

  describe('embedAllDocs', () => {
    it('embeds all docs without embedding property', async () => {
      const docs: Doc[] = [
        { id: '1', text: 'a' },
        { id: '2', text: 'b' },
      ];
      const openai = {
        embeddings: {
          create: async ({ input }: any) => ({ data: [{ embedding: [1, 2, 3] }] }),
        },
      };
      await embedAllDocs(openai, docs);
      expect(docs[0].embedding).toEqual([1, 2, 3]);
      expect(docs[1].embedding).toEqual([1, 2, 3]);
    });
  });

  describe('findRelevantDocs', () => {
    it('finds top relevant docs based on query', async () => {
      const docs: Doc[] = [
        { id: '1', text: 'foo', embedding: [1, 0] },
        { id: '2', text: 'bar', embedding: [0, 1] },
      ];
      const openai = {
        embeddings: {
          create: async ({ input }: any) => ({ data: [{ embedding: [1, 0] }] }),
        },
      };
      const results = await findRelevantDocs(openai, docs, 'query', 2);
      expect(results[0].id).toBe('1');
      expect(results[1].id).toBe('2');
    });
  });

  describe('loadDocs', () => {
    it('loads docs from markdown and splits correctly', async () => {
      const docs = await loadDocs();
      expect(docs.length).toBeGreaterThan(0);
      expect(docs[0]).toHaveProperty('id');
      expect(docs[0]).toHaveProperty('text');
    });
    it('loads the fruits dataset correctly', async () => {
      const docs = await loadDocs('example-fruits');
      expect(docs.length).toBeGreaterThan(0);
      const hasApple = docs.some(d => d.text.includes('Apple'));
      expect(hasApple).toBe(true);
    });
  });
});
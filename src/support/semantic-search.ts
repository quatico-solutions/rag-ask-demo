import { OpenAI } from "openai";
import { Doc, DocumentLoader, MarkdownDocumentLoader } from '../dataset/DocumentLoader';
import { EmbeddingCache } from './embedding-cache';

export { Doc };

const defaultLoader = new MarkdownDocumentLoader();

export async function loadDocs(dataSet: string = 'example-nodejs', loader: DocumentLoader = defaultLoader): Promise<Doc[]> {
  return loader.loadDocuments(dataSet);
}

/**
 * Embeds all documents in-place, using cached embeddings when available.
 * Automatically caches new embeddings for future use.
 * @param openai - OpenAI client instance
 * @param documents - Array of documents to embed
 * @param dataSet - Dataset name for cache management
 * @returns Promise that resolves when all documents are embedded
 */
export async function embedAllDocs(openai: any, documents: Doc[], dataSet?: string): Promise<void> {
  if (dataSet) {
    const cache = new EmbeddingCache(dataSet);
    const cachedCount = await cache.loadCachedEmbeddings(documents);
    const newEmbeddings = await cache.embedDocuments(openai, documents);
    console.log(`Embeddings: ${cachedCount} loaded from cache, ${newEmbeddings} newly created`);
  } else {
    for (const doc of documents) {
      if (!doc.embedding) {
        const resp = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: doc.text,
        });
        doc.embedding = resp.data[0].embedding;
      }
    }
  }
}

/**
 * Find the most relevant documents for a query using semantic similarity.
 * @param openai - OpenAI client instance
 * @param documents - Array of documents to search through (must have embeddings)
 * @param query - The search query to find relevant documents for
 * @param n - Number of top results to return (default: 2)
 * @returns Promise resolving to array of most relevant documents
 */
export async function findRelevantDocs(openai: any, documents: Doc[], query: string, n = 2): Promise<Doc[]> {
  const resp = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  const qEmbed = resp.data[0].embedding;
  const scored = documents.map(doc => ({
    doc,
    score: doc.embedding ? cosineSimilarity(doc.embedding, qEmbed) : -Infinity
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(s => s.doc);
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
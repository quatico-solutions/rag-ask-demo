import { Doc, DocumentLoader, MarkdownDocumentLoader } from '../dataset/DocumentLoader';
import { generateEmbedding, cosineSimilarity } from '../ai/embeddings';
import { EmbeddingCacheAI } from './embedding-cache';

// Re-export cosineSimilarity for tests
export { cosineSimilarity };

export type { Doc };

const defaultLoader = new MarkdownDocumentLoader();

export async function loadDocs(dataSet: string = 'example-nodejs', loader: DocumentLoader = defaultLoader): Promise<Doc[]> {
  return loader.loadDocuments(dataSet);
}

/**
 * Embeds all documents in-place using the AI SDK, using cached embeddings when available.
 * Automatically caches new embeddings for future use.
 * @param documents - Array of documents to embed
 * @param dataSet - Dataset name for cache management
 * @returns Promise that resolves when all documents are embedded
 */
export async function embedAllDocsWithAI(documents: Doc[], dataSet?: string): Promise<void> {
  if (dataSet) {
    const cache = new EmbeddingCacheAI(dataSet);
    const cachedCount = await cache.loadCachedEmbeddings(documents);
    const newEmbeddings = await cache.embedDocuments(documents);
    console.log(`Embeddings: ${cachedCount} loaded from cache, ${newEmbeddings} newly created`);
  } else {
    for (const doc of documents) {
      if (!doc.embedding) {
        doc.embedding = await generateEmbedding(doc.text);
      }
    }
  }
}

/**
 * Find the most relevant documents for a query using semantic similarity with AI SDK.
 * @param documents - Array of documents to search through (must have embeddings)
 * @param query - The search query to find relevant documents for
 * @param n - Number of top results to return (default: 2)
 * @returns Promise resolving to array of most relevant documents
 */
export async function findRelevantDocsWithAI(documents: Doc[], query: string, n = 2): Promise<Doc[]> {
  const qEmbed = await generateEmbedding(query);
  const scored = documents.map(doc => ({
    doc,
    score: doc.embedding ? cosineSimilarity(doc.embedding, qEmbed) : -Infinity
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(s => s.doc);
}

// Legacy functions for backward compatibility
export const embedAllDocs = embedAllDocsWithAI;
export const findRelevantDocs = findRelevantDocsWithAI;
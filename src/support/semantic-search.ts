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
    // Use caching when dataset is provided
    const cache = new EmbeddingCache(dataSet);
    
    // First, try to load cached embeddings
    const cachedCount = await cache.loadCachedEmbeddings(documents);
    
    // Then embed any remaining documents and cache them
    const newEmbeddings = await cache.embedDocuments(openai, documents);
    
    console.log(`Embeddings: ${cachedCount} loaded from cache, ${newEmbeddings} newly created`);
  } else {
    // Fallback to original behavior without caching
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

// Returns top N most similar docs to the query
export async function findRelevantDocs(openai: any, documents: Doc[], query: string, n = 2): Promise<Doc[]> {
  const resp = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  const qEmbed = resp.data[0].embedding;
  // Score all docs
  const scored = documents.map(doc => ({
    doc,
    score: doc.embedding ? cosineSimilarity(doc.embedding, qEmbed) : -Infinity
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(s => s.doc);
}

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
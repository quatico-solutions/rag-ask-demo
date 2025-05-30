import { OpenAI } from "openai";
import { Doc, DocumentLoader, MarkdownDocumentLoader } from '../dataset/DocumentLoader';

export { Doc };

const defaultLoader = new MarkdownDocumentLoader();

export async function loadDocs(dataSet: string = 'example-nodejs', loader: DocumentLoader = defaultLoader): Promise<Doc[]> {
  return loader.loadDocuments(dataSet);
}

// Embeds all docs in-place
export async function embedAllDocs(openai: any, documents: Doc[]): Promise<void> {
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
import { OpenAI } from "openai";

export interface Doc {
  id: string;
  text: string;
  embedding?: number[];
}

// Load example documents from markdown file
import { readFile } from 'fs/promises';

export async function loadDocs(): Promise<Doc[]> {
  const data = await readFile(`${process.cwd()}/data/example-nodejs/docs.md`, 'utf-8');
  // Remove YAML frontmatter if present
  const content = data.replace(/^---\n[\s\S]*?\n---\n?/, '');
  // Split on markdown separator and trim
  const blocks = content.split(/^\*{3}$/m).map(b => b.trim()).filter(Boolean);
  return blocks.map((text, idx) => ({ id: (idx + 1).toString(), text }));
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

function cosineSimilarity(a: number[], b: number[]): number {
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
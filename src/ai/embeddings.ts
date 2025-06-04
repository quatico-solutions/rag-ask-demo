import { embed, embedMany } from 'ai';
import { getAIConfig, createProviders, getProvider } from './provider-config';

/**
 * Mock embedding function for testing that returns a simple vector.
 */
function mockGenerateEmbedding(text: string): number[] {
  // Generate deterministic embedding based on text length for testing
  const length = 1536; // Standard OpenAI embedding size
  return Array(length).fill(0).map((_, i) => (text.length + i) / 1000);
}

/**
 * Generate an embedding vector for a single text input.
 * 
 * @param text - The text to generate an embedding for
 * @returns Promise resolving to the embedding vector
 * 
 * @example
 * ```typescript
 * const embedding = await generateEmbedding("Hello world");
 * console.log(embedding.length); // 1536 for text-embedding-ada-002
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Use mock for testing
  if (process.env.USE_MOCK_OPENAI === 'true') {
    return mockGenerateEmbedding(text);
  }

  const config = getAIConfig();
  const providers = createProviders(config);
  const provider = getProvider(providers, config.embeddingProvider);

  const { embedding } = await embed({
    model: provider.embedding(config.embeddingModel),
    value: text,
  });

  return embedding;
}

/**
 * Generate embedding vectors for multiple text inputs in a single request.
 * More efficient than calling generateEmbedding() multiple times.
 * 
 * @param texts - Array of texts to generate embeddings for
 * @returns Promise resolving to array of embedding vectors
 * 
 * @example
 * ```typescript
 * const embeddings = await generateEmbeddings([
 *   "First document text",
 *   "Second document text"
 * ]);
 * console.log(embeddings.length); // 2
 * ```
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Use mock for testing
  if (process.env.USE_MOCK_OPENAI === 'true') {
    return texts.map(text => mockGenerateEmbedding(text));
  }

  const config = getAIConfig();
  const providers = createProviders(config);
  const provider = getProvider(providers, config.embeddingProvider);

  const { embeddings } = await embedMany({
    model: provider.embedding(config.embeddingModel),
    values: texts,
  });

  return embeddings;
}

/**
 * Calculate cosine similarity between two embedding vectors.
 * 
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 * 
 * @example
 * ```typescript
 * const similarity = cosineSimilarity(embedding1, embedding2);
 * if (similarity > 0.8) {
 *   console.log("Documents are very similar");
 * }
 * ```
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding vectors must have the same length. Got ${a.length} and ${b.length} dimensions.`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find the most similar embeddings to a query embedding using cosine similarity.
 * 
 * @param queryEmbedding - The query embedding vector
 * @param embeddings - Array of embedding vectors to search through
 * @param topK - Number of top results to return (default: 5)
 * @returns Array of objects with index and similarity score, sorted by similarity
 * 
 * @example
 * ```typescript
 * const results = findSimilarEmbeddings(queryEmbedding, documentEmbeddings, 3);
 * results.forEach(result => {
 *   console.log(`Document ${result.index}: similarity ${result.similarity}`);
 * });
 * ```
 */
export function findSimilarEmbeddings(
  queryEmbedding: number[],
  embeddings: number[][],
  topK: number = 5
): Array<{ index: number; similarity: number }> {
  const similarities = embeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));

  // Sort by similarity in descending order and take top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
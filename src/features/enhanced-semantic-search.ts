import {
  Doc,
  DocumentLoader,
} from '../dataset/DocumentLoader';
import { ChunkedDocumentLoader } from '../dataset/ChunkedDocumentLoader';
import { generateEmbedding, cosineSimilarity } from '../ai/embeddings';
import { EmbeddingCacheAI } from '../support/embedding-cache';
import { estimateTokens } from '../dataset/document-chunker';

// Re-export for compatibility
export { cosineSimilarity };
export type { Doc };

/**
 * Enhanced document type that includes relevance metadata
 */
export interface ScoredDoc extends Doc {
  score: number;
  highlights?: string[];
  metadata?: {
    documentId?: string;
    chunkIndex?: number;
    totalChunks?: number;
    isChunk?: boolean;
  };
}

/**
 * Configuration for enhanced semantic search
 */
export interface SearchConfig {
  /** Maximum number of results to return */
  maxResults?: number;
  /** Maximum tokens for chunking documents */
  maxTokensPerChunk?: number;
  /** Overlap tokens between chunks */
  overlapTokens?: number;
  /** Whether to preserve sentence boundaries */
  preserveSentences?: boolean;
  /** Whether to enable hybrid search (combining embeddings with keywords) */
  enableHybridSearch?: boolean;
  /** Weight for embedding similarity (0-1, remainder goes to keyword score) */
  embeddingWeight?: number;
}

const DEFAULT_CONFIG: Required<SearchConfig> = {
  maxResults: 2,
  maxTokensPerChunk: 500,
  overlapTokens: 100,
  preserveSentences: true,
  enableHybridSearch: true,
  embeddingWeight: 0.7,
};

/**
 * Load documents with automatic chunking for large documents
 */
export async function loadDocsWithChunking(
  dataSet: string,
  config: SearchConfig = {}
): Promise<Doc[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const loader = new ChunkedDocumentLoader({
    maxTokens: mergedConfig.maxTokensPerChunk,
    overlapTokens: mergedConfig.overlapTokens,
    preserveSentences: mergedConfig.preserveSentences,
  });
  
  return loader.loadDocuments(dataSet);
}

/**
 * Simple keyword scoring function
 * Returns a score based on term frequency and exact matches
 */
export function calculateKeywordScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match bonus
  if (textLower.includes(queryLower)) {
    return 10.0;
  }
  
  // Individual token matching
  const queryTokens = queryLower.split(/\W+/).filter(t => t.length > 0);
  const textTokens = textLower.split(/\W+/).filter(t => t.length > 0);
  const textTokenSet = new Set(textTokens);
  
  let score = 0;
  for (const qToken of queryTokens) {
    if (textTokenSet.has(qToken)) {
      // Basic TF scoring with document length normalization
      const termFrequency = textTokens.filter(t => t === qToken).length;
      score += termFrequency / Math.log(textTokens.length + 1);
    }
  }
  
  return score;
}

/**
 * Highlight matching keywords in text
 */
export function highlightKeywords(query: string, text: string): string[] {
  const queryTokens = query.toLowerCase().split(/\W+/).filter(t => t.length > 0);
  const highlights: string[] = [];
  
  // Find exact query match
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const exactMatchIndex = textLower.indexOf(queryLower);
  
  if (exactMatchIndex !== -1) {
    // Extract context around exact match
    const start = Math.max(0, exactMatchIndex - 50);
    const end = Math.min(text.length, exactMatchIndex + queryLower.length + 50);
    let highlight = text.substring(start, end);
    
    if (start > 0) highlight = '...' + highlight;
    if (end < text.length) highlight = highlight + '...';
    
    highlights.push(highlight);
  } else {
    // Find individual token matches
    for (const token of queryTokens) {
      const tokenIndex = textLower.indexOf(token);
      if (tokenIndex !== -1) {
        const start = Math.max(0, tokenIndex - 30);
        const end = Math.min(text.length, tokenIndex + token.length + 30);
        let highlight = text.substring(start, end);
        
        if (start > 0) highlight = '...' + highlight;
        if (end < text.length) highlight = highlight + '...';
        
        highlights.push(highlight);
        break; // Only show first match for brevity
      }
    }
  }
  
  return highlights;
}

/**
 * Enhanced version of findRelevantDocs with hybrid search support
 */
export async function findRelevantDocsEnhanced(
  documents: Doc[],
  query: string,
  config: SearchConfig = {}
): Promise<ScoredDoc[]> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // Score all documents
  const scoredDocs: ScoredDoc[] = documents.map((doc) => {
    // Calculate embedding similarity
    const embeddingScore = doc.embedding 
      ? cosineSimilarity(doc.embedding, queryEmbedding)
      : 0;
    
    // Calculate keyword score if hybrid search is enabled
    let keywordScore = 0;
    let highlights: string[] = [];
    
    if (mergedConfig.enableHybridSearch) {
      keywordScore = calculateKeywordScore(query, doc.text);
      highlights = highlightKeywords(query, doc.text);
    }
    
    // Combine scores
    const combinedScore = mergedConfig.enableHybridSearch
      ? (embeddingScore * mergedConfig.embeddingWeight) + 
        (keywordScore * (1 - mergedConfig.embeddingWeight))
      : embeddingScore;
    
    return {
      ...doc,
      score: combinedScore,
      highlights,
      metadata: (doc as any).metadata,
    };
  });
  
  // Sort by score and apply result diversification
  scoredDocs.sort((a, b) => b.score - a.score);
  
  // If we have chunks, apply diversity to avoid too many chunks from same document
  const diversifiedResults = applyResultDiversification(scoredDocs, mergedConfig.maxResults);
  
  return diversifiedResults;
}

/**
 * Apply result diversification to avoid returning too many chunks from the same document
 */
function applyResultDiversification(
  scoredDocs: ScoredDoc[],
  maxResults: number
): ScoredDoc[] {
  const results: ScoredDoc[] = [];
  const documentCounts = new Map<string, number>();
  const maxChunksPerDocument = Math.ceil(maxResults / 2); // At most half the results from one doc
  
  for (const doc of scoredDocs) {
    const docId = doc.metadata?.documentId || doc.id;
    const currentCount = documentCounts.get(docId) || 0;
    
    // Add document if we haven't hit the per-document limit
    if (currentCount < maxChunksPerDocument) {
      results.push(doc);
      documentCounts.set(docId, currentCount + 1);
      
      if (results.length >= maxResults) {
        break;
      }
    }
  }
  
  // If we didn't get enough results due to diversity, fill with remaining high-scoring docs
  if (results.length < maxResults) {
    for (const doc of scoredDocs) {
      if (!results.includes(doc)) {
        results.push(doc);
        if (results.length >= maxResults) {
          break;
        }
      }
    }
  }
  
  return results;
}

/**
 * Embed all documents with caching support (works with chunks)
 */
export async function embedAllDocsEnhanced(
  documents: Doc[],
  dataSet?: string
): Promise<void> {
  if (dataSet) {
    const cache = new EmbeddingCacheAI(dataSet);
    const cachedCount = await cache.loadCachedEmbeddings(documents);
    const newEmbeddings = await cache.embedDocuments(documents);
    console.log(
      `Embeddings: ${cachedCount} loaded from cache, ${newEmbeddings} newly created`
    );
  } else {
    for (const doc of documents) {
      if (!doc.embedding) {
        doc.embedding = await generateEmbedding(doc.text);
      }
    }
  }
}

/**
 * Main enhanced search function that combines all features
 */
export async function semanticSearchEnhanced(
  dataSet: string,
  query: string,
  config: SearchConfig = {}
): Promise<ScoredDoc[]> {
  // Load documents with chunking
  const documents = await loadDocsWithChunking(dataSet, config);
  
  // Embed all documents (with caching)
  await embedAllDocsEnhanced(documents, dataSet);
  
  // Find relevant documents with enhanced search
  return findRelevantDocsEnhanced(documents, query, config);
}
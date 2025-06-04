import { createHash } from 'node:crypto';

/**
 * Options for document chunking
 */
export interface ChunkOptions {
  /** Maximum tokens per chunk (rough estimate using 1.3 tokens per word) */
  maxTokens?: number;
  /** Number of tokens to overlap between chunks */
  overlapTokens?: number;
  /** Whether to preserve sentence boundaries when chunking */
  preserveSentences?: boolean;
}

/**
 * Represents a chunk of a document
 */
export interface Chunk {
  /** Unique identifier for this chunk */
  id: string;
  /** ID of the source document */
  documentId: string;
  /** The text content of this chunk */
  text: string;
  /** Character offset where this chunk starts in the original document */
  startOffset: number;
  /** Character offset where this chunk ends in the original document */
  endOffset: number;
  /** Index of this chunk within the document */
  chunkIndex: number;
  /** Total number of chunks in the document */
  totalChunks: number;
  /** Optional metadata */
  metadata?: Record<string, any>;
}

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxTokens: 500,
  overlapTokens: 100,
  preserveSentences: true,
};

/**
 * Estimates token count for a text string
 * Uses rough approximation of 1.3 tokens per word
 */
export function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length * 1.3);
}

/**
 * Splits text into sentences
 * Handles common sentence endings and preserves the delimiters
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence endings but keep the delimiter
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.filter(s => s.trim().length > 0);
}

/**
 * Creates a unique ID for a chunk based on document ID and content
 */
function createChunkId(documentId: string, chunkIndex: number, text: string): string {
  const hash = createHash('sha256')
    .update(`${documentId}-${chunkIndex}-${text.substring(0, 100)}`)
    .digest('hex');
  return hash.substring(0, 16);
}

/**
 * Chunks a document into smaller pieces
 * @param documentId - Unique identifier for the document
 * @param text - The full text of the document
 * @param options - Chunking options
 * @returns Array of chunks
 */
export function chunkDocument(
  documentId: string,
  text: string,
  options: ChunkOptions = {}
): Chunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: Chunk[] = [];
  
  if (!text.trim()) {
    return chunks;
  }

  if (opts.preserveSentences) {
    const sentences = splitIntoSentences(text);
    let currentChunkText = '';
    let currentTokenCount = 0;
    let chunkStartOffset = 0;
    let overlapSentences: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = estimateTokens(sentence);
      
      // If adding this sentence would exceed max tokens and we have content
      if (currentTokenCount + sentenceTokens > opts.maxTokens && currentChunkText) {
        // Create chunk
        const chunkEndOffset = chunkStartOffset + currentChunkText.length;
        chunks.push({
          id: createChunkId(documentId, chunks.length, currentChunkText),
          documentId,
          text: currentChunkText.trim(),
          startOffset: chunkStartOffset,
          endOffset: chunkEndOffset,
          chunkIndex: chunks.length,
          totalChunks: 0, // Will be updated later
        });
        
        // Prepare overlap for next chunk
        overlapSentences = [];
        let overlapTokenCount = 0;
        
        // Go backwards to collect overlap sentences
        for (let j = i - 1; j >= 0 && overlapTokenCount < opts.overlapTokens; j--) {
          const overlapSentence = sentences[j];
          const overlapSentenceTokens = estimateTokens(overlapSentence);
          if (overlapTokenCount + overlapSentenceTokens <= opts.overlapTokens) {
            overlapSentences.unshift(overlapSentence);
            overlapTokenCount += overlapSentenceTokens;
          } else {
            break;
          }
        }
        
        // Start new chunk with overlap
        currentChunkText = overlapSentences.join(' ');
        currentTokenCount = overlapTokenCount;
        chunkStartOffset = chunkEndOffset - currentChunkText.length;
      }
      
      // Add sentence to current chunk
      if (currentChunkText) currentChunkText += ' ';
      currentChunkText += sentence;
      currentTokenCount += sentenceTokens;
    }
    
    // Add final chunk if there's remaining content
    if (currentChunkText.trim()) {
      chunks.push({
        id: createChunkId(documentId, chunks.length, currentChunkText),
        documentId,
        text: currentChunkText.trim(),
        startOffset: chunkStartOffset,
        endOffset: text.length,
        chunkIndex: chunks.length,
        totalChunks: 0,
      });
    }
  } else {
    // Simple chunking without sentence preservation
    const words = text.split(/\s+/);
    let currentChunkWords: string[] = [];
    let currentTokenCount = 0;
    let chunkStartOffset = 0;
    let currentOffset = 0;
    
    for (const word of words) {
      const wordTokens = estimateTokens(word);
      
      if (currentTokenCount + wordTokens > opts.maxTokens && currentChunkWords.length > 0) {
        const chunkText = currentChunkWords.join(' ');
        chunks.push({
          id: createChunkId(documentId, chunks.length, chunkText),
          documentId,
          text: chunkText,
          startOffset: chunkStartOffset,
          endOffset: currentOffset,
          chunkIndex: chunks.length,
          totalChunks: 0,
        });
        
        // Calculate overlap
        const overlapWordCount = Math.floor(opts.overlapTokens / 1.3);
        const startIndex = Math.max(0, currentChunkWords.length - overlapWordCount);
        currentChunkWords = currentChunkWords.slice(startIndex);
        currentTokenCount = estimateTokens(currentChunkWords.join(' '));
        chunkStartOffset = currentOffset - currentChunkWords.join(' ').length;
      }
      
      currentChunkWords.push(word);
      currentTokenCount += wordTokens;
      currentOffset += word.length + 1; // +1 for space
    }
    
    // Add final chunk
    if (currentChunkWords.length > 0) {
      const chunkText = currentChunkWords.join(' ');
      chunks.push({
        id: createChunkId(documentId, chunks.length, chunkText),
        documentId,
        text: chunkText,
        startOffset: chunkStartOffset,
        endOffset: text.length,
        chunkIndex: chunks.length,
        totalChunks: 0,
      });
    }
  }
  
  // Update total chunks count
  const totalChunks = chunks.length;
  chunks.forEach(chunk => {
    chunk.totalChunks = totalChunks;
  });
  
  return chunks;
}

/**
 * Checks if a document should be chunked based on its size
 * @param text - The document text
 * @param maxTokens - Maximum tokens per chunk
 * @returns true if the document should be chunked
 */
export function shouldChunk(text: string, maxTokens: number = DEFAULT_OPTIONS.maxTokens): boolean {
  const tokens = estimateTokens(text);
  return tokens > maxTokens * 1.5; // Only chunk if significantly larger than chunk size
}
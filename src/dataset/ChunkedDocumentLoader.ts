import { readFile } from 'node:fs/promises';
import { stripFrontmatter } from '../view/frontmatter';
import { DocumentLoader, type Doc } from './DocumentLoader';
import { chunkDocument, shouldChunk, type Chunk, type ChunkOptions } from './document-chunker';

/**
 * Enhanced document loader that supports automatic chunking of large documents.
 * Extends MarkdownDocumentLoader to provide backwards compatibility while adding
 * intelligent document chunking for better retrieval.
 * 
 * Features:
 * - Automatically chunks documents larger than the chunk size threshold
 * - Preserves small documents as single chunks for backwards compatibility
 * - Maintains document-chunk relationships through IDs
 * - Configurable chunking behavior
 * 
 * @example
 * ```typescript
 * const loader = new ChunkedDocumentLoader({
 *   maxTokens: 500,
 *   overlapTokens: 100,
 *   preserveSentences: true
 * });
 * const docs = await loader.loadDocuments('example');
 * // Returns both original documents and their chunks
 * ```
 */
export class ChunkedDocumentLoader extends DocumentLoader {
  private chunkOptions: ChunkOptions;

  constructor(chunkOptions: ChunkOptions = {}) {
    super();
    this.chunkOptions = chunkOptions;
  }

  /**
   * Load documents and automatically chunk large ones.
   * Small documents are returned as-is for backwards compatibility.
   * 
   * @param dataSet - The dataset name
   * @returns Array of documents (chunks for large docs, full docs for small ones)
   */
  async loadDocuments(dataSet: string): Promise<Doc[]> {
    const data = await readFile(
      `${process.cwd()}/data/${dataSet}/docs.md`,
      'utf-8'
    );
    const content = stripFrontmatter(data);
    
    // Split on markdown separator
    const blocks = content.split(/^\*{3}$/m).map(b => b.trim()).filter(Boolean);
    
    const documents: Doc[] = [];
    
    for (let idx = 0; idx < blocks.length; idx++) {
      const text = blocks[idx];
      const docId = (idx + 1).toString();
      
      // Check if document should be chunked
      if (shouldChunk(text, this.chunkOptions.maxTokens)) {
        // Chunk large documents
        const chunks = chunkDocument(docId, text, this.chunkOptions);
        
        // Convert chunks to Doc format
        chunks.forEach(chunk => {
          documents.push({
            id: `${docId}-chunk-${chunk.chunkIndex}`,
            text: chunk.text,
            // Store chunk metadata in the doc for reference
            metadata: {
              documentId: chunk.documentId,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunk.totalChunks,
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              isChunk: true
            }
          } as Doc & { metadata: any });
        });
      } else {
        // Keep small documents as single units
        documents.push({
          id: docId,
          text: text,
          metadata: {
            documentId: docId,
            isChunk: false
          }
        } as Doc & { metadata: any });
      }
    }
    
    return documents;
  }

  /**
   * Load original documents without chunking.
   * Useful when you need the full document context.
   * 
   * @param dataSet - The dataset name
   * @returns Array of complete documents
   */
  async loadOriginalDocuments(dataSet: string): Promise<Doc[]> {
    const data = await readFile(
      `${process.cwd()}/data/${dataSet}/docs.md`,
      'utf-8'
    );
    const content = stripFrontmatter(data);
    const blocks = content.split(/^\*{3}$/m).map(b => b.trim()).filter(Boolean);
    return blocks.map((text, idx) => ({ id: (idx + 1).toString(), text }));
  }

  /**
   * Get all chunks for a specific document ID.
   * 
   * @param dataSet - The dataset name
   * @param documentId - The original document ID
   * @returns Array of chunks for the specified document
   */
  async getDocumentChunks(dataSet: string, documentId: string): Promise<Doc[]> {
    const allDocs = await this.loadDocuments(dataSet);
    return allDocs.filter(doc => {
      const metadata = (doc as any).metadata;
      return metadata?.documentId === documentId && metadata?.isChunk === true;
    });
  }
}
import { semanticSearchEnhanced } from './enhanced-semantic-search';
import { generateCompletion } from '../ai/completions';
import { validateResponseWithAttribution, quickValidateResponse } from './response-validation';
import { loadSystemPrompt } from '../dataset/template-loader';

export interface ValidatedRAGResult {
  /** The generated response */
  response: string;
  /** Source documents used */
  sources: Array<{
    id: string;
    text: string;
    score: number;
  }>;
  /** Validation results */
  validation: {
    isGrounded: boolean;
    confidence: number;
    concerns: string[];
    recommendation: 'accept' | 'flag' | 'reject';
    hasSourceAttribution: boolean;
  };
  /** Quick validation results */
  quickValidation: {
    suspiciousKeywords: string[];
    confidence: number;
  };
  /** Whether the response was accepted, flagged, or rejected */
  status: 'accepted' | 'flagged' | 'rejected';
}

/**
 * Performs RAG with built-in response validation to prevent hallucinations.
 * Returns grounded responses with validation metadata.
 */
export async function validatedRAG(
  query: string,
  dataSet: string,
  options: {
    maxResults?: number;
    strictMode?: boolean; // If true, reject any flagged responses
    requireAttribution?: boolean; // If true, require source citations
  } = {}
): Promise<ValidatedRAGResult> {
  const {
    maxResults = 3,
    strictMode = false,
    requireAttribution = true
  } = options;

  // 1. Retrieve relevant documents
  const searchResults = await semanticSearchEnhanced(query, dataSet, {
    maxResults
  });

  if (searchResults.length === 0) {
    return {
      response: "I cannot answer this question as no relevant documents were found.",
      sources: [],
      validation: {
        isGrounded: true, // Truthful response about lack of info
        confidence: 1.0,
        concerns: [],
        recommendation: 'accept',
        hasSourceAttribution: false
      },
      quickValidation: {
        suspiciousKeywords: [],
        confidence: 1.0
      },
      status: 'accepted'
    };
  }

  // 2. Load system prompt
  const systemPrompt = await loadSystemPrompt(dataSet);
  
  // 3. Build context with source attribution
  const context = searchResults
    .map((doc, index) => `[Document ${index + 1}]: ${doc.text}`)
    .join('\n\n');

  // 4. Generate response with enhanced prompt
  const prompt = `${systemPrompt}

CONTEXT DOCUMENTS:
${context}

USER QUESTION: ${query}

Remember: Only use information from the context documents above. If you cannot answer from the documents, say so explicitly.`;

  const response = await generateCompletion(prompt);

  // 5. Quick validation first
  const quickValidation = quickValidateResponse(response, searchResults);

  // 6. Comprehensive validation
  const validation = await validateResponseWithAttribution(
    query,
    response,
    searchResults
  );

  // 7. Determine final status
  let status: 'accepted' | 'flagged' | 'rejected' = 'accepted';
  
  if (validation.recommendation === 'reject') {
    status = 'rejected';
  } else if (validation.recommendation === 'flag') {
    status = strictMode ? 'rejected' : 'flagged';
  } else if (requireAttribution && !validation.hasSourceAttribution) {
    status = strictMode ? 'rejected' : 'flagged';
  }

  // 8. If rejected in strict mode, return a safe response
  if (status === 'rejected' && strictMode) {
    return {
      response: "I cannot provide a reliable answer to this question based on the available documents. Please rephrase your question or check if the information is available in the source materials.",
      sources: searchResults.map(doc => ({
        id: doc.id,
        text: doc.text,
        score: doc.score
      })),
      validation,
      quickValidation,
      status: 'rejected'
    };
  }

  return {
    response,
    sources: searchResults.map(doc => ({
      id: doc.id,
      text: doc.text,
      score: doc.score
    })),
    validation,
    quickValidation,
    status
  };
}

/**
 * Enhanced RAG that tries multiple strategies if initial response fails validation
 */
export async function robustValidatedRAG(
  query: string,
  dataSet: string,
  maxAttempts: number = 3
): Promise<ValidatedRAGResult> {
  let lastResult: ValidatedRAGResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await validatedRAG(query, dataSet, {
      maxResults: Math.min(3 + attempt, 10), // Increase sources each attempt
      strictMode: attempt === maxAttempts, // Use strict mode on final attempt
      requireAttribution: true
    });

    if (result.status === 'accepted') {
      return result;
    }

    lastResult = result;

    // If flagged, try with more context
    if (result.status === 'flagged' && attempt < maxAttempts) {
      console.log(`Attempt ${attempt} flagged, trying with more context...`);
      continue;
    }
  }

  return lastResult || {
    response: "Unable to generate a reliable response after multiple attempts.",
    sources: [],
    validation: {
      isGrounded: false,
      confidence: 0,
      concerns: ['Multiple validation failures'],
      recommendation: 'reject',
      hasSourceAttribution: false
    },
    quickValidation: {
      suspiciousKeywords: [],
      confidence: 0
    },
    status: 'rejected'
  };
}
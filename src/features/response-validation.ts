import { generateCompletion } from '../ai/completions';
import { Doc } from '../dataset/DocumentLoader';

/**
 * Validation result for a RAG response
 */
export interface ValidationResult {
  /** Whether the response appears to be grounded in the provided documents */
  isGrounded: boolean;
  /** Confidence score (0-1) that the response is factual based on documents */
  confidence: number;
  /** Specific concerns or validation notes */
  concerns: string[];
  /** Recommended action: 'accept', 'flag', 'reject' */
  recommendation: 'accept' | 'flag' | 'reject';
}

/**
 * Validates that a RAG response is grounded in the provided source documents.
 * Uses LLM-based validation to check for hallucinations or external knowledge.
 */
export async function validateResponse(
  question: string,
  response: string,
  sourceDocuments: Doc[]
): Promise<ValidationResult> {
  const sourceText = sourceDocuments.map(doc => doc.text).join('\n\n');
  
  const validationPrompt = `You are a fact-checking assistant. Your job is to validate whether a response to a question is ONLY based on the provided source documents.

QUESTION: ${question}

RESPONSE TO VALIDATE: ${response}

SOURCE DOCUMENTS:
${sourceText}

Analyze the response and determine:
1. Does the response contain ANY information not present in the source documents?
2. Are there any claims that seem to come from general knowledge rather than the documents?
3. Are there any facts, numbers, dates, or details not explicitly mentioned in the sources?

Respond with a JSON object:
{
  "isGrounded": boolean,
  "confidence": number (0-1),
  "concerns": ["list of specific concerns"],
  "recommendation": "accept" | "flag" | "reject",
  "reasoning": "brief explanation"
}

Be strict - if you find ANY information that's not in the source documents, mark as not grounded.`;

  try {
    const validationResponse = await generateCompletion(validationPrompt);
    
    // Parse the JSON response
    const validation = JSON.parse(validationResponse) as ValidationResult & { reasoning: string };
    
    return {
      isGrounded: validation.isGrounded,
      confidence: validation.confidence,
      concerns: validation.concerns || [],
      recommendation: validation.recommendation
    };
  } catch (error) {
    console.error('Error validating response:', error);
    // Return conservative validation on error
    return {
      isGrounded: false,
      confidence: 0,
      concerns: ['Validation failed due to technical error'],
      recommendation: 'flag'
    };
  }
}

/**
 * Enhanced response validation that also checks for source attribution
 */
export async function validateResponseWithAttribution(
  question: string,
  response: string,
  sourceDocuments: Doc[]
): Promise<ValidationResult & { hasSourceAttribution: boolean }> {
  const baseValidation = await validateResponse(question, response, sourceDocuments);
  
  // Check if response includes source attribution
  const hasSourceAttribution = /source:|from:|according to|as stated in|document/i.test(response);
  
  // Adjust recommendation based on attribution
  let recommendation = baseValidation.recommendation;
  if (baseValidation.isGrounded && !hasSourceAttribution) {
    recommendation = 'flag'; // Flag responses without source attribution
    baseValidation.concerns.push('Response lacks source attribution');
  }
  
  return {
    ...baseValidation,
    hasSourceAttribution,
    recommendation
  };
}

/**
 * Simple keyword-based validation as a fast pre-filter
 */
export function quickValidateResponse(
  response: string,
  sourceDocuments: Doc[]
): { suspiciousKeywords: string[]; confidence: number } {
  // Keywords that often indicate external knowledge
  const suspiciousKeywords = [
    'generally', 'typically', 'usually', 'commonly', 'often',
    'most experts', 'studies show', 'research indicates',
    'it is known that', 'scientists believe', 'according to science'
  ];
  
  const found = suspiciousKeywords.filter(keyword => 
    response.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Simple confidence based on suspicious keyword presence
  const confidence = Math.max(0, 1 - (found.length * 0.3));
  
  return {
    suspiciousKeywords: found,
    confidence
  };
}
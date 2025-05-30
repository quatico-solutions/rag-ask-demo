import { generateText } from 'ai';
import { getAIConfig, createProviders, getProvider } from './provider-config';

/**
 * Configuration for completion requests.
 */
export interface CompletionOptions {
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Temperature for response randomness (0.0 to 1.0) */
  temperature?: number;
  /** System prompt to set context */
  systemPrompt?: string;
}

/**
 * Generate a text completion using the configured AI provider.
 * 
 * @param prompt - The user prompt to complete
 * @param options - Additional options for the completion
 * @returns Promise resolving to the generated text
 * 
 * @example
 * ```typescript
 * const response = await generateCompletion(
 *   "What is the capital of France?",
 *   { temperature: 0.7, maxTokens: 100 }
 * );
 * console.log(response); // "The capital of France is Paris."
 * ```
 */
export async function generateCompletion(
  prompt: string, 
  options: CompletionOptions = {}
): Promise<string> {
  const config = getAIConfig();
  const providers = createProviders(config);
  const provider = getProvider(providers, config.completionProvider);

  const { text } = await generateText({
    model: provider(config.completionModel),
    messages: [
      ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
      { role: 'user' as const, content: prompt }
    ],
    maxTokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
  });

  return text;
}

/**
 * Generate a RAG (Retrieval-Augmented Generation) response using context documents.
 * 
 * @param query - The user's question
 * @param context - Array of relevant document texts to use as context
 * @param options - Additional options for the completion
 * @returns Promise resolving to the generated response
 * 
 * @example
 * ```typescript
 * const response = await generateRAGResponse(
 *   "How do I install Node.js?",
 *   ["Node.js can be installed from nodejs.org...", "npm comes bundled with Node.js..."],
 *   { temperature: 0.3 }
 * );
 * ```
 */
export async function generateRAGResponse(
  query: string,
  context: string[],
  options: CompletionOptions = {}
): Promise<string> {
  const systemPrompt = options.systemPrompt || `You are a helpful AI assistant. Use the provided context documents to answer the user's question. If the context doesn't contain enough information to answer the question, say so clearly.

Context documents:
${context.map((doc, i) => `${i + 1}. ${doc}`).join('\n\n')}`;

  return generateCompletion(query, {
    ...options,
    systemPrompt,
    temperature: options.temperature || 0.3, // Lower temperature for more factual responses
  });
}
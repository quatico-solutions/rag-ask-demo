import { openai } from '@ai-sdk/openai';
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Supported AI providers for completions and embeddings.
 */
export type AIProvider = 'openai' | 'lmstudio';

/**
 * Configuration for AI provider settings.
 */
export interface AIConfig {
  /** The provider to use for completions (chat) */
  completionProvider: AIProvider;
  /** The model to use for completions */
  completionModel: string;
  /** The provider to use for embeddings */
  embeddingProvider: AIProvider;
  /** The model to use for embeddings */
  embeddingModel: string;
  /** OpenAI API key (required for OpenAI provider) */
  openaiApiKey?: string;
  /** LMStudio base URL (required for LMStudio provider) */
  lmstudioBaseUrl?: string;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: AIConfig = {
  completionProvider: 'openai',
  completionModel: 'gpt-3.5-turbo',
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-ada-002',
};

/**
 * Parse and validate AI configuration from environment variables.
 * 
 * Environment variables:
 * - AI_COMPLETION_PROVIDER: 'openai' or 'lmstudio'
 * - AI_COMPLETION_MODEL: Model name for completions
 * - AI_EMBEDDING_PROVIDER: 'openai' or 'lmstudio'  
 * - AI_EMBEDDING_MODEL: Model name for embeddings
 * - OPENAI_API_KEY: OpenAI API key
 * - LMSTUDIO_BASE_URL: LMStudio server base URL
 * 
 * @returns Validated AI configuration
 */
export function getAIConfig(): AIConfig {
  const config: AIConfig = {
    completionProvider: (process.env.AI_COMPLETION_PROVIDER as AIProvider) || DEFAULT_CONFIG.completionProvider,
    completionModel: process.env.AI_COMPLETION_MODEL || DEFAULT_CONFIG.completionModel,
    embeddingProvider: (process.env.AI_EMBEDDING_PROVIDER as AIProvider) || DEFAULT_CONFIG.embeddingProvider,
    embeddingModel: process.env.AI_EMBEDDING_MODEL || DEFAULT_CONFIG.embeddingModel,
    openaiApiKey: process.env.OPENAI_API_KEY,
    lmstudioBaseUrl: process.env.LMSTUDIO_BASE_URL,
  };

  // Validate provider values
  const validProviders: AIProvider[] = ['openai', 'lmstudio'];
  if (!validProviders.includes(config.completionProvider)) {
    throw new Error(`Invalid completion provider: ${config.completionProvider}. Must be one of: ${validProviders.join(', ')}`);
  }
  if (!validProviders.includes(config.embeddingProvider)) {
    throw new Error(`Invalid embedding provider: ${config.embeddingProvider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate required API keys/URLs
  if (config.completionProvider === 'openai' || config.embeddingProvider === 'openai') {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY is required when using OpenAI provider');
    }
  }
  if (config.completionProvider === 'lmstudio' || config.embeddingProvider === 'lmstudio') {
    if (!config.lmstudioBaseUrl) {
      throw new Error('LMSTUDIO_BASE_URL is required when using LMStudio provider');
    }
  }

  return config;
}

/**
 * Create AI SDK provider instances based on configuration.
 * 
 * @param config - AI configuration
 * @returns Object with provider instances
 */
export function createProviders(config: AIConfig) {
  const providers: Record<string, any> = {};

  // Create OpenAI provider if needed
  if (config.completionProvider === 'openai' || config.embeddingProvider === 'openai') {
    // OpenAI provider uses env variable OPENAI_API_KEY by default
    providers.openai = openai;
  }

  // Create LMStudio provider if needed
  if (config.completionProvider === 'lmstudio' || config.embeddingProvider === 'lmstudio') {
    providers.lmstudio = createOpenAI({
      baseURL: config.lmstudioBaseUrl!,
      apiKey: 'lm-studio', // LMStudio doesn't require a real API key
    });
  }

  return providers;
}

/**
 * Get the appropriate provider instance for a given provider type.
 * 
 * @param providers - Provider instances from createProviders()
 * @param providerType - The provider type to get
 * @returns The provider instance
 */
export function getProvider(providers: Record<string, any>, providerType: AIProvider) {
  const provider = providers[providerType];
  if (!provider) {
    throw new Error(`Provider ${providerType} not initialized`);
  }
  return provider;
}
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
 * Configuration validation error with helpful guidance.
 */
class ConfigurationError extends Error {
  constructor(message: string, variable: string, example?: string) {
    let fullMessage = `Configuration Error: ${message}\n`;
    fullMessage += `Missing or invalid environment variable: ${variable}\n`;
    if (example) {
      fullMessage += `Example: ${variable}=${example}\n`;
    }
    fullMessage += 'Please check your .env file or environment variables.';
    super(fullMessage);
    this.name = 'ConfigurationError';
  }
}

/**
 * Parse and validate AI configuration from environment variables.
 * Throws ConfigurationError with helpful guidance if required variables are missing.
 * 
 * Required environment variables:
 * - AI_COMPLETION_PROVIDER: 'openai' or 'lmstudio'
 * - AI_COMPLETION_MODEL: Model name for completions
 * - AI_EMBEDDING_PROVIDER: 'openai' or 'lmstudio'  
 * - AI_EMBEDDING_MODEL: Model name for embeddings
 * - OPENAI_API_KEY: OpenAI API key (when using OpenAI provider)
 * - LMSTUDIO_BASE_URL: LMStudio server base URL (when using LMStudio provider)
 * 
 * @returns Validated AI configuration
 * @throws {ConfigurationError} When required configuration is missing or invalid
 */
export function getAIConfig(): AIConfig {
  // Validate required environment variables
  const completionProvider = process.env.AI_COMPLETION_PROVIDER as AIProvider;
  if (!completionProvider) {
    throw new ConfigurationError(
      'Completion provider must be specified',
      'AI_COMPLETION_PROVIDER',
      'openai'
    );
  }

  const completionModel = process.env.AI_COMPLETION_MODEL;
  if (!completionModel) {
    throw new ConfigurationError(
      'Completion model must be specified',
      'AI_COMPLETION_MODEL',
      'gpt-3.5-turbo'
    );
  }

  const embeddingProvider = process.env.AI_EMBEDDING_PROVIDER as AIProvider;
  if (!embeddingProvider) {
    throw new ConfigurationError(
      'Embedding provider must be specified',
      'AI_EMBEDDING_PROVIDER',
      'openai'
    );
  }

  const embeddingModel = process.env.AI_EMBEDDING_MODEL;
  if (!embeddingModel) {
    throw new ConfigurationError(
      'Embedding model must be specified',
      'AI_EMBEDDING_MODEL',
      'text-embedding-ada-002'
    );
  }

  // Validate provider values
  const validProviders: AIProvider[] = ['openai', 'lmstudio'];
  if (!validProviders.includes(completionProvider)) {
    throw new ConfigurationError(
      `Invalid completion provider: ${completionProvider}. Must be one of: ${validProviders.join(', ')}`,
      'AI_COMPLETION_PROVIDER',
      'openai'
    );
  }
  if (!validProviders.includes(embeddingProvider)) {
    throw new ConfigurationError(
      `Invalid embedding provider: ${embeddingProvider}. Must be one of: ${validProviders.join(', ')}`,
      'AI_EMBEDDING_PROVIDER',
      'openai'
    );
  }

  const config: AIConfig = {
    completionProvider,
    completionModel,
    embeddingProvider,
    embeddingModel,
    openaiApiKey: process.env.OPENAI_API_KEY,
    lmstudioBaseUrl: process.env.LMSTUDIO_BASE_URL,
  };

  // Validate required API keys/URLs based on selected providers
  if (completionProvider === 'openai' || embeddingProvider === 'openai') {
    if (!config.openaiApiKey) {
      throw new ConfigurationError(
        'OpenAI API key is required when using OpenAI provider',
        'OPENAI_API_KEY',
        'sk-your-openai-api-key-here'
      );
    }
  }
  if (completionProvider === 'lmstudio' || embeddingProvider === 'lmstudio') {
    if (!config.lmstudioBaseUrl) {
      throw new ConfigurationError(
        'LMStudio base URL is required when using LMStudio provider',
        'LMSTUDIO_BASE_URL',
        'http://localhost:1234/v1'
      );
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
import OpenAI from "openai";

// Supported embedding models with their configurations
export const EMBEDDING_MODELS = {
  "text-embedding-3-large": {
    provider: "openai",
    maxInput: 8191,
    defaultDimensions: 3072,
    supportedDimensions: [256, 512, 1024, 1536, 3072],
    description: "Best quality, excellent for multilingual including Arabic",
    costPer1kTokens: 0.00013,
  },
  "text-embedding-3-small": {
    provider: "openai",
    maxInput: 8191,
    defaultDimensions: 1536,
    supportedDimensions: [256, 512, 1024, 1536],
    description: "Fast and cost-effective, good for English",
    costPer1kTokens: 0.00002,
  },
  "text-embedding-ada-002": {
    provider: "openai",
    maxInput: 8191,
    defaultDimensions: 1536,
    supportedDimensions: [1536], // Fixed dimensions
    description: "Legacy model, reliable performance",
    costPer1kTokens: 0.0001,
  },
} as const;

export type EmbeddingModelName = keyof typeof EMBEDDING_MODELS;

export interface EmbeddingConfig {
  model: EmbeddingModelName;
  dimensions: number;
}

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('Missing required OpenAI API key: OPENAI_API_KEY');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
};

/**
 * Enhanced Embedding Service with multi-model support
 */
export class EmbeddingService {
  private defaultConfig: EmbeddingConfig = {
    model: "text-embedding-3-large",
    dimensions: 1536,
  };

  /**
   * Set default embedding configuration
   */
  setDefaultConfig(config: Partial<EmbeddingConfig>): void {
    if (config.model) {
      this.defaultConfig.model = config.model;
    }
    if (config.dimensions) {
      this.defaultConfig.dimensions = config.dimensions;
    }
  }

  /**
   * Get model info for a specific model
   */
  getModelInfo(model: EmbeddingModelName) {
    return EMBEDDING_MODELS[model];
  }

  /**
   * Validate dimensions for a model
   */
  validateDimensions(model: EmbeddingModelName, dimensions: number): boolean {
    const modelInfo = EMBEDDING_MODELS[model];
    return modelInfo.supportedDimensions.includes(dimensions as any);
  }

  /**
   * Generate embedding for a single text
   */
  async createEmbedding(
    text: string,
    config?: Partial<EmbeddingConfig>
  ): Promise<number[]> {
    const model = config?.model || this.defaultConfig.model;
    const dimensions = config?.dimensions || this.defaultConfig.dimensions;

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not configured. Returning zero vector.");
        return Array(dimensions).fill(0);
      }

      // Validate dimensions
      if (!this.validateDimensions(model, dimensions)) {
        console.warn(`Dimensions ${dimensions} not supported for ${model}, using default`);
      }

      const params: OpenAI.Embeddings.EmbeddingCreateParams = {
        model,
        input: text,
      };

      // Only add dimensions for models that support it
      if (model !== "text-embedding-ada-002") {
        params.dimensions = dimensions;
      }

      const response = await getOpenAIClient().embeddings.create(params);
      return response.data[0].embedding;
    } catch (error) {
      console.error(`Error generating embedding with ${model}:`, error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async createEmbeddings(
    texts: string[],
    config?: Partial<EmbeddingConfig>
  ): Promise<number[][]> {
    const model = config?.model || this.defaultConfig.model;
    const dimensions = config?.dimensions || this.defaultConfig.dimensions;

    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn("OpenAI API key not configured. Returning zero vectors.");
        return texts.map(() => Array(dimensions).fill(0));
      }

      // Process in batches to avoid rate limits (max 2048 inputs per request)
      const BATCH_SIZE = 100;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        
        const params: OpenAI.Embeddings.EmbeddingCreateParams = {
          model,
          input: batch,
        };

        if (model !== "text-embedding-ada-002") {
          params.dimensions = dimensions;
        }

        const response = await getOpenAIClient().embeddings.create(params);
        const batchEmbeddings = response.data.map(item => item.embedding);
        allEmbeddings.push(...batchEmbeddings);

        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allEmbeddings;
    } catch (error) {
      console.error(`Error generating embeddings with ${model}:`, error);
      throw error;
    }
  }

  /**
   * Get embedding configuration from chatbot config
   */
  getConfigFromChatbot(chatbotConfig: any): EmbeddingConfig {
    const kbConfig = chatbotConfig?.knowledgeBase || {};
    return {
      model: kbConfig.embeddingModel || this.defaultConfig.model,
      dimensions: kbConfig.embeddingDimensions || this.defaultConfig.dimensions,
    };
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English
    // For Arabic/multilingual, it's closer to 2-3 characters per token
    return Math.ceil(text.length / 3);
  }

  /**
   * Check if text exceeds model's max input
   */
  exceedsMaxInput(text: string, model: EmbeddingModelName): boolean {
    const modelInfo = EMBEDDING_MODELS[model];
    return this.estimateTokens(text) > modelInfo.maxInput;
  }

  /**
   * Truncate text to fit within model's max input
   */
  truncateToMaxInput(text: string, model: EmbeddingModelName): string {
    const modelInfo = EMBEDDING_MODELS[model];
    const maxChars = modelInfo.maxInput * 3; // Rough conversion
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Truncate at word boundary
    const truncated = text.substring(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > maxChars * 0.8 ? truncated.substring(0, lastSpace) : truncated;
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();

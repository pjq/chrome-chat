export enum LLMProvider {
  OPENROUTER = 'openrouter',
  OPENAI_COMPATIBLE = 'openai_compatible',
}

export interface LLMSettings {
  provider: LLMProvider;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: string;
}

export interface LLMRequest {
  messages: ChatMessage[];
  settings: LLMSettings;
}

export interface LLMResponse {
  content: string;
  error?: string;
}

export interface OpenAIMessage {
  role: string;
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelsListResponse {
  data: ModelInfo[];
  object?: string;
}

import { MCPSettings } from './mcp';

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
  mcp?: MCPSettings;
}

export interface ImageAttachment {
  data: string; // base64 data URL
  mimeType: string;
  name?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  error?: string;
  images?: ImageAttachment[];
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
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
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

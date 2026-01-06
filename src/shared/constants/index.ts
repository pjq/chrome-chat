import { LLMProvider, type LLMSettings } from '@/shared/types/llm';

export const DEFAULT_SETTINGS: LLMSettings = {
  provider: LLMProvider.OPENAI_COMPATIBLE,
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant that answers questions about web content. Use the provided web page content to answer questions accurately and concisely.',
  mcp: {
    servers: [],
    enabledByDefault: true,
    toolCallingMode: 'prompt', // Use prompt-based tool calling by default for better compatibility
  },
};

export const STORAGE_KEYS = {
  SETTINGS: 'llm_settings',
  CHAT_HISTORY: 'chat_history',
} as const;

export const MAX_CHAT_HISTORY = 50; // Maximum messages to keep

export const DEFAULT_ENDPOINTS: Record<LLMProvider, string> = {
  [LLMProvider.OPENROUTER]: 'https://openrouter.ai/api/v1/chat/completions',
  [LLMProvider.OPENAI_COMPATIBLE]: 'https://api.openai.com/v1/chat/completions',
};

export const POPULAR_MODELS: Record<LLMProvider, readonly string[]> = {
  [LLMProvider.OPENROUTER]: [
    'openai/gpt-4',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-opus',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-pro',
    'meta-llama/llama-3-70b-instruct',
  ],
  [LLMProvider.OPENAI_COMPATIBLE]: [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
    'gpt-4o',
  ],
};

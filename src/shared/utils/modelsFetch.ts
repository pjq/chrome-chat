import type { ModelsListResponse, ModelInfo, LLMProvider } from '@/shared/types/llm';

/**
 * Fetch available models from the API endpoint
 * @param apiEndpoint Base API endpoint
 * @param apiKey API key for authentication
 * @param provider Provider type (for specific headers)
 * @returns Array of model IDs
 */
export async function fetchModelsFromAPI(
  apiEndpoint: string,
  apiKey: string,
  provider: LLMProvider
): Promise<string[]> {
  try {
    // Construct models endpoint by replacing /chat/completions with /models
    const modelsEndpoint = apiEndpoint.replace(/\/chat\/completions\/?$/, '/models');

    const headers: HeadersInit = {
      'Authorization': `Bearer ${apiKey}`,
    };

    // Add OpenRouter specific headers if needed
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = chrome.runtime.getURL('');
      headers['X-Title'] = 'Web Content Chat Extension';
    }

    const response = await fetch(modelsEndpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: ModelsListResponse = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Invalid models response format');
    }

    // Extract model IDs and sort them
    return data.data
      .map((model: ModelInfo) => model.id)
      .filter((id: string) => id && id.trim().length > 0)
      .sort();
  } catch (error) {
    console.error('Error fetching models from API:', error);
    throw error;
  }
}

import { useState, useEffect } from 'react';
import { POPULAR_MODELS } from '@/shared/constants';
import { LLMProvider } from '@/shared/types/llm';
import { fetchModelsFromAPI } from '@/shared/utils/modelsFetch';

interface ModelSelectorProps {
  provider: LLMProvider;
  value: string;
  onChange: (value: string) => void;
  apiEndpoint: string;
  apiKey: string;
}

export function ModelSelector({ provider, value, onChange, apiEndpoint, apiKey }: ModelSelectorProps) {
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const popularModels = POPULAR_MODELS[provider] || [];

  // Use fetched models if available, otherwise fallback to popular models
  const availableModels = fetchedModels.length > 0 ? fetchedModels : Array.from(popularModels);
  const isCustom = !availableModels.includes(value) && value !== '';

  // Fetch models from API
  const handleFetchModels = async () => {
    if (!apiEndpoint || !apiKey) {
      setFetchError('Please enter your service URL and access key first');
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const models = await fetchModelsFromAPI(apiEndpoint, apiKey, provider);
      setFetchedModels(models);
      setHasFetched(true);

      // If current value is not in the fetched models and there are models, select the first one
      if (models.length > 0 && !models.includes(value)) {
        onChange(models[0]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Could not load models';
      setFetchError(errorMessage);
      console.error('Error fetching models:', error);
    } finally {
      setIsFetching(false);
    }
  };

  // Auto-fetch when component mounts if API key is available
  useEffect(() => {
    if (apiKey && apiEndpoint && !hasFetched) {
      handleFetchModels();
    }
  }, [apiKey, apiEndpoint]);

  // Reset fetched models when provider or endpoint changes
  useEffect(() => {
    setFetchedModels([]);
    setHasFetched(false);
    setFetchError(null);
  }, [provider, apiEndpoint]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          AI Model
        </label>
        <button
          type="button"
          onClick={handleFetchModels}
          disabled={isFetching || !apiKey || !apiEndpoint}
          className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
        >
          {isFetching ? 'Loading...' : 'Load Available Models'}
        </button>
      </div>

      {fetchError && (
        <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {fetchError}
        </div>
      )}

      {fetchedModels.length > 0 && (
        <div className="mb-1 text-xs text-green-600">
          ✓ {fetchedModels.length} models available
        </div>
      )}

      <select
        value={isCustom ? 'custom' : value}
        onChange={(e) => {
          if (e.target.value !== 'custom') {
            onChange(e.target.value);
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        disabled={isFetching}
      >
        {availableModels.length === 0 ? (
          <option value="">No models available</option>
        ) : (
          <>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </>
        )}
        <option value="custom">Custom Model (Enter Manually)</option>
      </select>

      {isCustom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter custom model name"
          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      )}

      <p className="mt-1 text-xs text-gray-500">
        {fetchedModels.length > 0
          ? 'Models fetched from your API endpoint'
          : 'Using default models. Click "Fetch Models" to load from API.'}
      </p>
    </div>
  );
}

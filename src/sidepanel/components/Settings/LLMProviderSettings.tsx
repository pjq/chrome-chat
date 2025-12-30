import { LLMProvider } from '@/shared/types/llm';
import { DEFAULT_ENDPOINTS } from '@/shared/constants';
import { Input } from '../common/Input';

interface LLMProviderSettingsProps {
  provider: LLMProvider;
  apiEndpoint: string;
  onProviderChange: (provider: LLMProvider) => void;
  onEndpointChange: (endpoint: string) => void;
}

export function LLMProviderSettings({
  provider,
  apiEndpoint,
  onProviderChange,
  onEndpointChange,
}: LLMProviderSettingsProps) {
  const handleProviderChange = (newProvider: LLMProvider) => {
    console.log('LLMProviderSettings: handleProviderChange called with:', newProvider);
    console.log('DEFAULT_ENDPOINTS:', DEFAULT_ENDPOINTS);
    console.log('Looking up endpoint for:', newProvider);
    const newEndpoint = DEFAULT_ENDPOINTS[newProvider];
    console.log('Found endpoint:', newEndpoint);

    onProviderChange(newProvider);
    // Auto-update endpoint to default for the provider
    onEndpointChange(newEndpoint);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          AI Service
        </label>
        <select
          value={provider}
          onChange={(e) => {
            console.log('Provider changed to:', e.target.value);
            handleProviderChange(e.target.value as LLMProvider);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="openai_compatible">OpenAI Compatible</option>
          <option value="openrouter">OpenRouter</option>
        </select>
      </div>

      <Input
        label="Service URL"
        type="url"
        value={apiEndpoint}
        onChange={(e) => onEndpointChange(e.target.value)}
        placeholder="https://api.example.com/v1/chat/completions"
      />

      <div className="text-xs text-gray-500">
        {provider === LLMProvider.OPENAI_COMPATIBLE && (
          <p>Enter the URL where your AI service is hosted</p>
        )}
        {provider === LLMProvider.OPENROUTER && (
          <p>
            Get your key from{' '}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              OpenRouter
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

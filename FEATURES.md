# Chrome Extension Features

## Dynamic Model Fetching

The extension now supports automatically fetching available models from your API endpoint.

### How It Works

1. **Automatic Detection**: When you enter an API endpoint and API key in settings, the extension automatically attempts to fetch available models from the `/v1/models` endpoint.

2. **Manual Refresh**: Click the "Fetch Models" button in the Model Selector to manually refresh the list of available models.

3. **Fallback**: If model fetching fails or hasn't been performed yet, the extension falls back to predefined popular models for each provider.

### API Response Format

The extension expects the `/v1/models` endpoint to return a response in this format:

```json
{
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "created": 1767076026,
      "owned_by": "sap-ai-core"
    },
    {
      "id": "gpt-4.1",
      "object": "model",
      "created": 1767076026,
      "owned_by": "sap-ai-core"
    }
  ]
}
```

### Endpoint Construction

The extension automatically constructs the models endpoint by:
- Taking your API endpoint (e.g., `https://api.example.com/v1/chat/completions`)
- Replacing `/chat/completions` with `/models`
- Result: `https://api.example.com/v1/models`

### Features

- **Auto-fetch on mount**: Automatically fetches models when settings panel opens if API credentials are configured
- **Manual refresh**: "Fetch Models" button to refresh the list at any time
- **Loading states**: Shows "Fetching..." indicator while loading
- **Error handling**: Displays error messages if fetch fails
- **Success indicator**: Shows "✓ X models loaded from API" when successful
- **Custom model support**: Can still manually enter a custom model name if needed
- **Provider-specific**: Models are fetched separately for each provider and endpoint

### UI Elements

1. **Fetch Models Button**: Located next to the "Model" label
   - Disabled when: API key or endpoint is missing, or already fetching
   - Shows "Fetching..." when in progress

2. **Status Messages**:
   - Success: Green message showing number of models loaded
   - Error: Red banner with error details
   - Help text: Gray text explaining the current state

3. **Model Dropdown**:
   - Shows fetched models if available
   - Falls back to popular models if fetch hasn't occurred
   - Always includes "Custom Model (Enter Manually)" option

### Error Handling

The extension gracefully handles:
- Network failures
- Invalid API endpoints
- Missing authentication
- Malformed API responses
- CORS issues (by making requests from background script in production use)

### Example Use Case

For SAP AI Core or similar custom endpoints:
1. Enter your API endpoint: `https://your-api.example.com/v1/chat/completions`
2. Enter your API key
3. Models automatically fetch (or click "Fetch Models")
4. Select from available models like `gpt-4o`, `gpt-4.1`, `gpt-5`, etc.
5. Models are now specific to your deployment

### Technical Implementation

- **File**: `src/shared/utils/modelsFetch.ts` - API fetching logic
- **Component**: `src/sidepanel/components/Settings/ModelSelector.tsx` - UI and state management
- **Types**: `src/shared/types/llm.ts` - TypeScript interfaces for API responses

### Benefits

1. **Dynamic Discovery**: No need to hardcode model names
2. **Provider Flexibility**: Works with any OpenAI-compatible API
3. **User Experience**: Users see exactly what models are available for their endpoint
4. **Future-Proof**: Automatically picks up new models as they're added to the API

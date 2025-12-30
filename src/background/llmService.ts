import type {
  LLMRequest,
  LLMResponse,
  OpenAIRequest,
} from '@/shared/types/llm';

/**
 * Stream a chat message from the LLM API
 * Returns a ReadableStream that emits text chunks
 */
export async function streamChatMessage(
  request: LLMRequest,
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  const { messages, settings } = request;

  try {
    const openAIRequest: OpenAIRequest = {
      model: settings.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream: true, // Enable streaming
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    };

    // Add OpenRouter specific headers
    if (settings.provider === 'openrouter') {
      headers['HTTP-Referer'] = chrome.runtime.getURL('');
      headers['X-Title'] = 'Web Content Chat Extension';
    }

    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(openAIRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete();
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine === 'data: [DONE]') {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const jsonStr = trimmedLine.slice(6); // Remove 'data: ' prefix

          try {
            const data = JSON.parse(jsonStr);

            // Extract content from the delta
            const content = data.choices?.[0]?.delta?.content;

            if (content) {
              onChunk(content);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e, jsonStr);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error instanceof Error ? error.message : 'Unknown streaming error');
  }
}

/**
 * Non-streaming fallback (for compatibility)
 */
export async function sendChatMessage(request: LLMRequest): Promise<LLMResponse> {
  const { messages, settings } = request;

  try {
    const openAIRequest: OpenAIRequest = {
      model: settings.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    };

    if (settings.provider === 'openrouter') {
      headers['HTTP-Referer'] = chrome.runtime.getURL('');
      headers['X-Title'] = 'Web Content Chat Extension';
    }

    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(openAIRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from API');
    }

    return {
      content: data.choices[0].message.content,
    };
  } catch (error) {
    console.error('API error:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

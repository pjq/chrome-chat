import type {
  LLMRequest,
  LLMResponse,
  OpenAIRequest,
} from '@/shared/types/llm';
import { mcpService } from './mcpService';

/**
 * Format MCP tools for OpenAI tool calling format
 */
function formatMCPToolsForOpenAI() {
  const mcpTools = mcpService.getAllTools();

  return mcpTools.map((tool) => ({
    type: 'function',
    function: {
      name: `mcp_${tool.serverId}_${tool.name}`,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

/**
 * Execute tool calls from LLM response
 */
async function executeToolCalls(
  toolCalls: any[],
  onChunk: (chunk: string) => void
): Promise<void> {
  onChunk('\n\n---\n**Executing tools:**\n\n');

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;

    // Parse MCP tool call: mcp_{serverId}_{toolName}
    if (functionName.startsWith('mcp_')) {
      const parts = functionName.split('_');
      if (parts.length >= 3) {
        const serverId = parts[1];
        const toolName = parts.slice(2).join('_');

        try {
          const args = JSON.parse(toolCall.function.arguments);

          onChunk(`🔧 Calling \`${toolName}\` on server \`${serverId}\`...\n`);

          const result = await mcpService.callTool({
            serverId,
            toolName,
            arguments: args,
          });

          if (result.success) {
            onChunk(`✅ Tool result:\n\`\`\`json\n${JSON.stringify(result.content, null, 2)}\n\`\`\`\n\n`);
          } else {
            onChunk(`❌ Tool error: ${result.error}\n\n`);
          }
        } catch (error) {
          console.error(`Error executing tool ${functionName}:`, error);
          onChunk(`❌ Error parsing tool call: ${error}\n\n`);
        }
      }
    }
  }

  onChunk('---\n\n');
}

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
    // Get available MCP tools
    const tools = formatMCPToolsForOpenAI();

    const openAIRequest: OpenAIRequest & { tools?: any[] } = {
      model: settings.model,
      messages: messages.map((msg) => {
        // If message has images, use vision API format with content array
        if (msg.images && msg.images.length > 0) {
          const contentParts: Array<{
            type: 'text' | 'image_url';
            text?: string;
            image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
          }> = [];

          // Add text content
          if (msg.content) {
            contentParts.push({
              type: 'text',
              text: msg.content,
            });
          }

          // Add images
          msg.images.forEach((img) => {
            contentParts.push({
              type: 'image_url',
              image_url: {
                url: img.data,
                detail: 'auto',
              },
            });
          });

          return {
            role: msg.role,
            content: contentParts,
          };
        }

        // Regular text message
        return {
          role: msg.role,
          content: msg.content,
        };
      }),
      stream: true, // Enable streaming
      ...(tools.length > 0 && { tools }), // Include tools if available
    };

    console.log('[LLM] Request with MCP tools:', {
      toolCount: tools.length,
      tools: tools.map((t: any) => t.function.name),
    });

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
    let toolCalls: any[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Execute any pending tool calls before completing
        if (toolCalls.length > 0) {
          await executeToolCalls(toolCalls, onChunk);
        }
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
            const delta = data.choices?.[0]?.delta;

            // Check for tool calls
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index || 0;
                if (!toolCalls[index]) {
                  toolCalls[index] = {
                    id: toolCall.id,
                    type: toolCall.type || 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || '',
                    },
                  };
                } else {
                  // Accumulate function arguments
                  if (toolCall.function?.arguments) {
                    toolCalls[index].function.arguments += toolCall.function.arguments;
                  }
                }
              }
            }

            // Extract content from the delta
            const content = delta?.content;

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

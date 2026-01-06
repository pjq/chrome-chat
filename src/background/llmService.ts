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
 * Format MCP tools as system prompt text (alternative to native function calling)
 * Provides detailed descriptions to help LLM understand when and how to use tools
 */
function formatMCPToolsForSystemPrompt(): string {
  const mcpTools = mcpService.getAllTools();

  if (mcpTools.length === 0) {
    return '';
  }

  // Detailed tool list with all parameters
  const toolDescriptions = mcpTools.map((tool) => {
    const params = tool.inputSchema.properties || {};
    const required = tool.inputSchema.required || [];

    // Show ALL parameters with detailed info
    const paramsList = Object.entries(params).map(([name, schema]: [string, any]) => {
      const isRequired = required.includes(name);
      const type = schema.type || 'string';
      const desc = schema.description || '';
      const enumValues = schema.enum ? ` (options: ${schema.enum.join(', ')})` : '';
      return `  - ${name} (${type}${isRequired ? ', required' : ', optional'}): ${desc}${enumValues}`;
    }).join('\n');

    return `### ${tool.name}
Server: ${tool.serverId}
Description: ${tool.description}
Parameters:
${paramsList || '  (no parameters)'}`;
  }).join('\n\n');

  return `

## 🔧 Available Tools

**CRITICAL INSTRUCTIONS:**
1. When a user question can be answered using these tools, USE THEM IMMEDIATELY
2. DO NOT ask clarifying questions - make reasonable assumptions and use the tools
3. You can call multiple tools in one response
4. After getting tool results, you can call more tools if needed

**Tool Call Format (use this exact XML structure):**
\`\`\`xml
<tool_call>
<server_id>SERVER_ID_HERE</server_id>
<tool_name>TOOL_NAME_HERE</tool_name>
<arguments>{"param_name": "value"}</arguments>
</tool_call>
\`\`\`

**Example:**
If user asks about weather, immediately call:
\`\`\`xml
<tool_call>
<server_id>mcp-123456789</server_id>
<tool_name>get_weather</tool_name>
<arguments>{"city": "Shanghai"}</arguments>
</tool_call>
\`\`\`

---

## 📋 Tool Directory

${toolDescriptions}

---

**Remember:** Match user intent to tool names and descriptions. Use tools proactively!`;
}

/**
 * Parse tool calls from text response using regex (for prompt-based tool calling)
 */
function parseToolCallsFromText(text: string): Array<{
  serverId: string;
  toolName: string;
  arguments: any;
}> {
  const toolCalls: Array<{
    serverId: string;
    toolName: string;
    arguments: any;
  }> = [];

  // Match XML format: <tool_call>...</tool_call>
  const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  let match;

  while ((match = toolCallRegex.exec(text)) !== null) {
    const content = match[1];

    // Extract server_id, tool_name, and arguments
    const serverIdMatch = /<server_id>(.*?)<\/server_id>/.exec(content);
    const toolNameMatch = /<tool_name>(.*?)<\/tool_name>/.exec(content);
    const argsMatch = /<arguments>([\s\S]*?)<\/arguments>/.exec(content);

    if (serverIdMatch && toolNameMatch && argsMatch) {
      try {
        const args = JSON.parse(argsMatch[1].trim());
        toolCalls.push({
          serverId: serverIdMatch[1].trim(),
          toolName: toolNameMatch[1].trim(),
          arguments: args,
        });
      } catch (error) {
        console.error('Error parsing tool call arguments:', error);
      }
    }
  }

  return toolCalls;
}

/**
 * Execute prompt-based tool calls (parsed from text)
 */
async function executePromptBasedToolCalls(
  toolCalls: Array<{ serverId: string; toolName: string; arguments: any }>,
  onChunk: (chunk: string) => void
): Promise<string> {
  if (toolCalls.length === 0) {
    return '';
  }

  // Use markdown-friendly format instead of HTML
  const openingTag = '\n\n---\n**🔧 Using tools**\n\n';
  onChunk(openingTag);
  let toolResultsText = openingTag;

  for (const toolCall of toolCalls) {
    try {
      console.log(`[Tool] Calling ${toolCall.toolName} with args:`, toolCall.arguments);

      const result = await mcpService.callTool({
        serverId: toolCall.serverId,
        toolName: toolCall.toolName,
        arguments: toolCall.arguments,
      });

      if (result.success) {
        onChunk(`✓ ${toolCall.toolName}\n`);
        toolResultsText += `✓ ${toolCall.toolName}\n`;

        // Format result as text for the next prompt
        toolResultsText += `\n**Tool Result for ${toolCall.toolName}:**\n\`\`\`json\n${JSON.stringify(result.content, null, 2)}\n\`\`\`\n\n`;
      } else {
        onChunk(`✗ ${toolCall.toolName}: ${result.error}\n`);
        toolResultsText += `✗ ${toolCall.toolName}: ${result.error}\n\n`;
      }
    } catch (error) {
      console.error(`Error executing tool ${toolCall.toolName}:`, error);
      onChunk(`✗ ${toolCall.toolName}: ${error}\n`);
      toolResultsText += `✗ ${toolCall.toolName}: ${error}\n\n`;
    }
  }

  const closingTag = '---\n\n';
  onChunk(closingTag);
  toolResultsText += closingTag;

  return toolResultsText;
}

/**
 * Execute native API tool calls (from OpenAI function calling)
 */
async function executeToolCalls(
  toolCalls: any[],
  onChunk: (chunk: string) => void
): Promise<any[]> {
  const toolResults: any[] = [];

  // Show a subtle, inline indicator for tool execution
  onChunk('\n\n---\n**🔧 Using tools**\n\n');

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

          // Subtle inline logging
          console.log(`[Tool] Calling ${toolName} with args:`, args);

          const result = await mcpService.callTool({
            serverId,
            toolName,
            arguments: args,
          });

          if (result.success) {
            // Show minimal success indicator
            onChunk(`✓ ${toolName}\n`);

            // Format tool result for LLM
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result.content),
            });
          } else {
            onChunk(`✗ ${toolName}: ${result.error}\n`);
            toolResults.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${result.error}`,
            });
          }
        } catch (error) {
          console.error(`Error executing tool ${functionName}:`, error);
          onChunk(`✗ ${toolName}: ${error}\n`);
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Error: ${error}`,
          });
        }
      }
    }
  }

  onChunk('---\n\n');
  return toolResults;
}

/**
 * Helper function to process streaming response
 * In prompt mode, filters out <tool_call> XML from display
 */
async function processStreamingResponse(
  response: Response,
  onChunk: (chunk: string) => void,
  filterToolCallXML: boolean = false
): Promise<{ toolCalls: any[]; finishReason: string | null; contentBeforeToolCalls: string }> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let toolCalls: any[] = [];
  let finishReason: string | null = null;
  let contentBeforeToolCalls = ''; // Capture any thinking/explanation before tool calls
  let displayBuffer = ''; // Buffer for filtering tool call XML from display

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // Flush any remaining display buffer
      if (displayBuffer) {
        if (filterToolCallXML) {
          // Remove any remaining tool calls before flushing
          const toolCallRegex = /<tool_call>[\s\S]*?<\/tool_call>/g;
          const filtered = displayBuffer.replace(toolCallRegex, '');
          if (filtered.trim()) {
            onChunk(filtered);
          }
        } else {
          onChunk(displayBuffer);
        }
      }
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
          const finish = data.choices?.[0]?.finish_reason;

          if (finish) {
            finishReason = finish;
          }

          // Check for tool calls (native mode)
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
                if (toolCall.function?.name) {
                  toolCalls[index].function.name = toolCall.function.name;
                }
              }
            }
          }

          // Extract content from the delta
          const content = delta?.content;

          if (content) {
            contentBeforeToolCalls += content;

            if (filterToolCallXML) {
              // In prompt mode, filter out <tool_call> XML from display
              displayBuffer += content;

              // Check for complete tool_call blocks
              const toolCallRegex = /<tool_call>[\s\S]*?<\/tool_call>/g;

              // If we have a closing tag, we can safely filter and output
              if (displayBuffer.includes('</tool_call>')) {
                // Remove all complete tool call blocks
                const filtered = displayBuffer.replace(toolCallRegex, '');
                if (filtered.trim()) {
                  onChunk(filtered);
                }
                displayBuffer = '';
              } else if (displayBuffer.includes('<tool_call>')) {
                // We're in the middle of a tool call, keep buffering
                // Don't output anything yet
              } else {
                // No tool call in progress, safe to output
                // But keep a small buffer in case <tool_call> is about to start
                if (displayBuffer.length > 50) {
                  // Output all but the last 20 chars (safety margin for "<tool_call>")
                  const safeContent = displayBuffer.slice(0, -20);
                  onChunk(safeContent);
                  displayBuffer = displayBuffer.slice(-20);
                }
              }
            } else {
              // Native mode or no filtering - output directly
              onChunk(content);
            }
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e, jsonStr);
        }
      }
    }
  }

  return { toolCalls, finishReason, contentBeforeToolCalls };
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
    // Determine tool calling mode (default to 'prompt' for better compatibility)
    const toolCallingMode = settings.mcp?.toolCallingMode || 'prompt';

    console.log(`[LLM] Tool calling mode: ${toolCallingMode}`);

    // Get available MCP tools
    const tools = formatMCPToolsForOpenAI();
    const toolsPromptText = formatMCPToolsForSystemPrompt();

    console.log('[LLM] Available MCP tools:', tools.length);

    if (tools.length > 0 && toolCallingMode === 'native') {
      console.log('[LLM] Tool details (native):', JSON.stringify(tools, null, 2));
    }

    const openAIRequest: OpenAIRequest & { tools?: any[]; tool_choice?: string } = {
      model: settings.model,
      messages: messages.map((msg) => {
        // Inject tool descriptions into ALL system prompts for prompt-based mode
        // This ensures tools are available throughout the conversation
        if (toolCallingMode === 'prompt' && msg.role === 'system' && toolsPromptText) {
          return {
            role: msg.role,
            content: msg.content + toolsPromptText,
          };
        }

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
      // Only include tools parameter in native mode
      ...(toolCallingMode === 'native' && tools.length > 0 && {
        tools,
        tool_choice: 'auto' // Allow model to decide when to use tools
      }),
    };

    console.log('[LLM] Sending request with tools:', {
      toolCount: tools.length,
      toolNames: tools.map((t: any) => t.function.name),
      model: settings.model,
    });

    console.log('[LLM] Full request:', JSON.stringify(openAIRequest, null, 2));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`,
    };

    // Add OpenRouter specific headers
    if (settings.provider === 'openrouter') {
      headers['HTTP-Referer'] = chrome.runtime.getURL('');
      headers['X-Title'] = 'Web Content Chat Extension';
    }

    // Make initial API request
    let response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(openAIRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (toolCallingMode === 'native') {
      // Native function calling mode
      const { toolCalls, finishReason, contentBeforeToolCalls } = await processStreamingResponse(response, onChunk, false);

      // If there are tool calls, execute them and make another API request
      if (toolCalls.length > 0 && finishReason === 'tool_calls') {
        // Execute the tools
        const toolResults = await executeToolCalls(toolCalls, onChunk);

        // Build the assistant message with tool calls
        const assistantMessage = {
          role: 'assistant',
          content: contentBeforeToolCalls || null,
          tool_calls: toolCalls.map((tc: any) => ({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };

        // Prepare messages for second request
        const followUpMessages = [
          ...openAIRequest.messages,
          assistantMessage,
          ...toolResults,
        ];

        console.log('[LLM] Making follow-up request with tool results...');

        const followUpRequest = {
          model: settings.model,
          messages: followUpMessages,
          stream: true,
          ...(tools.length > 0 && {
            tools,
            tool_choice: 'auto',
          }),
        };

        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(followUpRequest),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        // Process the follow-up response
        await processStreamingResponse(response, onChunk, false);
      }
    } else {
      // Prompt-based tool calling mode with iterative tool execution
      let conversationMessages = [...openAIRequest.messages];
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;

      while (iteration < maxIterations) {
        iteration++;

        // Filter out <tool_call> XML from display
        const { contentBeforeToolCalls } = await processStreamingResponse(response, onChunk, true);

        // Parse tool calls from the text response
        const promptToolCalls = parseToolCallsFromText(contentBeforeToolCalls);

        console.log(`[LLM] Iteration ${iteration}: Parsed ${promptToolCalls.length} tool calls from text`);

        if (promptToolCalls.length === 0) {
          // No more tool calls, we're done
          break;
        }

        // Execute the tools
        const toolResultsText = await executePromptBasedToolCalls(promptToolCalls, onChunk);

        // Add assistant's response and tool results to conversation
        conversationMessages = [
          ...conversationMessages,
          {
            role: 'assistant',
            content: contentBeforeToolCalls, // Keep original response with tool calls for LLM
          },
          {
            role: 'user',
            content: toolResultsText + (iteration < maxIterations - 1
              ? '\n\nIf you need more information, use additional tools. Otherwise, provide a natural, human-friendly response based on the tool results above.'
              : '\n\nPlease provide a natural, human-friendly response based on the tool results above.'),
          },
        ];

        console.log(`[LLM] Making follow-up request ${iteration} with tool results (prompt mode)...`);

        const followUpRequest = {
          model: settings.model,
          messages: conversationMessages,
          stream: true,
        };

        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(followUpRequest),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        // Continue the loop to check for more tool calls in the response
      }
    }

    onComplete();
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

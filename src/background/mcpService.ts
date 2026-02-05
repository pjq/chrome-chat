/**
 * MCP (Model Context Protocol) Service for Chrome Extension
 * Handles connections to remote MCP servers via HTTP/SSE
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type {
  MCPServer,
  MCPServerState,
  MCPTool,
  MCPResource,
  MCPToolCall,
  MCPToolResult,
} from '@/shared/types/mcp';

/**
 * Manages MCP server connections and tool invocations
 */
class MCPService {
  private clients: Map<string, Client> = new Map();
  private serverStates: Map<string, MCPServerState> = new Map();
  private serverConfigs: Map<string, MCPServer> = new Map(); // Store server configs for timeout lookup

  /**
   * Connect to an MCP server
   */
  async connectServer(server: MCPServer): Promise<MCPServerState> {
    // Store server config for later use (e.g., timeout lookup)
    this.serverConfigs.set(server.id, server);

    // Prepare custom headers from server config
    const customHeaders: Record<string, string> = {};
    if (server.headers) {
      Object.entries(server.headers).forEach(([key, value]) => {
        customHeaders[key] = value;
      });
    }

    // Determine transport type
    const transportType = server.transportType || 'auto';

    // Auto-detect: URLs containing '/sse' are likely SSE-only servers
    const likelySSE = server.url.includes('/sse');

    // Decide which transport to try first
    let tryStreamableHttpFirst = true;
    if (transportType === 'sse') {
      tryStreamableHttpFirst = false;
    } else if (transportType === 'auto' && likelySSE) {
      tryStreamableHttpFirst = false;
    } else if (transportType === 'streamableHttp') {
      tryStreamableHttpFirst = true;
    }

    // Try connecting with appropriate transport
    try {
      if (tryStreamableHttpFirst) {
        // Try StreamableHTTP first
        try {
          return await this.connectWithTransport(server, 'streamableHttp', customHeaders);
        } catch (error) {
          console.log(`[MCP] StreamableHTTP failed for ${server.name}, trying SSE transport:`, error);
          // Fall back to SSE
          return await this.connectWithTransport(server, 'sse', customHeaders);
        }
      } else {
        // Try SSE first
        try {
          return await this.connectWithTransport(server, 'sse', customHeaders);
        } catch (error) {
          console.log(`[MCP] SSE failed for ${server.name}, trying StreamableHTTP transport:`, error);
          // Fall back to StreamableHTTP
          return await this.connectWithTransport(server, 'streamableHttp', customHeaders);
        }
      }
    } catch (error) {
      // Both transports failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCP] All transports failed for ${server.name}:`, error);

      const errorState: MCPServerState = {
        serverId: server.id,
        status: 'error',
        tools: [],
        resources: [],
        error: errorMessage,
      };

      this.serverStates.set(server.id, errorState);
      return errorState;
    }
  }

  /**
   * Connect with specific transport type
   */
  private async connectWithTransport(
    server: MCPServer,
    transportType: 'streamableHttp' | 'sse',
    customHeaders: Record<string, string>
  ): Promise<MCPServerState> {
    // Update status to connecting
    this.updateServerState(server.id, { status: 'connecting' });

    // Create transport based on type
    const transport = transportType === 'streamableHttp'
      ? new StreamableHTTPClientTransport(new URL(server.url), {
          requestInit: {
            headers: customHeaders,
          },
        })
      : new SSEClientTransport(new URL(server.url), {
          requestInit: {
            headers: customHeaders,
          },
        });

    console.log(`[MCP] Using ${transportType} transport for ${server.name}`);

    // Create MCP client
    const client = new Client(
      {
        name: 'chat-with-pages',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect client to transport (let errors propagate for fallback)
    await client.connect(transport);

    // Store client
    this.clients.set(server.id, client);

    // List available tools and resources
    const [toolsResult, resourcesResult] = await Promise.all([
      client.listTools().catch((err) => {
        console.error(`[MCP] Error listing tools from ${server.name}:`, err);
        return { tools: [] };
      }),
      client.listResources().catch((err) => {
        console.error(`[MCP] Error listing resources from ${server.name}:`, err);
        return { resources: [] };
      }),
    ]);

    console.log(`[MCP] Tools result from ${server.name}:`, toolsResult);
    console.log(`[MCP] Resources result from ${server.name}:`, resourcesResult);

    const tools: MCPTool[] = toolsResult.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema,
    }));

    const resources: MCPResource[] = resourcesResult.resources.map((resource: any) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    }));

    // Update server state
    const state: MCPServerState = {
      serverId: server.id,
      status: 'connected',
      tools,
      resources,
      lastConnected: Date.now(),
    };

    this.serverStates.set(server.id, state);
    console.log(`[MCP] Connected to server: ${server.name}`, state);

    return state;
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error(`[MCP] Error closing client ${serverId}:`, error);
      }
      this.clients.delete(serverId);
    }

    // Clean up server config
    this.serverConfigs.delete(serverId);

    this.updateServerState(serverId, { status: 'disconnected' });
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const client = this.clients.get(toolCall.serverId);
    if (!client) {
      return {
        success: false,
        error: `Server ${toolCall.serverId} not connected`,
      };
    }

    try {
      console.log(`[MCP] Calling tool ${toolCall.toolName} on ${toolCall.serverId}`, toolCall.arguments);

      // Get timeout from server config (default: 30 seconds)
      const serverConfig = this.serverConfigs.get(toolCall.serverId);
      const timeoutMs = serverConfig?.timeout || 30000;

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Tool call timeout after ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
      });

      // Race between tool call and timeout
      const result = await Promise.race([
        client.callTool({
          name: toolCall.toolName,
          arguments: toolCall.arguments,
        }),
        timeoutPromise,
      ]);

      console.log(`[MCP] Tool ${toolCall.toolName} result:`, result);

      return {
        success: true,
        content: result.content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCP] Tool call failed:`, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Read a resource from an MCP server
   */
  async readResource(serverId: string, uri: string): Promise<MCPToolResult> {
    const client = this.clients.get(serverId);
    if (!client) {
      return {
        success: false,
        error: `Server ${serverId} not connected`,
      };
    }

    try {
      const result = await client.readResource({ uri });

      return {
        success: true,
        content: result.contents,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get server state
   */
  getServerState(serverId: string): MCPServerState | undefined {
    return this.serverStates.get(serverId);
  }

  /**
   * Get all server states
   */
  getAllServerStates(): MCPServerState[] {
    return Array.from(this.serverStates.values());
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Array<MCPTool & { serverId: string }> {
    const tools: Array<MCPTool & { serverId: string }> = [];

    for (const [serverId, state] of this.serverStates.entries()) {
      if (state.status === 'connected') {
        state.tools.forEach((tool) => {
          tools.push({ ...tool, serverId });
        });
      }
    }

    return tools;
  }

  /**
   * Update server state
   */
  private updateServerState(
    serverId: string,
    updates: Partial<MCPServerState>
  ): void {
    const current = this.serverStates.get(serverId) || {
      serverId,
      status: 'disconnected',
      tools: [],
      resources: [],
    };

    this.serverStates.set(serverId, { ...current, ...updates });
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map((serverId) =>
      this.disconnectServer(serverId)
    );

    await Promise.all(disconnectPromises);
  }
}

// Export singleton instance
export const mcpService = new MCPService();

/**
 * MCP (Model Context Protocol) Service for Chrome Extension
 * Handles connections to remote MCP servers via HTTP/SSE
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
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

  /**
   * Connect to an MCP server
   */
  async connectServer(server: MCPServer): Promise<MCPServerState> {
    try {
      // Update status to connecting
      this.updateServerState(server.id, { status: 'connecting' });

      // Create SSE transport for remote server
      const transport = new SSEClientTransport(new URL(server.url));

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

      // Connect client to transport
      await client.connect(transport);

      // Store client
      this.clients.set(server.id, client);

      // List available tools and resources
      const [toolsResult, resourcesResult] = await Promise.all([
        client.listTools().catch(() => ({ tools: [] })),
        client.listResources().catch(() => ({ resources: [] })),
      ]);

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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[MCP] Failed to connect to ${server.name}:`, error);

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

      const result = await client.callTool({
        name: toolCall.toolName,
        arguments: toolCall.arguments,
      });

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

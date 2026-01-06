/**
 * MCP (Model Context Protocol) types for Chrome extension
 */

/**
 * MCP transport type
 */
export type MCPTransportType = 'auto' | 'streamableHttp' | 'sse';

/**
 * MCP Server configuration
 */
export interface MCPServer {
  id: string;
  name: string;
  url: string; // HTTP/SSE endpoint URL
  enabled: boolean;
  description?: string;
  headers?: Record<string, string>; // Custom headers (e.g., auth tokens)
  transportType?: MCPTransportType; // Transport protocol (default: 'auto')
  timeout?: number; // Tool call timeout in milliseconds (default: 30000)
}

/**
 * MCP Tool definition from server
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * MCP Resource definition from server
 */
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP Server connection status
 */
export type MCPConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * MCP Server state (runtime information)
 */
export interface MCPServerState {
  serverId: string;
  status: MCPConnectionStatus;
  tools: MCPTool[];
  resources: MCPResource[];
  error?: string;
  lastConnected?: number;
}

/**
 * MCP Tool call request
 */
export interface MCPToolCall {
  serverId: string;
  toolName: string;
  arguments: Record<string, any>;
}

/**
 * MCP Tool call result
 */
export interface MCPToolResult {
  success: boolean;
  content?: any;
  error?: string;
}

/**
 * Tool calling mode
 */
export type ToolCallingMode = 'native' | 'prompt';

/**
 * MCP Settings in settings store
 */
export interface MCPSettings {
  servers: MCPServer[];
  enabledByDefault: boolean;
  toolCallingMode?: ToolCallingMode; // How to call tools: 'native' (API tools param) or 'prompt' (system prompt + regex)
}

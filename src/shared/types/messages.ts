import type { ExtractedContent } from './content';
import type { ChatMessage, LLMSettings } from './llm';
import type { MCPServer, MCPToolCall, MCPToolResult } from './mcp';

export enum MessageType {
  EXTRACT_CONTENT = 'EXTRACT_CONTENT',
  EXTRACT_CONTENT_RESPONSE = 'EXTRACT_CONTENT_RESPONSE',
  SEND_CHAT_MESSAGE = 'SEND_CHAT_MESSAGE',
  CHAT_RESPONSE = 'CHAT_RESPONSE',
  CHAT_STREAM_START = 'CHAT_STREAM_START',
  CHAT_STREAM_CHUNK = 'CHAT_STREAM_CHUNK',
  CHAT_STREAM_END = 'CHAT_STREAM_END',
  CHAT_STREAM_ERROR = 'CHAT_STREAM_ERROR',
  DOWNLOAD_MARKDOWN = 'DOWNLOAD_MARKDOWN',
  GET_SETTINGS = 'GET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  MCP_CONNECT_SERVER = 'MCP_CONNECT_SERVER',
  MCP_DISCONNECT_SERVER = 'MCP_DISCONNECT_SERVER',
  MCP_GET_SERVER_STATE = 'MCP_GET_SERVER_STATE',
  MCP_GET_ALL_STATES = 'MCP_GET_ALL_STATES',
  MCP_CALL_TOOL = 'MCP_CALL_TOOL',
  MCP_TOOL_RESULT = 'MCP_TOOL_RESULT',
}

export interface BaseMessage {
  type: MessageType;
}

export interface ExtractContentMessage extends BaseMessage {
  type: MessageType.EXTRACT_CONTENT;
  tabId?: number;
}

export interface ExtractContentResponse extends BaseMessage {
  type: MessageType.EXTRACT_CONTENT_RESPONSE;
  content: ExtractedContent | null;
  error?: string;
}

export interface SendChatMessage extends BaseMessage {
  type: MessageType.SEND_CHAT_MESSAGE;
  messages: ChatMessage[];
  settings: LLMSettings;
  stream?: boolean; // Whether to use streaming
  streamId?: string; // Unique ID for this stream
}

export interface ChatResponse extends BaseMessage {
  type: MessageType.CHAT_RESPONSE;
  content: string;
  error?: string;
}

export interface ChatStreamStart extends BaseMessage {
  type: MessageType.CHAT_STREAM_START;
  streamId: string;
}

export interface ChatStreamChunk extends BaseMessage {
  type: MessageType.CHAT_STREAM_CHUNK;
  streamId: string;
  chunk: string;
}

export interface ChatStreamEnd extends BaseMessage {
  type: MessageType.CHAT_STREAM_END;
  streamId: string;
}

export interface ChatStreamError extends BaseMessage {
  type: MessageType.CHAT_STREAM_ERROR;
  streamId: string;
  error: string;
}

export interface DownloadMarkdownMessage extends BaseMessage {
  type: MessageType.DOWNLOAD_MARKDOWN;
  content: string;
  filename: string;
}

export interface GetSettingsMessage extends BaseMessage {
  type: MessageType.GET_SETTINGS;
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: MessageType.UPDATE_SETTINGS;
  settings: LLMSettings;
}

export interface MCPConnectServerMessage extends BaseMessage {
  type: MessageType.MCP_CONNECT_SERVER;
  server: MCPServer;
}

export interface MCPDisconnectServerMessage extends BaseMessage {
  type: MessageType.MCP_DISCONNECT_SERVER;
  serverId: string;
}

export interface MCPGetServerStateMessage extends BaseMessage {
  type: MessageType.MCP_GET_SERVER_STATE;
  serverId: string;
}

export interface MCPGetAllStatesMessage extends BaseMessage {
  type: MessageType.MCP_GET_ALL_STATES;
}

export interface MCPCallToolMessage extends BaseMessage {
  type: MessageType.MCP_CALL_TOOL;
  toolCall: MCPToolCall;
}

export interface MCPToolResultMessage extends BaseMessage {
  type: MessageType.MCP_TOOL_RESULT;
  result: MCPToolResult;
}

export type Message =
  | ExtractContentMessage
  | ExtractContentResponse
  | SendChatMessage
  | ChatResponse
  | ChatStreamStart
  | ChatStreamChunk
  | ChatStreamEnd
  | ChatStreamError
  | DownloadMarkdownMessage
  | GetSettingsMessage
  | UpdateSettingsMessage
  | MCPConnectServerMessage
  | MCPDisconnectServerMessage
  | MCPGetServerStateMessage
  | MCPGetAllStatesMessage
  | MCPCallToolMessage
  | MCPToolResultMessage;

import type { ExtractedContent } from './content';
import type { ChatMessage, LLMSettings } from './llm';

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
  | UpdateSettingsMessage;

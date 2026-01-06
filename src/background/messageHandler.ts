import { MessageType } from '@/shared/types/messages';
import type {
  Message,
  ExtractContentMessage,
  SendChatMessage,
  UpdateSettingsMessage,
  MCPConnectServerMessage,
  MCPDisconnectServerMessage,
  MCPGetServerStateMessage,
  MCPCallToolMessage,
} from '@/shared/types/messages';
import { sendChatMessage } from './llmService';
import { getSettings, saveSettings } from '@/shared/utils/storage';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import { mcpService } from './mcpService';

/**
 * Main message handler for chrome.runtime.onMessage
 */
export async function handleMessage(
  message: Message,
  sender: chrome.runtime.MessageSender
): Promise<any> {
  console.log('Background received message:', message.type);

  try {
    switch (message.type) {
      case MessageType.EXTRACT_CONTENT:
        return await handleExtractContent(message as ExtractContentMessage, sender);

      case MessageType.SEND_CHAT_MESSAGE:
        return await handleChatMessage(message as SendChatMessage);

      case MessageType.GET_SETTINGS:
        return await handleGetSettings();

      case MessageType.UPDATE_SETTINGS:
        return await handleUpdateSettings(message as UpdateSettingsMessage);

      case MessageType.MCP_CONNECT_SERVER:
        return await handleMCPConnectServer(message as MCPConnectServerMessage);

      case MessageType.MCP_DISCONNECT_SERVER:
        return await handleMCPDisconnectServer(message as MCPDisconnectServerMessage);

      case MessageType.MCP_GET_SERVER_STATE:
        return await handleMCPGetServerState(message as MCPGetServerStateMessage);

      case MessageType.MCP_GET_ALL_STATES:
        return await handleMCPGetAllStates();

      case MessageType.MCP_CALL_TOOL:
        return await handleMCPCallTool(message as MCPCallToolMessage);

      default:
        throw new Error(`Unknown message type: ${(message as any).type}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Forward extract content request to the content script
 */
async function handleExtractContent(
  message: ExtractContentMessage,
  _sender: chrome.runtime.MessageSender
) {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id) {
      throw new Error('No active tab found');
    }

    // Forward message to content script
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response;
  } catch (error) {
    console.error('Error extracting content:', error);
    return {
      type: MessageType.EXTRACT_CONTENT_RESPONSE,
      content: null,
      error: error instanceof Error ? error.message : 'Failed to extract content',
    };
  }
}

/**
 * Handle chat message request (with streaming support)
 */
async function handleChatMessage(message: SendChatMessage) {
  try {
    // If streaming is requested and we have a streamId, use streaming
    if (message.stream && message.streamId) {
      // Start streaming - this will be handled via ports in background/index.ts
      return {
        type: MessageType.CHAT_STREAM_START,
        streamId: message.streamId,
      };
    }

    // Non-streaming fallback
    const response = await sendChatMessage({
      messages: message.messages,
      settings: message.settings,
    });

    return {
      type: MessageType.CHAT_RESPONSE,
      content: response.content,
      error: response.error,
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    return {
      type: MessageType.CHAT_RESPONSE,
      content: '',
      error: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get settings from storage
 */
async function handleGetSettings() {
  const settings = await getSettings();
  return {
    settings: settings || DEFAULT_SETTINGS,
  };
}

/**
 * Update settings in storage
 */
async function handleUpdateSettings(message: UpdateSettingsMessage) {
  await saveSettings(message.settings);

  // Reconnect to MCP servers if settings changed
  if (message.settings.mcp?.servers) {
    await reconnectMCPServers(message.settings.mcp.servers);
  }

  return {
    success: true,
  };
}

/**
 * Connect to an MCP server
 */
async function handleMCPConnectServer(message: MCPConnectServerMessage) {
  const state = await mcpService.connectServer(message.server);
  return { state };
}

/**
 * Disconnect from an MCP server
 */
async function handleMCPDisconnectServer(message: MCPDisconnectServerMessage) {
  await mcpService.disconnectServer(message.serverId);
  return { success: true };
}

/**
 * Get MCP server state
 */
async function handleMCPGetServerState(message: MCPGetServerStateMessage) {
  const state = mcpService.getServerState(message.serverId);
  return { state };
}

/**
 * Get all MCP server states
 */
async function handleMCPGetAllStates() {
  const states = mcpService.getAllServerStates();
  return { states };
}

/**
 * Call an MCP tool
 */
async function handleMCPCallTool(message: MCPCallToolMessage) {
  const result = await mcpService.callTool(message.toolCall);
  return {
    type: MessageType.MCP_TOOL_RESULT,
    result,
  };
}

/**
 * Reconnect to MCP servers based on settings
 */
async function reconnectMCPServers(servers: any[]) {
  // Disconnect all existing servers
  await mcpService.disconnectAll();

  // Connect to enabled servers
  const enabledServers = servers.filter((s) => s.enabled);
  for (const server of enabledServers) {
    try {
      await mcpService.connectServer(server);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
    }
  }
}

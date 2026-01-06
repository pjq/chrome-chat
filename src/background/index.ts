import { handleMessage } from './messageHandler';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import { getSettings, saveSettings } from '@/shared/utils/storage';
import { streamChatMessage } from './llmService';
import { MessageType } from '@/shared/types/messages';
import type { SendChatMessage } from '@/shared/types/messages';
import { mcpService } from './mcpService';

// Set up message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message asynchronously
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Error in message handler:', error);
      sendResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    });

  // Return true to indicate we'll send response asynchronously
  return true;
});

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed, initializing settings...');

  try {
    // Configure side panel to only open on user action (click), not automatically
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('Side panel configured to open only on click');

    const existingSettings = await getSettings();

    // Only set default settings if none exist
    if (!existingSettings) {
      await saveSettings(DEFAULT_SETTINGS);
      console.log('Default settings initialized');
    } else {
      console.log('Settings already exist, skipping initialization');
    }

    // Connect to enabled MCP servers
    await connectMCPServers();
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
});

// Initialize MCP servers on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up, connecting to MCP servers...');
  await connectMCPServers();
});

/**
 * Connect to enabled MCP servers from settings
 */
async function connectMCPServers() {
  try {
    const settings = await getSettings();
    if (!settings?.mcp?.servers) {
      return;
    }

    const enabledServers = settings.mcp.servers.filter((s) => s.enabled);
    console.log(`Connecting to ${enabledServers.length} enabled MCP servers...`);

    for (const server of enabledServers) {
      try {
        const state = await mcpService.connectServer(server);
        console.log(`Connected to MCP server ${server.name}:`, state);
      } catch (error) {
        console.error(`Failed to connect to MCP server ${server.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error connecting to MCP servers:', error);
  }
}

// Handle long-lived connections for streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'chat-stream') {
    console.log('Stream port connected');

    port.onMessage.addListener(async (message: SendChatMessage) => {
      if (message.type === MessageType.SEND_CHAT_MESSAGE && message.stream && message.streamId) {
        console.log('Starting stream:', message.streamId);

        try {
          await streamChatMessage(
            {
              messages: message.messages,
              settings: message.settings,
            },
            (chunk) => {
              // Send chunk to client
              port.postMessage({
                type: MessageType.CHAT_STREAM_CHUNK,
                streamId: message.streamId,
                chunk,
              });
            },
            () => {
              // Stream complete
              port.postMessage({
                type: MessageType.CHAT_STREAM_END,
                streamId: message.streamId,
              });
            },
            (error) => {
              // Stream error
              port.postMessage({
                type: MessageType.CHAT_STREAM_ERROR,
                streamId: message.streamId,
                error,
              });
            }
          );
        } catch (error) {
          console.error('Error in stream handler:', error);
          port.postMessage({
            type: MessageType.CHAT_STREAM_ERROR,
            streamId: message.streamId,
            error: error instanceof Error ? error.message : 'Unknown streaming error',
          });
        }
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('Stream port disconnected');
    });
  }
});

// Log when service worker starts
console.log('Background service worker started');

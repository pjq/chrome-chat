import { handleMessage } from './messageHandler';
import { DEFAULT_SETTINGS } from '@/shared/constants';
import { getSettings, saveSettings } from '@/shared/utils/storage';
import { streamChatMessage } from './llmService';
import { MessageType } from '@/shared/types/messages';
import type { SendChatMessage } from '@/shared/types/messages';

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

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  }
});

// Initialize settings on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed, initializing settings...');

  try {
    const existingSettings = await getSettings();

    // Only set default settings if none exist
    if (!existingSettings) {
      await saveSettings(DEFAULT_SETTINGS);
      console.log('Default settings initialized');
    } else {
      console.log('Settings already exist, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
});

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

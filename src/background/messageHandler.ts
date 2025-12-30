import { MessageType } from '@/shared/types/messages';
import type {
  Message,
  ExtractContentMessage,
  SendChatMessage,
  UpdateSettingsMessage,
} from '@/shared/types/messages';
import { sendChatMessage } from './llmService';
import { getSettings, saveSettings } from '@/shared/utils/storage';
import { DEFAULT_SETTINGS } from '@/shared/constants';

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
  return {
    success: true,
  };
}

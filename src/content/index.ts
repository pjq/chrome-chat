import { extractPageContent, extractBasicContent } from './contentExtractor';
import { MessageType } from '@/shared/types/messages';
import type { ExtractContentMessage, ExtractContentResponse } from '@/shared/types/messages';

// Listen for messages from the background script or side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Handle extract content request
  if (message.type === MessageType.EXTRACT_CONTENT) {
    handleExtractContent(message as ExtractContentMessage)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          type: MessageType.EXTRACT_CONTENT_RESPONSE,
          content: null,
          error: error.message,
        } as ExtractContentResponse);
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  return false;
});

/**
 * Handles content extraction request
 */
async function handleExtractContent(
  _message: ExtractContentMessage
): Promise<ExtractContentResponse> {
  try {
    // Try to extract content using Readability
    let content = extractPageContent();

    // If Readability fails, fall back to basic extraction
    if (!content) {
      console.log('Using fallback content extraction');
      content = extractBasicContent();
    }

    return {
      type: MessageType.EXTRACT_CONTENT_RESPONSE,
      content,
    };
  } catch (error) {
    console.error('Error in handleExtractContent:', error);
    return {
      type: MessageType.EXTRACT_CONTENT_RESPONSE,
      content: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

console.log('Content script loaded');

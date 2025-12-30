import { useState } from 'react';
import { MessageType } from '@/shared/types/messages';
import { getCurrentTab } from '@/shared/utils/chromeApi';

/**
 * Check if URL is a valid page for content scripts
 */
function isValidPageUrl(url: string | undefined): boolean {
  if (!url) return false;

  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'view-source:',
    'file://',
  ];

  return !invalidPrefixes.some(prefix => url.startsWith(prefix));
}

export function usePageContent() {
  const [content, setContentState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Extract content from the current page with retry logic
   */
  const extractContent = async (retryCount = 0) => {
    setIsLoading(true);
    setError(null);

    try {
      const tab = await getCurrentTab();

      if (!tab.id) {
        throw new Error('No active tab ID');
      }

      // Check if this is a valid page for content scripts
      if (!isValidPageUrl(tab.url)) {
        throw new Error(
          'Cannot extract content from this page type. Please navigate to a regular web page (http:// or https://).'
        );
      }

      // Try to send message to content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          type: MessageType.EXTRACT_CONTENT,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        if (!response.content) {
          throw new Error('No content extracted from page');
        }

        setContentState(response.content);
      } catch (err) {
        // If connection error and we haven't retried too many times, inject and retry
        const errorMsg = err instanceof Error ? err.message : String(err);

        if (errorMsg.includes('Could not establish connection') && retryCount < 2) {
          console.log(`Retrying content extraction (attempt ${retryCount + 1})...`);

          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 500));
          return extractContent(retryCount + 1);
        }

        throw err;
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to extract content';

      // Provide helpful error messages
      if (errorMessage.includes('Could not establish connection')) {
        errorMessage = 'Content script not ready. Please refresh the page and try again.';
      }

      setError(errorMessage);
      console.error('Error extracting content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    content,
    isLoading,
    error,
    extractContent,
  };
}

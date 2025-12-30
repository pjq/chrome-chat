/**
 * Type-safe wrappers for Chrome APIs
 */

/**
 * Get the current active tab
 */
export async function getCurrentTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) {
    throw new Error('No active tab found');
  }

  return tab;
}

/**
 * Send a message to the background script
 */
export async function sendMessageToBackground<T = any>(message: any): Promise<T> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('Error sending message to background:', error);
    throw error;
  }
}

/**
 * Send a message to a content script in a specific tab
 */
export async function sendMessageToTab<T = any>(
  tabId: number,
  message: any
): Promise<T> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error(`Error sending message to tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Trigger a file download
 */
export async function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/markdown'
): Promise<void> {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    // Clean up the object URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

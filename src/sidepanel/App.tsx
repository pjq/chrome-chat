import { useState, useEffect } from 'react';
import { ChatHeader } from './components/Chat/ChatHeader';
import { ChatInterface } from './components/Chat/ChatInterface';
import { ChatInput } from './components/Chat/ChatInput';
import { ChatHistory } from './components/Chat/ChatHistory';
import { MarkdownDownload } from './components/Markdown/MarkdownDownload';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { Spinner } from './components/common/Spinner';
import { usePageContent } from './hooks/usePageContent';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import { getCurrentTab } from '@/shared/utils/chromeApi';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');
  const { content, isLoading: isExtracting, error, extractContent, clearContent } = usePageContent();
  const { loadSettings } = useSettings();
  const { createSession, getCurrentSession, setContent, getSessionByTabId, switchSession, clearCurrentSession } = useChatStore();
  const { sendMessage } = useChat();

  const currentSession = getCurrentSession();

  // Check if current tab is a valid page
  const isValidPage = currentTabUrl.startsWith('http://') || currentTabUrl.startsWith('https://');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Extract content and manage tab-based sessions
  useEffect(() => {
    const initializeTab = async () => {
      const tab = await getCurrentTab();
      if (tab.id && tab.url) {
        setCurrentTabId(tab.id);
        setCurrentTabUrl(tab.url);

        // Check if this is a valid page (not chrome://, about:, etc.)
        const isValidPage = tab.url.startsWith('http://') || tab.url.startsWith('https://');

        if (isValidPage) {
          // Check if this tab already has a session
          const existingSession = getSessionByTabId(tab.id);
          if (existingSession) {
            // Switch to existing session for this tab
            switchSession(existingSession.id);
          } else {
            // Extract content for new tab
            extractContent();
          }
        } else {
          // For invalid pages (new tab, chrome pages), clear session to show empty state
          clearCurrentSession();
        }
      }
    };

    initializeTab();

    // Listen for tab URL changes and page refreshes
    const handleTabUpdate = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // Only handle updates for the current active tab
      const currentTab = await getCurrentTab();
      if (currentTab.id !== tabId) return;

      // Extract when page is complete (includes both URL changes and refreshes)
      if (changeInfo.status === 'complete') {
        setCurrentTabId(tabId);

        // Check if this is a valid page before extracting
        const isValidPage = tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));

        if (isValidPage) {
          extractContent();
        } else {
          // For invalid pages, clear session to show empty state
          clearCurrentSession();
          clearContent();
        }
      }
    };

    // Listen for tab switches (when user switches to a different tab)
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      setCurrentTabId(activeInfo.tabId);

      // Clear stale content from previous tab to prevent wrong updates
      clearContent();

      // Get tab info to check if it's a valid page
      const tab = await chrome.tabs.get(activeInfo.tabId);
      setCurrentTabUrl(tab.url || '');
      const isValidPage = tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'));

      if (!isValidPage) {
        // For new tabs or chrome pages, clear the session to show empty state
        clearCurrentSession();
        return;
      }

      // Check if this tab already has a session
      const existingSession = getSessionByTabId(activeInfo.tabId);
      if (existingSession) {
        // Switch to existing session for this tab
        switchSession(existingSession.id);
        // Extract fresh content to update title/content if page changed
        extractContent();
      } else {
        // Extract content for this tab
        extractContent();
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    // Cleanup listeners on unmount
    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);

  // Create new session or update content when extracted
  useEffect(() => {
    if (content && currentTabId) {
      const existingSession = getSessionByTabId(currentTabId);

      // If there's an existing session and we're already using it, check if we need to update
      if (existingSession && currentSession?.id === existingSession.id) {
        // We're in the right session for this tab
        if (existingSession.content?.url !== content.url) {
          // URL changed in this tab - create new session
          createSession(content, currentTabId);
        } else {
          // Same tab, same URL - just update content (e.g., page refresh)
          setContent(content);
        }
      } else if (!existingSession) {
        // No session exists for this tab - create new session
        createSession(content, currentTabId);
      }
      // If existingSession exists but we're not in it, do nothing
      // (we already switched to it in handleTabActivated)
    }
  }, [content, currentTabId]);

  const handleRefresh = () => {
    extractContent();
  };

  const handleNewChat = () => {
    if (content && currentTabId) {
      // Force create new session for current tab, even if one exists
      createSession(content, currentTabId);
    } else if (currentTabId) {
      // If no content yet, extract it first
      extractContent();
    }
  };

  // Determine the appropriate title
  const getTitle = () => {
    if (currentSession?.title) return currentSession.title;
    if (content?.title) return content.title;
    if (isExtracting) return 'Loading...';
    return 'Chat with Pages';
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <ChatHeader
        title={getTitle()}
        onSettingsClick={() => setShowSettings(true)}
        onHistoryClick={() => setShowHistory(true)}
        onNewChatClick={handleNewChat}
        onRefreshClick={handleRefresh}
        isRefreshing={isExtracting}
      />

      {isExtracting && !currentSession && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Reading this page...</p>
          </div>
        </div>
      )}

      {error && !currentSession && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <div className="flex items-start mb-3">
              <svg className="w-6 h-6 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Couldn't read this page
                </h3>
                <p className="text-sm text-red-700 mb-3">{error}</p>
              </div>
            </div>

            <div className="bg-white border border-red-200 rounded p-3 mb-4 text-xs text-gray-700">
              <p className="font-semibold mb-2">Try this:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Make sure you're on a regular webpage</li>
                <li>Refresh the page and try again</li>
                <li>Check if the page has finished loading</li>
              </ul>
            </div>

            <button
              onClick={handleRefresh}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Always show chat interface structure */}
      <div className="flex-1 overflow-hidden">
        {currentSession ? (
          <ChatInterface />
        ) : (
          !isExtracting && !error && (
            <div className="h-full flex flex-col">
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Ready to chat!
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Navigate to any webpage to start chatting about its content.
                  </p>
                  <p className="text-sm text-gray-500">
                    Or click the refresh button to load the current page.
                  </p>
                </div>
              </div>
              {/* Show input even without session */}
              <ChatInput
                onSend={async (message, images) => {
                  // If no session, create one first by extracting content
                  if (!currentSession && content) {
                    await createSession(content, currentTabId || undefined);
                  }
                  // Send the message
                  sendMessage(message, images);
                }}
                disabled={!isValidPage || isExtracting}
              />
            </div>
          )
        )}
      </div>

      {currentSession?.content && <MarkdownDownload />}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHistory && <ChatHistory onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default App;

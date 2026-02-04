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

      // If we don't have a current session, it means we want to create a new one
      // (e.g., user clicked "+", or switched to a tab without a session)
      if (!currentSession) {
        createSession(content, currentTabId);
        return;
      }

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

  const handleNewChat = async () => {
    if (!currentTabId) return;

    // If on a valid page, extract content first to get latest page data
    if (isValidPage) {
      // Clear current session to show loading state
      clearCurrentSession();
      // Extract content - this will trigger session creation in the useEffect
      await extractContent();
    } else {
      // For invalid pages (new tabs, chrome pages), create session without content
      createSession(null, currentTabId);
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

      {/* Silently handle extraction errors - chat still works without page content */}

      {/* Always show chat interface structure */}
      <div className="flex-1 overflow-hidden">
        {currentSession ? (
          <ChatInterface />
        ) : (
          !isExtracting && (
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
                    {error
                      ? 'Couldn\'t read this page, but you can still chat as a general assistant.'
                      : isValidPage
                      ? 'Click refresh to load the current page content, or just start chatting!'
                      : 'Start chatting or navigate to a webpage to chat about its content.'}
                  </p>
                </div>
              </div>
              {/* Show input even without session */}
              <ChatInput
                onSend={(message, images) => {
                  // If no session, create one first (with or without content)
                  if (!currentSession) {
                    createSession(content || null, currentTabId || undefined);
                  }
                  // Send the message
                  sendMessage(message, images);
                }}
                disabled={isExtracting}
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

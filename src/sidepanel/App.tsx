import { useState, useEffect } from 'react';
import { ChatHeader } from './components/Chat/ChatHeader';
import { ChatInterface } from './components/Chat/ChatInterface';
import { ChatHistory } from './components/Chat/ChatHistory';
import { MarkdownDownload } from './components/Markdown/MarkdownDownload';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { Spinner } from './components/common/Spinner';
import { usePageContent } from './hooks/usePageContent';
import { useSettings } from './hooks/useSettings';
import { useChatStore } from './store/chatStore';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { content, isLoading: isExtracting, error, extractContent } = usePageContent();
  const { loadSettings } = useSettings();
  const { createSession, getCurrentSession, setContent } = useChatStore();

  const currentSession = getCurrentSession();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Extract content on mount and when URL changes
  useEffect(() => {
    extractContent();

    // Listen for tab URL changes and page refreshes
    const handleTabUpdate = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo, _tab: chrome.tabs.Tab) => {
      // Extract when page is complete (includes both URL changes and refreshes)
      if (changeInfo.status === 'complete') {
        extractContent();
      }
    };

    // Listen for tab switches (when user switches to a different tab)
    const handleTabActivated = (_activeInfo: chrome.tabs.TabActiveInfo) => {
      // Extract content from the newly activated tab
      extractContent();
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
    if (content) {
      if (!currentSession) {
        // Create first session
        createSession(content);
      } else if (currentSession.content?.url !== content.url) {
        // Create new session for different page
        createSession(content);
      } else {
        // Update content for same page
        setContent(content);
      }
    }
  }, [content]);

  const handleRefresh = () => {
    extractContent();
  };

  const handleNewChat = () => {
    if (content) {
      createSession(content);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      <ChatHeader
        title={currentSession?.title || content?.title || 'Loading...'}
        onSettingsClick={() => setShowSettings(true)}
        onHistoryClick={() => setShowHistory(true)}
        onNewChatClick={handleNewChat}
        onRefreshClick={handleRefresh}
        isRefreshing={isExtracting}
      />

      {isExtracting && !content && !currentSession && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">Reading this page...</p>
          </div>
        </div>
      )}

      {error && !content && !currentSession && (
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

      {currentSession && (
        <>
          <div className="flex-1 overflow-hidden">
            <ChatInterface />
          </div>
          {currentSession.content && <MarkdownDownload />}
        </>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showHistory && <ChatHistory onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default App;

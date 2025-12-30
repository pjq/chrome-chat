import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { Spinner } from '../common/Spinner';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';

export function ChatInterface() {
  const { sendMessage, retryLastMessage } = useChat();
  const { getCurrentSession, isLoading, error } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentSession = getCurrentSession();
  const messages = currentSession?.messages || [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleRetry = (index: number) => {
    // Only allow retrying the last message
    if (index === messages.length - 1) {
      retryLastMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && !error && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Ready to chat!</p>
            <p className="text-sm">Ask me anything about this page</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isLastAssistantMessage =
            index === messages.length - 1 && msg.role === 'assistant';
          const showRetry = isLastAssistantMessage && (!!msg.error || !isLoading);

          return (
            <ChatMessage
              key={index}
              message={msg}
              onRetry={() => handleRetry(index)}
              showRetry={showRetry}
            />
          );
        })}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 rounded-lg px-4 py-2 border border-gray-200">
              <Spinner size="sm" />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            <strong>Oops!</strong> {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}

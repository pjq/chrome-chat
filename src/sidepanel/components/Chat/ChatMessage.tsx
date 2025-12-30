import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { ChatMessage as ChatMessageType } from '@/shared/types/llm';
import 'highlight.js/styles/github-dark.css';

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ChatMessage({ message, onRetry, showRetry }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasError = !!message.error;

  // Don't display system messages
  if (isSystem) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <div
        className={`max-w-[90%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-gray-100 text-gray-900 border border-gray-200'
            : hasError
            ? 'bg-red-50 text-gray-900 border border-red-300'
            : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
        }`}
      >
        {/* Error Message */}
        {hasError && (
          <div className="mb-2 text-sm text-red-600 font-medium flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Something went wrong: {message.error}
          </div>
        )}

        {/* Message Content */}
        <div
          className={`text-sm prose prose-sm max-w-none overflow-x-auto ${
            isUser ? 'prose-gray' : 'prose-slate'
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              // Customize code blocks
              code: ({ node, className, children, ...props }: any) => {
                const inline = !className;
                return !inline ? (
                  <code className={className} {...props}>
                    {children}
                  </code>
                ) : (
                  <code
                    className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              // Customize links
              a: ({ node, children, ...props }) => (
                <a
                  {...props}
                  className="text-indigo-600 hover:text-indigo-800 hover:underline break-words"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              // Customize paragraphs
              p: ({ node, children, ...props }) => (
                <p className="mb-2 last:mb-0" {...props}>
                  {children}
                </p>
              ),
              // Customize tables
              table: ({ node, children, ...props }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full border-collapse" {...props}>
                    {children}
                  </table>
                </div>
              ),
            }}
          >
            {message.content || (hasError ? "I couldn't generate a response. Please try again." : '')}
          </ReactMarkdown>
        </div>

        {/* Footer with timestamp and actions */}
        <div className="flex items-center justify-between mt-2">
          <div
            className={`text-xs ${
              hasError ? 'text-red-500' : 'text-gray-500'
            }`}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Copy button */}
            {message.content && (
              <button
                onClick={handleCopy}
                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                title="Copy message"
              >
                {copied ? (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </span>
                )}
              </button>
            )}

            {/* Retry button */}
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                title="Retry this message"
              >
                <span className="flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Retry
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

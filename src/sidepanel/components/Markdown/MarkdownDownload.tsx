import { useState, useMemo } from 'react';
import { Button } from '../common/Button';
import { useChatStore } from '../../store/chatStore';
import { generateMarkdownDocument, generateSafeFilename } from '@/shared/utils/markdown';
import { downloadFile } from '@/shared/utils/chromeApi';

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 10) / 10 + ' ' + sizes[i];
}

export function MarkdownDownload() {
  const { getCurrentSession } = useChatStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const currentSession = getCurrentSession();
  const currentContent = currentSession?.content;

  // Calculate markdown size
  const contentInfo = useMemo(() => {
    if (!currentContent) {
      return { markdown: '', size: 0, sizeFormatted: '0 B' };
    }

    const markdown = generateMarkdownDocument(
      currentContent.title,
      currentContent.content,
      currentContent.url
    );

    // Calculate byte size (UTF-8 encoding)
    const size = new Blob([markdown]).size;

    return {
      markdown,
      size,
      sizeFormatted: formatBytes(size),
    };
  }, [currentContent]);

  const handleDownload = async () => {
    if (!currentContent) {
      return;
    }

    setIsDownloading(true);

    try {
      // Use pre-calculated markdown
      const markdown = contentInfo.markdown;

      // Generate filename
      const filename = `${generateSafeFilename(currentContent.title)}.md`;

      // Trigger download
      await downloadFile(markdown, filename, 'text/markdown');
    } catch (error) {
      console.error('Error downloading markdown:', error);
      alert('Failed to download markdown file');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!currentContent) {
      return;
    }

    try {
      // Use pre-calculated markdown
      const markdown = contentInfo.markdown;

      // Copy to clipboard
      await navigator.clipboard.writeText(markdown);

      // Show success feedback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  };

  if (!currentContent) {
    return null;
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-600 font-medium">Page Content</div>
        <div className="text-xs text-gray-500 font-mono">{contentInfo.sizeFormatted}</div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={handleCopy}
          disabled={!currentContent}
          className="flex-1"
          size="sm"
        >
          {isCopied ? (
            <>
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          onClick={handleDownload}
          disabled={!currentContent || isDownloading}
          className="flex-1"
          size="sm"
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-1 h-4 w-4 inline"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 inline mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

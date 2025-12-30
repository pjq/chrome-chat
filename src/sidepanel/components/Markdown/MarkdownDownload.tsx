import { useState } from 'react';
import { Button } from '../common/Button';
import { useChatStore } from '../../store/chatStore';
import { generateMarkdownDocument, generateSafeFilename } from '@/shared/utils/markdown';
import { downloadFile } from '@/shared/utils/chromeApi';

export function MarkdownDownload() {
  const { getCurrentSession } = useChatStore();
  const [isDownloading, setIsDownloading] = useState(false);

  const currentSession = getCurrentSession();
  const currentContent = currentSession?.content;

  const handleDownload = async () => {
    if (!currentContent) {
      return;
    }

    setIsDownloading(true);

    try {
      // Generate markdown document
      const markdown = generateMarkdownDocument(
        currentContent.title,
        currentContent.content,
        currentContent.url
      );

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

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <Button
        variant="secondary"
        onClick={handleDownload}
        disabled={!currentContent || isDownloading}
        className="w-full"
      >
        {isDownloading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 inline"
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
              className="w-4 h-4 inline mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download as Markdown
          </>
        )}
      </Button>
    </div>
  );
}

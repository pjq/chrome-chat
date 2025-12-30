import TurndownService from 'turndown';

/**
 * Configure Turndown service for HTML to Markdown conversion
 */
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_',
});

/**
 * Convert HTML content to Markdown
 * @param html HTML content to convert
 * @returns Markdown formatted string
 */
export function convertToMarkdown(html: string): string {
  try {
    return turndownService.turndown(html);
  } catch (error) {
    console.error('Error converting to markdown:', error);
    throw new Error('Failed to convert content to markdown');
  }
}

/**
 * Generate a markdown document with title and content
 * @param title Document title
 * @param content HTML content
 * @param url Source URL
 * @returns Complete markdown document
 */
export function generateMarkdownDocument(
  title: string,
  content: string,
  url: string
): string {
  const markdown = convertToMarkdown(content);

  return `# ${title}

**Source:** ${url}

---

${markdown}

---

*Converted by Web Content Chat & Markdown Extension*
`;
}

/**
 * Generate a safe filename from title
 * @param title Document title
 * @returns Safe filename without extension
 */
export function generateSafeFilename(title: string): string {
  return title
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 100); // Limit length
}

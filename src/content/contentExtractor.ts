import { Readability } from '@mozilla/readability';
import type { ExtractedContent, ReadabilityArticle } from '@/shared/types/content';

/**
 * Minimum content length threshold to consider Readability successful
 */
const MIN_CONTENT_LENGTH = 500;

/**
 * Extracts the main content from the current page using Mozilla's Readability algorithm
 * Falls back to extractBasicContent if Readability fails or returns insufficient content
 * @returns Extracted content
 */
export function extractPageContent(): ExtractedContent | null {
  try {
    // Clone the document to avoid affecting the live DOM
    const documentClone = document.cloneNode(true) as Document;

    // Create a Readability instance and parse the page
    const reader = new Readability(documentClone);
    const article: ReadabilityArticle | null = reader.parse();

    // Check if Readability succeeded and returned sufficient content
    if (article && article.textContent && article.textContent.length >= MIN_CONTENT_LENGTH) {
      // Return structured content from Readability
      return {
        title: article.title || document.title,
        byline: article.byline || undefined,
        content: article.content,
        textContent: article.textContent,
        length: article.length,
        excerpt: article.excerpt,
        siteName: article.siteName || undefined,
        url: window.location.href,
      };
    }

    // Readability failed or returned insufficient content
    // This commonly happens with web apps (GitHub, dashboards, etc.)
    console.warn('Readability returned insufficient content, using fallback extraction');
    return extractBasicContent();
  } catch (error) {
    console.error('Error extracting page content:', error);
    // On error, try fallback extraction
    return extractBasicContent();
  }
}

/**
 * Fallback function to extract content from web apps and dynamic pages
 * Tries to find main content areas and exclude navigation/headers/footers
 * @returns Basic page content
 */
export function extractBasicContent(): ExtractedContent {
  // Try to find main content container using common selectors
  const mainSelectors = [
    'main',
    '[role="main"]',
    '#content',
    '#main',
    '.main-content',
    'article',
    '.markdown-body', // GitHub markdown content
    '.repository-content', // GitHub repo content
    '.container-xl', // GitHub container
  ];

  let mainElement: Element | null = null;
  for (const selector of mainSelectors) {
    mainElement = document.querySelector(selector);
    if (mainElement) break;
  }

  // Fall back to body if no main content found
  const contentElement = mainElement || document.body;

  // Get clean text content
  let textContent = contentElement.textContent || '';

  // Clean up excessive whitespace
  textContent = textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  // Try to remove navigation and common UI elements
  const clone = contentElement.cloneNode(true) as Element;

  // Remove common non-content elements
  const selectorsToRemove = [
    'nav',
    'header:not(.markdown-header)',
    'footer',
    '.navigation',
    '.sidebar',
    '.advertisement',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    'script',
    'style',
    'noscript',
  ];

  selectorsToRemove.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  const cleanedHTML = clone.innerHTML;

  return {
    title: document.title,
    content: cleanedHTML,
    textContent: textContent,
    length: textContent.length,
    excerpt: textContent.slice(0, 300).trim() + '...',
    url: window.location.href,
    siteName: getSiteName(),
  };
}

/**
 * Extract site name from meta tags or domain
 */
function getSiteName(): string | undefined {
  // Try meta tags first
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteName) {
    return ogSiteName.getAttribute('content') || undefined;
  }

  // Try to extract from hostname
  const hostname = window.location.hostname;
  if (hostname.includes('github')) return 'GitHub';

  return hostname.split('.')[0] || undefined;
}

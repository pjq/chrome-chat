import { Readability } from '@mozilla/readability';
import type { ExtractedContent, ReadabilityArticle } from '@/shared/types/content';

/**
 * Extracts the main content from the current page using Mozilla's Readability algorithm
 * @returns Extracted content or null if extraction fails
 */
export function extractPageContent(): ExtractedContent | null {
  try {
    // Clone the document to avoid affecting the live DOM
    const documentClone = document.cloneNode(true) as Document;

    // Create a Readability instance and parse the page
    const reader = new Readability(documentClone);
    const article: ReadabilityArticle | null = reader.parse();

    if (!article) {
      console.warn('Readability failed to extract content from this page');
      return null;
    }

    // Return structured content
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
  } catch (error) {
    console.error('Error extracting page content:', error);
    return null;
  }
}

/**
 * Fallback function to extract basic text content if Readability fails
 * @returns Basic page content
 */
export function extractBasicContent(): ExtractedContent {
  const body = document.body;
  const textContent = body.innerText || body.textContent || '';

  return {
    title: document.title,
    content: body.innerHTML,
    textContent: textContent,
    length: textContent.length,
    excerpt: textContent.slice(0, 200),
    url: window.location.href,
  };
}

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
    '#main-content',
    '.main-content',
    '.content',
    'article',
    '.article',
    '.post-content',
    '.entry-content',
    '.markdown-body', // GitHub markdown content
    '.repository-content', // GitHub repo content
    '.container-xl', // GitHub container
    '[data-content]',
    '.docs-content', // Documentation sites
  ];

  let mainElement: Element | null = null;
  for (const selector of mainSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.trim().length > 200) {
      mainElement = element;
      break;
    }
  }

  // Fall back to body if no main content found
  const contentElement = mainElement || document.body;

  // Clone the element for manipulation
  const clone = contentElement.cloneNode(true) as Element;

  // Remove common non-content elements
  const selectorsToRemove = [
    'nav',
    'header:not([class*="content"]):not([class*="article"])',
    'footer:not([class*="content"])',
    '.navigation',
    '.navbar',
    '.nav',
    '.sidebar',
    '.side-bar',
    '.menu',
    '.advertisement',
    '.ad',
    '.ads',
    '.banner:not([class*="content"])',
    '[role="navigation"]',
    '[role="banner"]:not([class*="content"])',
    '[role="contentinfo"]',
    '[role="complementary"]',
    'script',
    'style',
    'noscript',
    'iframe',
    '.cookie-banner',
    '.cookie-notice',
    '#cookie-notice',
  ];

  selectorsToRemove.forEach(selector => {
    try {
      clone.querySelectorAll(selector).forEach(el => {
        // Don't remove if it contains significant content
        const text = el.textContent?.trim() || '';
        if (text.length < 100) {
          el.remove();
        }
      });
    } catch (e) {
      // Ignore selector errors
    }
  });

  // Extract form field values (textareas, inputs) as they may contain important content
  const formData: string[] = [];

  // Get textarea values
  contentElement.querySelectorAll('textarea').forEach(textarea => {
    const value = (textarea as HTMLTextAreaElement).value.trim();
    if (value.length > 10) {
      const label = textarea.getAttribute('aria-label') ||
                    textarea.getAttribute('placeholder') ||
                    textarea.getAttribute('name') ||
                    'Form content';
      formData.push(`\n**${label}:**\n${value}\n`);
    }
  });

  // Get input field values (text, email, etc.)
  contentElement.querySelectorAll('input[type="text"], input[type="email"], input[type="url"], input:not([type])').forEach(input => {
    const value = (input as HTMLInputElement).value.trim();
    if (value.length > 2) {
      const label = input.getAttribute('aria-label') ||
                    input.getAttribute('placeholder') ||
                    input.getAttribute('name') ||
                    'Field';
      formData.push(`**${label}:** ${value}`);
    }
  });

  // Get select dropdown values
  contentElement.querySelectorAll('select').forEach(select => {
    const selectedOption = (select as HTMLSelectElement).selectedOptions[0];
    if (selectedOption) {
      const value = selectedOption.textContent?.trim();
      if (value && value.length > 0) {
        const label = select.getAttribute('aria-label') ||
                      select.getAttribute('name') ||
                      'Selection';
        formData.push(`**${label}:** ${value}`);
      }
    }
  });

  // Get text content from cleaned element
  let textContent = clone.textContent || '';

  // Clean up excessive whitespace while preserving structure
  textContent = textContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Append form data if any
  if (formData.length > 0) {
    textContent += '\n\n## Form Content\n\n' + formData.join('\n');
  }

  const cleanedHTML = clone.innerHTML;

  // If we still don't have much content, try to get all visible text
  if (textContent.length < 500) {
    console.warn('[Content Extraction] Extracted content is short, trying full body text');
    textContent = document.body.innerText || document.body.textContent || '';
    textContent = textContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return {
    title: document.title,
    content: cleanedHTML,
    textContent: textContent,
    length: textContent.length,
    excerpt: textContent.slice(0, 300).trim() + (textContent.length > 300 ? '...' : ''),
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

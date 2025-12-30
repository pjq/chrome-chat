export interface ExtractedContent {
  title: string;
  byline?: string;
  content: string;      // HTML content
  textContent: string;  // Plain text
  length: number;
  excerpt: string;
  siteName?: string;
  url: string;
}

export interface ReadabilityArticle {
  title: string;
  byline: string | null;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  siteName: string | null;
}

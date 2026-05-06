/**
 * 腐敗防止層 (ACL): IsbnApiResponse → ドメインモデル BookInfo への変換
 */

import type { IsbnApiResponse } from './infrastructure';
import type { BookInfo } from './domain';

/**
 * node-isbn レスポンス → ドメインモデル BookInfo への変換
 * @throws Error if required fields (title, authors, year) are missing or invalid
 */
export function toBookInfo(raw: IsbnApiResponse, sourceIsbn: string): BookInfo {
  const title = raw.title?.trim();
  if (!title) {
    throw new Error('title が取得できませんでした');
  }

  const authors = raw.authors ?? [];
  if (authors.length === 0) {
    throw new Error('authors が取得できませんでした');
  }

  const author = normalizeAuthor(authors[0]);

  const year = extractYear(raw.publishedDate);
  if (!year) {
    throw new Error(`publishedDate を年として解析できませんでした: ${raw.publishedDate}`);
  }

  const isbn13 = extractIsbn13(raw.industryIdentifiers) ?? sourceIsbn;

  return {
    title,
    author,
    year,
    publisher: raw.publisher?.trim(),
    isbn13,
    url: raw.infoLink,
  };
}

/**
 * "Steve McConnell" (Given Family) → "McConnell, Steve" (Family, Given)
 * BibEntry.author 規約への変換
 */
function normalizeAuthor(rawAuthor: string): string {
  const parts = rawAuthor.trim().split(/\s+/);
  if (parts.length < 2) {
    return rawAuthor;
  }
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(' ');
  return `${family}, ${given}`;
}

/**
 * "2004", "2004-01-01", "2004-01" などから年を抽出
 */
function extractYear(publishedDate?: string): number | null {
  if (!publishedDate) {
    return null;
  }
  const match = publishedDate.match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * industryIdentifiers から ISBN-13 を優先的に取得
 */
function extractIsbn13(
  identifiers?: IsbnApiResponse['industryIdentifiers'],
): string | null {
  if (!identifiers) {
    return null;
  }
  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  if (isbn13) {
    return isbn13.identifier;
  }
  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');
  return isbn10?.identifier ?? null;
}

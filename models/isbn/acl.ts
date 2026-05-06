/**
 * 腐敗防止層 (ACL): IsbnApiResponse → ドメインモデル BookInfo への変換
 */

import type { IsbnApiResponse } from './infrastructure';
import type { BookInfo, AuthorName } from './domain';

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

  const author = parseAuthor(authors[0]);

  const year = extractYear(raw.publishedDate);
  if (!year) {
    throw new Error(`publishedDate を年として解析できませんでした: ${raw.publishedDate}`);
  }

  const { isbn13, isbn10 } = extractIsbns(raw.industryIdentifiers, sourceIsbn);

  return {
    title,
    author,
    year,
    publisher: raw.publisher?.trim(),
    isbn13,
    isbn10,
    url: raw.infoLink,
  };
}

/**
 * "Steve McConnell" (Given Family) → { first: "Steve", last: "McConnell" }
 * または "McConnell, Steve" (Family, Given) → { first: "Steve", last: "McConnell" }
 * または "甲野善紀" (日本語) → { first: "善紀", last: "甲野" }
 */
function parseAuthor(rawAuthor: string): AuthorName {
  const trimmed = rawAuthor.trim();

  // カンマで区切られている場合: "Family, Given" 形式
  if (trimmed.includes(',')) {
    const [family, given] = trimmed.split(',').map((s) => s.trim());
    return { first: given || family, last: family };
  }

  // スペースで区切られている場合: "Given Family" 形式
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(' ');
    return { first, last };
  }

  // 1単語のみ（日本語や単一名）
  return { first: trimmed, last: trimmed };
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
 * industryIdentifiers から ISBN-13 と ISBN-10 を抽出
 * ISBN-13 を優先、ない場合は ISBN-10
 */
function extractIsbns(
  identifiers: IsbnApiResponse['industryIdentifiers'] | undefined,
  sourceIsbn: string,
): { isbn13: string; isbn10?: string } {
  const result = {
    isbn13: sourceIsbn,
    isbn10: undefined as string | undefined,
  };

  if (!identifiers) {
    return result;
  }

  const isbn13 = identifiers.find((id) => id.type === 'ISBN_13');
  const isbn10 = identifiers.find((id) => id.type === 'ISBN_10');

  if (isbn13) {
    result.isbn13 = isbn13.identifier;
  } else if (isbn10) {
    result.isbn13 = isbn10.identifier;
  }

  if (isbn10) {
    result.isbn10 = isbn10.identifier;
  }

  return result;
}

/**
 * Lambda function: ISBN検索とローマ字変換
 *
 * エンドポイント（API Gateway経由）：
 * - POST /isbn-search { isbn }
 * - POST /romanize { text }
 *
 * 認証：API Gateway JWT Token Authorizer (Lambda が JWT 検証)
 */

import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as isbn from 'node-isbn';
import Kuroshiro from 'kuroshiro';

/**
 * エラーレスポンス
 */
function errorResponse(status: number, message: string): APIGatewayProxyResult {
  return {
    statusCode: status,
    body: JSON.stringify({ error: message }),
  };
}

/**
 * 成功レスポンス
 */
function successResponse(data: unknown): APIGatewayProxyResult {
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
}

/**
 * ISBN 検索
 */
async function handleIsbnSearch(isbnStr: string): Promise<APIGatewayProxyResult> {
  return new Promise((resolve) => {
    isbn.resolve(isbnStr, (err: Error | null, book: unknown) => {
      if (err || !book) {
        resolve(errorResponse(404, `ISBN ${isbnStr} が見つかりません`));
        return;
      }

      const bookData = book as {
        title?: string;
        authors?: string[];
        publisher?: string;
        publishedDate?: string;
        industryIdentifiers?: Array<{ type: string; identifier: string }>;
        infoLink?: string;
      };

      // BookInfo 型に変換
      const title = bookData.title?.trim();
      const authors = bookData.authors ?? [];
      const publisher = bookData.publisher?.trim();
      const publishedDate = bookData.publishedDate;
      const infoLink = bookData.infoLink;

      if (!title || authors.length === 0 || !publishedDate) {
        resolve(errorResponse(400, '必須フィールド（title, authors, publishedDate）がありません'));
        return;
      }

      const year = parseInt(publishedDate.match(/^\d{4}/)![0], 10);
      const author = normalizeAuthor(authors[0]);
      const { isbn13, isbn10 } = extractIsbns(bookData.industryIdentifiers, isbnStr);

      resolve(
        successResponse({
          title,
          author,
          year,
          publisher,
          isbn13,
          isbn10,
          url: infoLink,
        }),
      );
    });
  });
}

/**
 * "Steve McConnell" → { first: "Steve", last: "McConnell" }
 */
function normalizeAuthor(rawAuthor: string): { first: string; last: string } {
  const parts = rawAuthor.trim().split(/\s+/);
  if (parts.length < 2) {
    return { first: rawAuthor, last: rawAuthor };
  }
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return { first, last };
}

/**
 * ISBN-13 と ISBN-10 を抽出
 */
function extractIsbns(
  identifiers: Array<{ type: string; identifier: string }> | undefined,
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

/**
 * ローマ字変換
 */
async function handleRomanize(text: string): Promise<APIGatewayProxyResult> {
  try {
    // 日本語が含まれていない場合はそのまま返す
    if (!hasJapanese(text)) {
      return successResponse({ romaji: text });
    }

    // kuroshiro でローマ字変換
    const kuroshiro = new Kuroshiro();
    // TinySegmenter: JavaScript 専用分かち書き（依存なし）
    await kuroshiro.init();

    const romaji = await kuroshiro.convert(text, { to: 'romaji' });
    return successResponse({ romaji });
  } catch (error) {
    console.error('Romanize error:', error);
    return errorResponse(500, 'ローマ字変換に失敗しました');
  }
}

/**
 * 日本語判定
 */
function hasJapanese(text: string): boolean {
  return /[　-〿぀-ゟ゠-ヿ一-鿿]/.test(text);
}

/**
 * メインハンドラ
 * JWT認証はAPI Gatewayの Token Authorizer で実施済み
 */
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  const body = event.body ? JSON.parse(event.body) : {};
  const path = event.path || event.requestContext?.path || '';

  // ルーティング
  if (path.includes('/isbn-search')) {
    const isbnStr = body.isbn as string | undefined;
    if (!isbnStr) {
      return errorResponse(400, 'isbn パラメータが必要です');
    }
    return await handleIsbnSearch(isbnStr);
  }

  if (path.includes('/romanize')) {
    const text = body.text as string | undefined;
    if (!text) {
      return errorResponse(400, 'text パラメータが必要です');
    }
    return await handleRomanize(text);
  }

  return errorResponse(404, 'Not found');
};

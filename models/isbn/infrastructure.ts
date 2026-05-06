/**
 * インフラ層: node-isbn ライブラリのラッパー
 */

import isbn from 'node-isbn';

/** node-isbn のレスポンス型（Google Books API / OpenLibrary 形式） */
export interface IsbnApiResponse {
  title?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  infoLink?: string;
}

/**
 * ISBN で書籍情報を取得する（node-isbn ラッパー）
 * @throws Error if lookup fails or no result found
 */
export async function fetchBookByIsbn(isbnStr: string): Promise<IsbnApiResponse> {
  return new Promise((resolve, reject) => {
    isbn.resolve(isbnStr, (err: Error | null, book: IsbnApiResponse | undefined) => {
      if (err) {
        reject(new Error(`ISBN ${isbnStr} の取得に失敗しました: ${err.message}`));
      } else if (!book) {
        reject(new Error(`ISBN ${isbnStr} の書籍情報が見つかりませんでした`));
      } else {
        resolve(book);
      }
    });
  });
}

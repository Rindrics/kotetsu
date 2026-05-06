/**
 * ドメインモデル: ISBN検索で取得した書籍情報
 * node-isbn の内部実装・レスポンス形式に依存しない純粋なドメイン表現
 */

export interface BookInfo {
  title: string;
  /** "Family, Given" または "姓,名" 形式 — BibEntry.author と同じ規約 */
  author: string;
  year: number;
  publisher?: string;
  isbn13: string;
  url?: string;
}

/**
 * citation key 生成の材料
 * BookInfo から導出するが、正規化後の値を保持する
 */
export interface CitationKeyParts {
  familyName: string;
  year: number;
  titleWords: [string, string];
}

/**
 * BibTeX エントリ文字列生成
 * bibtex-tidy --curly --numeric --sort-fields --no-align --sort --trailing-commas 準拠
 */

import type { BookInfo } from './domain';

/**
 * BookInfo から BibTeX エントリ文字列を生成
 *
 * 形式: @book{key,
 *   title = {...},
 *   author = {...},
 *   year = <num>,
 *   publisher = {...},
 *   isbn = <num>,
 *   url = {...},
 * }
 */
export function formatAsBibEntry(book: BookInfo, citationKey: string): string {
  const fields: string[] = [];

  // bibtex-tidy のソート順に合わせてフィールドを追加
  fields.push(`  title = {${escapeValue(book.title)}},`);
  fields.push(`  author = {${escapeValue(book.author)}},`);
  fields.push(`  year = ${book.year},`);

  if (book.publisher) {
    fields.push(`  publisher = {${escapeValue(book.publisher)}},`);
  }

  // isbn は数値として格納（bibtex-tidy --numeric の挙動に合わせる）
  const isbnNumeric = book.isbn13.replace(/[^0-9]/g, '');
  fields.push(`  isbn = ${isbnNumeric},`);

  if (book.url) {
    fields.push(`  url = {${escapeValue(book.url)}},`);
  }

  return `@book{${citationKey},\n${fields.join('\n')}\n}\n`;
}

/**
 * BibTeX値のエスケープ
 * - { } 文字を扱う場合は適切にエスケープ
 * - 改行はスペースに変換
 */
function escapeValue(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

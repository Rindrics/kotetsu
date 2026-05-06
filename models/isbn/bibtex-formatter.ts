/**
 * BibTeX エントリ文字列生成
 * bibtex-tidy --curly --numeric --sort-fields --no-align --sort --trailing-commas 準拠
 */

import type { BookInfo, AuthorName } from './domain';

/**
 * AuthorName を BibTeX 形式に変換
 * { first: "Steve", last: "McConnell" } → "McConnell, Steve"
 * { first: "善紀", last: "甲野" } → "甲野,善紀"
 */
export function authorNameToBibTeX(author: AuthorName): string {
  if (author.first === author.last) {
    // 単一名の場合（Madonna など）
    return author.last;
  }
  // BibTeX 規約: "Family, Given"
  return `${author.last}, ${author.first}`;
}

/**
 * BookInfo から BibTeX エントリ文字列を生成
 *
 * 形式: @book{key,
 *   title = {...},
 *   author = {...},
 *   year = <num>,
 *   publisher = {...},
 *   isbn = <num>,
 *   isbn10 = <num>,
 *   url = {...},
 * }
 */
export function formatAsBibEntry(book: BookInfo, citationKey: string): string {
  const fields: string[] = [];

  // bibtex-tidy のソート順に合わせてフィールドを追加
  fields.push(`  title = {${escapeValue(book.title)}},`);
  fields.push(`  author = {${authorNameToBibTeX(book.author)}},`);
  fields.push(`  year = ${book.year},`);

  if (book.publisher) {
    fields.push(`  publisher = {${escapeValue(book.publisher)}},`);
  }

  // isbn13 は数値として格納（bibtex-tidy --numeric の挙動に合わせる）
  const isbn13Numeric = book.isbn13.replace(/[^0-9]/g, '');
  fields.push(`  isbn = ${isbn13Numeric},`);

  // isbn10 があれば追加
  if (book.isbn10) {
    const isbn10Numeric = book.isbn10.replace(/[^0-9]/g, '');
    fields.push(`  isbn10 = ${isbn10Numeric},`);
  }

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

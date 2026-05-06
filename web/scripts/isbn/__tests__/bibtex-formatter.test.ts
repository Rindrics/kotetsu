import { describe, it, expect } from 'vitest';
import { formatAsBibEntry } from '../bibtex-formatter';
import type { BookInfo } from '../domain';

describe('bibtex-formatter.ts - formatAsBibEntry', () => {
  it('全フィールドがある場合', () => {
    const book: BookInfo = {
      title: 'Code Complete',
      author: 'McConnell, Steve',
      year: 2004,
      publisher: 'O\'Reilly Media, Inc.',
      isbn13: '9780735619678',
      url: 'https://books.google.com/books?id=...',
    };

    const result = formatAsBibEntry(book, 'mcconnell-2004-code-complete');

    expect(result).toContain('@book{mcconnell-2004-code-complete,');
    expect(result).toContain('title = {Code Complete},');
    expect(result).toContain('author = {McConnell, Steve},');
    expect(result).toContain('year = 2004,');
    expect(result).toContain('publisher = {O\'Reilly Media, Inc.},');
    expect(result).toContain('isbn = 9780735619678,');
    expect(result).toContain('url = {https://books.google.com/books?id=...},');
    expect(result).toContain('}');
  });

  it('publisherがない場合は省略', () => {
    const book: BookInfo = {
      title: 'Test Book',
      author: 'Smith, John',
      year: 2020,
      isbn13: '9780000000000',
    };

    const result = formatAsBibEntry(book, 'smith-2020-test-book');

    expect(result).not.toContain('publisher');
    expect(result).toContain('isbn = 9780000000000,');
  });

  it('urlがない場合は省略', () => {
    const book: BookInfo = {
      title: 'Test Book',
      author: 'Smith, John',
      year: 2020,
      publisher: 'Test Publisher',
      isbn13: '9780000000000',
    };

    const result = formatAsBibEntry(book, 'smith-2020-test-book');

    expect(result).not.toContain('url');
    expect(result).toContain('publisher = {Test Publisher},');
  });

  it('publisherとurlの両方がない場合', () => {
    const book: BookInfo = {
      title: 'Minimal Book',
      author: 'Doe, Jane',
      year: 2015,
      isbn13: '9781234567890',
    };

    const result = formatAsBibEntry(book, 'doe-2015-minimal-book');

    expect(result).toContain('title = {Minimal Book},');
    expect(result).toContain('author = {Doe, Jane},');
    expect(result).toContain('year = 2015,');
    expect(result).toContain('isbn = 9781234567890,');
    expect(result).not.toContain('publisher');
    expect(result).not.toContain('url');
  });

  it('ISBNから記号を除去して数値化', () => {
    const book: BookInfo = {
      title: 'Test',
      author: 'Author, Test',
      year: 2020,
      isbn13: '978-0-123-45678-9',
    };

    const result = formatAsBibEntry(book, 'test-key');

    expect(result).toContain('isbn = 9780123456789,');
  });

  it('タイトルに改行が含まれる場合はスペースに変換', () => {
    const book: BookInfo = {
      title: 'The Quick\nBrown\nFox',
      author: 'Author, Test',
      year: 2020,
      isbn13: '9780000000000',
    };

    const result = formatAsBibEntry(book, 'test-key');

    expect(result).toContain('title = {The Quick Brown Fox},');
  });

  it('著者名に複数スペースが含まれる場合は正規化', () => {
    const book: BookInfo = {
      title: 'Test',
      author: 'Smith,    John',
      year: 2020,
      isbn13: '9780000000000',
    };

    const result = formatAsBibEntry(book, 'test-key');

    expect(result).toContain('author = {Smith, John},');
  });

  it('フォーマットが末尾カンマあり', () => {
    const book: BookInfo = {
      title: 'Test',
      author: 'Author, Test',
      year: 2020,
      isbn13: '9780000000000',
    };

    const result = formatAsBibEntry(book, 'test-key');

    // 最後のフィールドも末尾カンマあり
    expect(result).toMatch(/isbn = \d+,\n\}/);
  });
});

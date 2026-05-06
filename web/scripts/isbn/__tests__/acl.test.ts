import { describe, it, expect } from 'vitest';
import { toBookInfo } from '../acl';
import type { IsbnApiResponse } from '../infrastructure';

describe('acl.ts - toBookInfo', () => {
  it('Google Books形式のレスポンスを変換', () => {
    const raw: IsbnApiResponse = {
      title: 'Code Complete',
      authors: ['Steve McConnell'],
      publisher: 'O\'Reilly Media',
      publishedDate: '2004',
      industryIdentifiers: [
        { type: 'ISBN_13', identifier: '9780735619678' },
      ],
      infoLink: 'https://books.google.com/books?id=...',
    };

    const result = toBookInfo(raw, '9780735619678');

    expect(result.title).toBe('Code Complete');
    expect(result.author).toBe('McConnell, Steve');
    expect(result.year).toBe(2004);
    expect(result.publisher).toBe('O\'Reilly Media');
    expect(result.isbn13).toBe('9780735619678');
    expect(result.url).toBe('https://books.google.com/books?id=...');
  });

  it('著者名を Given Family → Family, Given に変換', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Jane Doe'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.author).toBe('Doe, Jane');
  });

  it('複数著者がある場合は先頭のみ使用', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['John Smith', 'Jane Doe'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.author).toBe('Smith, John');
  });

  it('publishedDate形式: "2004-01-15" → year: 2004', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2004-01-15',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.year).toBe(2004);
  });

  it('publishedDate形式: "2004-01" → year: 2004', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2004-01',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.year).toBe(2004);
  });

  it('ISBN-13が優先される', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2020',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '0735619670' },
        { type: 'ISBN_13', identifier: '9780735619678' },
      ],
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.isbn13).toBe('9780735619678');
  });

  it('ISBN-13がない場合はISBN-10を使用', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2020',
      industryIdentifiers: [
        { type: 'ISBN_10', identifier: '0735619670' },
      ],
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.isbn13).toBe('0735619670');
  });

  it('industryIdentifiersがない場合はsourceIsbnを使用', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780735619678');
    expect(result.isbn13).toBe('9780735619678');
  });

  it('titleがない場合はエラーを投げる', () => {
    const raw: IsbnApiResponse = {
      authors: ['Test Author'],
      publishedDate: '2020',
    };

    expect(() => toBookInfo(raw, '9780000000000')).toThrow('title が取得できませんでした');
  });

  it('authorsがない場合はエラーを投げる', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      publishedDate: '2020',
    };

    expect(() => toBookInfo(raw, '9780000000000')).toThrow('authors が取得できませんでした');
  });

  it('publishedDateがない場合はエラーを投げる', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
    };

    expect(() => toBookInfo(raw, '9780000000000')).toThrow(
      'publishedDate を年として解析できませんでした',
    );
  });

  it('publisherは省略可能', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.publisher).toBeUndefined();
  });

  it('urlは省略可能', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Test Author'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.url).toBeUndefined();
  });

  it('著者名が1単語のみの場合はそのまま使用', () => {
    const raw: IsbnApiResponse = {
      title: 'Test',
      authors: ['Madonna'],
      publishedDate: '2020',
    };

    const result = toBookInfo(raw, '9780000000000');
    expect(result.author).toBe('Madonna');
  });
});

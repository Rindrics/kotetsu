import { describe, it, expect } from 'vitest';
import { buildCitationKey } from '../citation-key';
import type { AuthorName } from '../domain';

describe('citation-key.ts - buildCitationKey', () => {
  it('英語著者・英語タイトル: McConnell + 2004 + Code Complete', async () => {
    const author: AuthorName = { first: 'Steve', last: 'McConnell' };
    const result = await buildCitationKey(author, 2004, 'Code Complete');
    expect(result).toBe('mcconnell-2004-code-complete');
  });

  it('英語著者・英語タイトル: Müller + 2010 + Advanced Topics', async () => {
    const author: AuthorName = { first: 'Hans', last: 'Müller' };
    const result = await buildCitationKey(author, 2010, 'Advanced Topics');
    expect(result).toBe('muller-2010-advanced-topics');
  });

  it('タイトルが1単語のみの場合は分割しない', async () => {
    const author: AuthorName = { first: 'John', last: 'Smith' };
    const result = await buildCitationKey(author, 2015, 'Algorithms');
    expect(result).toBe('smith-2015-algorithms');
  });

  it('タイトルに記号が含まれる場合は除去', async () => {
    const author: AuthorName = { first: 'Steve', last: 'Jobs' };
    const result = await buildCitationKey(author, 2005, 'Think Different!');
    expect(result).toBe('jobs-2005-think-different');
  });

  it('著者名が単一の場合', async () => {
    const author: AuthorName = { first: 'Madonna', last: 'Madonna' };
    const result = await buildCitationKey(author, 2000, 'Ray of Light');
    expect(result).toBe('madonna-2000-ray-of');
  });

  it('著者名に複数単語がある場合', async () => {
    const author: AuthorName = { first: 'John', last: 'Van Der Berg' };
    const result = await buildCitationKey(author, 2010, 'Programming');
    expect(result).toBe('van-der-berg-2010-programming');
  });

  it('タイトルに複数スペースがある場合', async () => {
    const author: AuthorName = { first: 'John', last: 'Smith' };
    const result = await buildCitationKey(author, 2005, 'The Quick Brown Fox');
    expect(result).toBe('smith-2005-quick-brown');
  });

  it('romanizer関数が提供された場合、日本語を変換', async () => {
    const mockRomanizer = async (text: string) => {
      const map: { [key: string]: string } = {
        '森田': 'morita',
        '数学する身体': 'sugakusuru karada',
      };
      return map[text] || text;
    };

    const author: AuthorName = { first: '善紀', last: '森田' };
    const result = await buildCitationKey(author, 2015, '数学する身体', mockRomanizer);
    expect(result).toBe('morita-2015-sugakusuru-karada');
  });
});

import { describe, it, expect } from 'vitest';
import { buildCitationKey } from '../citation-key';

describe('citation-key.ts - buildCitationKey', () => {
  it('英語著者・英語タイトル: McConnell, Steve + 2004 + Code Complete', async () => {
    const result = await buildCitationKey('McConnell, Steve', 2004, 'Code Complete');
    expect(result).toBe('mcconnell-2004-code-complete');
  });

  it('英語著者・英語タイトル: Müller, Hans + 2010 + Advanced Topics', async () => {
    const result = await buildCitationKey('Müller, Hans', 2010, 'Advanced Topics');
    expect(result).toBe('muller-2010-advanced-topics');
  });

  it('タイトルが1単語のみの場合は分割', async () => {
    const result = await buildCitationKey('Smith, John', 2015, 'Algorithms');
    expect(result).toBe('smith-2015-algo-rithms');
  });

  it('タイトルに記号が含まれる場合は除去', async () => {
    const result = await buildCitationKey('Jobs, Steve', 2005, 'Think Different!');
    expect(result).toBe('jobs-2005-think-different');
  });

  it('著者名がカンマなしの場合はそのままフォールバック', async () => {
    const result = await buildCitationKey('Madonna', 2000, 'Ray of Light');
    expect(result).toBe('madonna-2000-ray-of');
  });

  it('著者名に複数スペースがある場合', async () => {
    const result = await buildCitationKey('Van Der Berg, John', 2010, 'Programming');
    expect(result).toBe('berg-2010-programming-');
  });

  it('タイトルに複数スペースがある場合', async () => {
    const result = await buildCitationKey('Smith, John', 2005, 'The Quick Brown Fox');
    expect(result).toBe('smith-2005-the-quick');
  });

  it('romanizer関数が提供された場合、日本語を変換', async () => {
    const mockRomanizer = async (text: string) => {
      const map: { [key: string]: string } = {
        '森田': 'morita',
        '数学する身体': 'sugakusuru karada',
      };
      return map[text] || text;
    };

    const result = await buildCitationKey('森田, 真生', 2015, '数学する身体', mockRomanizer);
    expect(result).toBe('morita-2015-sugakusuru-karada');
  });
});

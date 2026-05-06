/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * 日本語対応: Lambda の romanize エンドポイントを使用
 */

import { hasJapanese, normalizeForCitationKey } from '../../lib/romanize';

/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * @example
 * buildCitationKey("McConnell, Steve", 2004, "Code Complete")
 * // => "mcconnell-2004-code-complete"
 *
 * @example 日本語（ローマ字変換後）
 * buildCitationKey("森田, 真生", 2015, "数学する身体", romanizerFn)
 * // => "morita-2015-sugakusuru-karada"
 */
export async function buildCitationKey(
  author: string,
  year: number,
  title: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<string> {
  const family = await normalizeFamilyName(author, romanizer);
  const words = await extractTitleWords(title, romanizer);
  return `${family}-${year}-${words[0]}-${words[1]}`;
}

/**
 * "Family, Given" から Family name を取得して正規化
 * 日本語の場合はローマ字変換
 */
async function normalizeFamilyName(
  author: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<string> {
  const family = author.split(',')[0].trim();

  if (hasJapanese(family) && romanizer) {
    const roma = await romanizer(family);
    return normalizeForCitationKey(roma);
  }

  return normalizeForCitationKey(family);
}

/**
 * タイトルから最初の2単語を取得
 * 日本語タイトルはローマ字変換後、スペース区切りで取得
 */
async function extractTitleWords(
  title: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<[string, string]> {
  const normalized = title.trim();

  if (hasJapanese(normalized) && romanizer) {
    const roma = await romanizer(normalized);
    const words = roma.split(/\s+/).map(normalizeForCitationKey).filter((w) => w.length > 0);

    if (words.length >= 2) {
      return [words[0], words[1]];
    }
    if (words.length === 1) {
      const word = words[0];
      const mid = Math.ceil(word.length / 2);
      return [word.slice(0, mid), word.slice(mid) || word.slice(0, mid)];
    }
    return ['unknown', 'unknown'];
  }

  // ASCII タイトル: スペース区切り
  const words = normalized
    .split(/\s+/)
    .map(normalizeForCitationKey)
    .filter((w) => w.length > 0);

  if (words.length >= 2) {
    return [words[0], words[1]];
  }
  if (words.length === 1) {
    const word = words[0];
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), word.slice(mid) || word.slice(0, mid)];
  }
  return ['unknown', 'unknown'];
}

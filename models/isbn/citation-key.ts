/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * 日本語対応: Lambda の romanize エンドポイントを使用
 */

import { hasJapanese, normalizeForCitationKey } from '../../lib/romanize';
import type { AuthorName } from './domain';

/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * @example
 * buildCitationKey({ first: "Steve", last: "McConnell" }, 2004, "Code Complete")
 * // => "mcconnell-2004-code-complete"
 *
 * @example 日本語（ローマ字変換後）
 * buildCitationKey({ first: "善紀", last: "森田" }, 2015, "数学する身体", romanizerFn)
 * // => "morita-2015-sugakusuru-karada"
 */
export async function buildCitationKey(
  author: AuthorName,
  year: number,
  title: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<string> {
  const family = await normalizeFamilyName(author.last, romanizer);
  const words = await extractTitleWords(title, romanizer);
  return `${family}-${year}-${words[0]}-${words[1]}`;
}

/**
 * Family name を正規化
 * 日本語の場合はローマ字変換
 */
async function normalizeFamilyName(
  familyName: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<string> {
  if (hasJapanese(familyName) && romanizer) {
    const roma = await romanizer(familyName);
    return normalizeForCitationKey(roma);
  }

  return normalizeForCitationKey(familyName);
}

/**
 * 冠詞リスト（英語）
 */
const ARTICLES = new Set(['a', 'an', 'the']);

/**
 * タイトルから最初の2単語を取得（冠詞除外）
 * 日本語タイトルはローマ字変換後、スペース区切りで取得
 */
async function extractTitleWords(
  title: string,
  romanizer?: (text: string) => Promise<string>,
): Promise<[string, string]> {
  const normalized = title.trim();

  if (hasJapanese(normalized) && romanizer) {
    const roma = await romanizer(normalized);
    const words = roma
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

  // ASCII タイトル: スペース区切り、冠詞を除外
  const allWords = normalized
    .split(/\s+/)
    .map(normalizeForCitationKey)
    .filter((w) => w.length > 0);

  // 冠詞を除いた単語を取得
  const contentWords = allWords.filter((w) => !ARTICLES.has(w));

  if (contentWords.length >= 2) {
    return [contentWords[0], contentWords[1]];
  }
  if (contentWords.length === 1) {
    const word = contentWords[0];
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), word.slice(mid) || word.slice(0, mid)];
  }

  // 冠詞しかない場合は全単語を使う
  if (allWords.length >= 2) {
    return [allWords[0], allWords[1]];
  }
  if (allWords.length === 1) {
    const word = allWords[0];
    const mid = Math.ceil(word.length / 2);
    return [word.slice(0, mid), word.slice(mid) || word.slice(0, mid)];
  }
  return ['unknown', 'unknown'];
}

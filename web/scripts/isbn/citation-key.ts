/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * 日本語対応: kuroshiro + kuroshiro-analyzer-node-kuromoji でローマ字変換
 */

import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from 'kuroshiro-analyzer-node-kuromoji';

let kuroshiro: Kuroshiro | null = null;

/**
 * kuroshiro インスタンスを初期化（遅延初期化）
 */
async function initKuroshiro(): Promise<Kuroshiro> {
  if (kuroshiro) {
    return kuroshiro;
  }
  kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
  return kuroshiro;
}

/**
 * テキストに日本語文字が含まれるか判定
 */
function hasJapanese(text: string): boolean {
  return /[　-〿぀-ゟ゠-ヿ一-鿿]/.test(text);
}

/**
 * citation key 生成
 * 形式: {familyName}-{year}-{word1}-{word2}
 *
 * @example
 * buildCitationKey("McConnell, Steve", 2004, "Code Complete")
 * // => "mcconnell-2004-code-complete"
 *
 * @example 日本語（ローマ字変換）
 * buildCitationKey("森田, 真生", 2015, "数学する身体")
 * // => "morita-2015-sugakusuru-karada"
 */
export async function buildCitationKey(
  author: string,
  year: number,
  title: string,
): Promise<string> {
  const family = await normalizeFamilyName(author);
  const words = await extractTitleWords(title);
  return `${family}-${year}-${words[0]}-${words[1]}`;
}

/**
 * "Family, Given" から Family name を取得して正規化
 * 日本語の場合はローマ字変換
 */
async function normalizeFamilyName(author: string): Promise<string> {
  const family = author.split(',')[0].trim();

  if (hasJapanese(family)) {
    const kuro = await initKuroshiro();
    const roma = await kuro.convert(family, { to: 'romaji' });
    return normalizeForKey(roma);
  }

  return normalizeForKey(family);
}

/**
 * タイトルから最初の2単語を取得
 * 日本語タイトルはローマ字変換後、スペース区切りで取得
 */
async function extractTitleWords(title: string): Promise<[string, string]> {
  const normalized = title.trim();

  if (hasJapanese(normalized)) {
    const kuro = await initKuroshiro();
    const roma = await kuro.convert(normalized, { to: 'romaji' });
    const words = roma.split(/\s+/).map(normalizeForKey).filter((w) => w.length > 0);

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
  const words = normalized.split(/\s+/).map(normalizeForKey).filter((w) => w.length > 0);

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

/**
 * citation key 用に正規化
 * - 小文字化
 * - 記号・句読点を除去
 * - 先頭・末尾の空白除去
 * - スペースをハイフンへ
 */
function normalizeForKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

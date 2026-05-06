/**
 * 日本語テキスト → ローマ字変換ユーティリティ
 * web/scripts と .github/scripts の両方から利用される共有ライブラリ
 *
 * ローマ字変換は Lambda (infrastructure/lambda/romanize.ts) で行う
 * このモジュールは正規化と判定のみ提供
 */

/**
 * テキストに日本語文字が含まれるか判定
 */
export function hasJapanese(text: string): boolean {
  return /[　-〿぀-ゟ゠-ヿ一-鿿]/.test(text);
}

/**
 * Lambda の romanize エンドポイント経由でローマ字変換を実行
 * web/scripts または GitHub Actions から呼び出し
 */
export async function toRomaji(text: string, lambdaUrl: string, jwtToken: string): Promise<string> {
  if (!hasJapanese(text)) {
    return text;
  }

  const response = await fetch(lambdaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Romanize failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { romaji: string };
  return data.romaji;
}

/**
 * Citation key 生成用の正規化
 * - 小文字化
 * - 記号・句読点を除去
 * - スペースをハイフンに変換
 */
export function normalizeForCitationKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

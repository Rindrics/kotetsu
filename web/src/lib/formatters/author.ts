/**
 * Check if the name contains Japanese characters (Hiragana, Katakana, or Kanji)
 */
function isJapanese(name: string): boolean {
	// Match Hiragana, Katakana, and CJK Unified Ideographs
	return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(name);
}

/**
 * Format author name based on language detection or explicit override
 *
 * @param rawAuthor - Author name in "Family, Given" format
 * @param language - Optional language override (e.g., "japanese", "english")
 * @returns Formatted author name
 *
 * @example
 * formatAuthor("諏訪, 正樹")           // => "諏訪正樹"
 * formatAuthor("Smith, John")          // => "John Smith"
 * formatAuthor("Müller, François")     // => "François Müller"
 */
export function formatAuthor(rawAuthor: string, language?: string): string {
	const parts = rawAuthor.split(',').map((s) => s.trim());

	if (parts.length !== 2) {
		return rawAuthor; // fallback for unexpected format
	}

	const [family, given] = parts;
	const isJapaneseName = language === 'japanese' || (!language && isJapanese(rawAuthor));

	if (isJapaneseName) {
		return `${family}${given}`; // 諏訪正樹 (no space)
	} else {
		return `${given} ${family}`; // John Smith (given first)
	}
}


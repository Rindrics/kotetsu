/**
 * Result of extracting tags from text
 */
export interface ExtractedTags {
	tags: string[];
	cleanedText: string;
}

/**
 * Extract hashtags from text and remove them
 * Tags are in format #tag (word characters, numbers, underscores)
 * Escaped hashes \# are preserved as regular #
 * @param text - Input text containing hashtags
 * @returns Object with extracted tags and cleaned text
 */
export function extractTags(text: string): ExtractedTags {
	const tags: string[] = [];
	const placeholder = '\x00';
	let processedText = text;

	// Replace \# with placeholder to protect from tag extraction
	processedText = processedText.replace(/\\#/g, placeholder);

	// Match tags: # preceded by space/start/non-word-char, followed by word chars
	// Use lookahead to avoid consuming the following character
	const tagRegex = /(^|[\s\W])#([\w_\p{L}\p{N}]+)(?=\s|$|[^\w_\p{L}\p{N}])/gu;

	processedText = processedText.replace(tagRegex, (match, prefix, tag) => {
		tags.push(tag);
		// Keep prefix (space or start)
		return prefix;
	});

	// Restore escaped hashes and clean up spacing
	let cleanedText = processedText.replace(new RegExp(placeholder, 'g'), '#');
	// Normalize multiple spaces to single space and trim
	cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

	return { tags, cleanedText };
}

/**
 * Convert escaped hash \# to regular #
 * @param text - Text with escaped hashes
 * @returns Text with escaped hashes converted
 */
export function unescapeText(text: string): string {
	return text.replace(/\\#/g, '#');
}

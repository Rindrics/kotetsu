import type { BibEntry } from '../types';

/**
 * Parse BibTeX content and return an array of BibEntry
 * Uses a simple regex-based parser for basic BibTeX files
 */
export function parseBibTeX(content: string): BibEntry[] {
	const entries: BibEntry[] = [];

	// Match BibTeX entries: @type{key, ... }
	const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)\}/g;
	let match;

	while ((match = entryRegex.exec(content)) !== null) {
		const type = match[1].toLowerCase();
		const id = match[2].trim();
		const fieldsContent = match[3];

		const fields = parseFields(fieldsContent);

		entries.push({
			id,
			type,
			title: fields.title || '',
			author: fields.author || '',
			year: parseInt(fields.year || '0', 10),
			publisher: fields.publisher,
			series: fields.series,
			isbn: fields.isbn,
			url: fields.url
		});
	}

	return entries;
}

/**
 * Parse field content from BibTeX entry
 * Supports values in braces (including nested), double quotes, and bare words/numbers
 */
function parseFields(content: string): Record<string, string> {
	const fields: Record<string, string> = {};

	// Match field = {value} or field = "value" or field = bareword
	const fieldRegex = /\s*(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\w+))\s*,?/gs;
	let match;

	while ((match = fieldRegex.exec(content)) !== null) {
		const name = match[1].toLowerCase();
		// value can be in braces (match[2]), quotes (match[3]), or be a bare word/number (match[4])
		const value = match[2] ?? match[3] ?? match[4];
		if (value !== undefined) {
			fields[name] = value.trim();
		}
	}

	return fields;
}

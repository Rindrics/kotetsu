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
 */
function parseFields(content: string): Record<string, string> {
	const fields: Record<string, string> = {};

	// Match field = value or field = {value}
	const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|(\d+))/g;
	let match;

	while ((match = fieldRegex.exec(content)) !== null) {
		const name = match[1].toLowerCase();
		const value = match[2] ?? match[3];
		fields[name] = value;
	}

	return fields;
}

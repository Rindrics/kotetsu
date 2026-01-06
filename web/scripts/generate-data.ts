/**
 * Build script to generate bibliography.json from bib and yaml files
 * Run with: npx tsx scripts/generate-data.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCustomInfo } from '../src/lib/parsers/yaml';
import type { BibEntry, BibliographyItem, CustomInfo } from '../src/lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const contentsDir = join(projectRoot, 'contents');
const outputDir = join(__dirname, '..', 'static', 'data');

// Parse BibTeX content
function parseBibTeX(content: string): BibEntry[] {
	const entries: BibEntry[] = [];
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

// Merge entries with custom info
function mergeBibliography(
	entries: BibEntry[],
	customInfo: Map<string, CustomInfo>
): BibliographyItem[] {
	return entries.map((entry) => ({
		...entry,
		customInfo: customInfo.get(entry.id)
	}));
}

// Main
function main() {
	console.log('Generating bibliography.json...');

	const bibContent = readFileSync(join(contentsDir, 'references.bib'), 'utf-8');
	const yamlContent = readFileSync(join(contentsDir, 'custom_info.yaml'), 'utf-8');

	const bibEntries = parseBibTeX(bibContent);
	const customInfo = parseCustomInfo(yamlContent);
	const items = mergeBibliography(bibEntries, customInfo);

	// Ensure output directory exists
	mkdirSync(outputDir, { recursive: true });

	// Write JSON
	const outputPath = join(outputDir, 'bibliography.json');
	writeFileSync(outputPath, JSON.stringify(items, null, 2));

	console.log(`Generated ${outputPath} with ${items.length} entries`);
}

main();


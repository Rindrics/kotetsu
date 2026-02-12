/**
 * Build script to generate bibliography.json from bib and yaml files
 * Run with: npx tsx scripts/generate-data.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseCustomInfo } from '../src/lib/parsers/yaml';
import type { BibEntry, BibliographyItem, CustomInfoFull, CustomInfoFrontend } from '../src/lib/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..');
const contentsDir = join(projectRoot, 'contents');
const outputDir = join(__dirname, '..', 'src', 'lib', 'data');

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

/**
 * Convert internal CustomInfoFull to frontend-safe CustomInfoFrontend
 * Explicitly excludes memo field to prevent accidental leakage
 */
function toFrontendInfo(info: CustomInfoFull): CustomInfoFrontend | undefined {
	const frontendInfo: CustomInfoFrontend = {
		tags: info.tags,
		review: info.review,
		readDate: info.readDate
	};

	// Only include customInfo if at least one field is present
	const hasContent = Object.values(frontendInfo).some((v) => v !== undefined);
	return hasContent ? frontendInfo : undefined;
}

/**
 * Merge entries with custom info
 * Converts internal CustomInfoFull to frontend-safe CustomInfoFrontend
 * Supports multiple sites via customInfo[siteId]
 */
function mergeBibliography(
	entries: BibEntry[],
	customInfoByEntry: Map<string, { [siteId: string]: CustomInfoFull }>
): BibliographyItem[] {
	return entries.map((entry) => {
		const siteInfoMap = customInfoByEntry.get(entry.id);

		if (!siteInfoMap || Object.keys(siteInfoMap).length === 0) {
			return { ...entry };
		}

		// Convert per-site CustomInfoFull to frontend-safe CustomInfoFrontend
		const customInfo: { [siteId: string]: CustomInfoFrontend } = {};
		for (const [siteId, info] of Object.entries(siteInfoMap)) {
			const frontendInfo = toFrontendInfo(info);
			if (frontendInfo) {
				customInfo[siteId] = frontendInfo;
			}
		}

		return {
			...entry,
			customInfo: Object.keys(customInfo).length > 0 ? customInfo : undefined
		};
	});
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

	// Write TypeScript module
	const outputPath = join(outputDir, 'bibliography.ts');
	const moduleContent = `import type { BibliographyItem } from '../types';

export const bibliographyData: BibliographyItem[] = ${JSON.stringify(items, null, 2)};
`;
	writeFileSync(outputPath, moduleContent);

	console.log(`Generated ${outputPath} with ${items.length} entries`);
}

main();


import type { BibEntry, BibliographyItem, CustomInfo } from './types';

/**
 * Merge BibTeX entries with custom info
 */
export function mergeBibliography(
	entries: BibEntry[],
	customInfo: Map<string, CustomInfo>
): BibliographyItem[] {
	return entries.map((entry) => ({
		...entry,
		customInfo: customInfo.get(entry.id)
	}));
}


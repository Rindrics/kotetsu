import type { BibliographyItem } from '../types';

/**
 * Filter bibliography items by siteId
 *
 * Current limitation: Only 'akirahayashi_com' is supported.
 * The generated bibliography.json only contains customInfo metadata
 * for 'akirahayashi_com'. When a second site is added, the data
 * generation pipeline will need to be updated to support multi-site
 * metadata structure.
 *
 * @param items - Full bibliography items array
 * @param siteId - The site identifier to filter by
 * @returns Items that have customInfo metadata for the specified site
 */
export function filterBySiteId(
	items: BibliographyItem[],
	siteId: string
): BibliographyItem[] {
	// Current data only contains customInfo for 'akirahayashi_com'
	if (siteId !== 'akirahayashi_com') {
		return [];
	}

	// Return items that have customInfo (indicating they're tagged for this site)
	return items.filter(item => item.customInfo !== undefined);
}

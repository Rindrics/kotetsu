import type { BibliographyItem } from '../types';

/**
 * Filter bibliography items by siteId
 *
 * Returns only items that have customInfo metadata for the specified site.
 *
 * @param items - Full bibliography items array
 * @param siteId - The site identifier to filter by
 * @returns Items that have customInfo metadata for the specified site
 */
export function filterBySiteId(
	items: BibliographyItem[],
	siteId: string
): BibliographyItem[] {
	return items.filter((item) => item.customInfo?.[siteId] !== undefined);
}

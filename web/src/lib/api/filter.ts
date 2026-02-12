import type { BibliographyItem } from '../types';

/**
 * Filter bibliography items by siteId
 *
 * Returns only items that have customInfo metadata for the specified site.
 * Items without site-specific metadata are excluded.
 *
 * This filtering prevents accidental exposure of unpublished entries
 * and ensures each site only receives relevant bibliography data.
 *
 * @param items - Full bibliography items array (with multi-site customInfo)
 * @param siteId - The site identifier to filter by
 * @returns Filtered array of items with metadata for the specified siteId
 */
export function filterBySiteId(
	items: BibliographyItem[],
	siteId: string
): BibliographyItem[] {
	return items.filter((item) => item.customInfo?.[siteId] !== undefined);
}

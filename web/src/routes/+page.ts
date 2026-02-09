import type { BibEntry, CustomInfoFrontend } from '$lib/types';
import { bibliographyData } from '$lib/data/bibliography';

export const prerender = true;

const DEFAULT_SITE_ID = 'akirahayashi_com';

export function load() {
	// Transform bibliography data to frontend format: extract site-specific customInfo
	const items: Array<BibEntry & { customInfo?: CustomInfoFrontend }> = bibliographyData.map(
		(item) => ({
			...item,
			customInfo: item.customInfo?.[DEFAULT_SITE_ID]
		})
	);

	return { items };
}


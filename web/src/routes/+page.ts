import type { BibEntry, CustomInfoFrontend, PageData } from '$lib/types';
import { bibliographyData } from '$lib/data/bibliography';
import { DEFAULT_SITE_ID } from '$lib/config/constants';

export const prerender = true;

export function load({ url }) {
	// Transform bibliography data to frontend format: extract site-specific customInfo
	// Explicitly exclude memo field for security
	const items: Array<BibEntry & { readDate?: string; customInfo?: CustomInfoFrontend }> =
		bibliographyData.map((item) => {
			const siteInfo = item.customInfo?.[DEFAULT_SITE_ID];
			const customInfo: CustomInfoFrontend | undefined = siteInfo
				? {
						tags: siteInfo.tags,
						review: siteInfo.review,
						extractedTags: siteInfo.extractedTags
					}
				: undefined;

			return {
				...item,
				customInfo
			};
		});

	const initialSearch = url.searchParams.get('q') || '';

	return { items, initialSearch };
}


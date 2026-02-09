import type { BibEntry, CustomInfoFrontend } from '$lib/types';
import { bibliographyData } from '$lib/data/bibliography';

export const prerender = true;

const DEFAULT_SITE_ID = 'akirahayashi_com';

export function load() {
	// Transform bibliography data to frontend format: extract site-specific customInfo
	// Explicitly exclude memo field for security
	const items: Array<BibEntry & { customInfo?: CustomInfoFrontend }> = bibliographyData.map(
		(item) => {
			const siteInfo = item.customInfo?.[DEFAULT_SITE_ID];
			const customInfo: CustomInfoFrontend | undefined = siteInfo
				? {
						tags: siteInfo.tags,
						review: siteInfo.review,
						readDate: siteInfo.readDate
					}
				: undefined;

			return {
				...item,
				customInfo
			};
		}
	);

	return { items };
}


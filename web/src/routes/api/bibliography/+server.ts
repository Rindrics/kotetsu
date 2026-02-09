import type { RequestHandler } from './$types';
import type { BibEntry, CustomInfoFrontend } from '$lib/types';
import { json } from '@sveltejs/kit';
import { bibliographyData } from '$lib/data/bibliography';
import { filterBySiteId } from '$lib/api/filter';

/**
 * GET /api/bibliography?siteId=<site-id>
 *
 * Returns filtered bibliography data for a specific site.
 *
 * Query Parameters:
 *   - siteId (required): The site identifier (alphanumeric, underscore, dot)
 *
 * Response:
 *   - 200: JSON array of bibliography entries with site-specific customInfo
 *   - 400: Missing or invalid siteId parameter
 *   - 404: siteId not found in database
 *
 * Example:
 *   GET /api/bibliography?siteId=akirahayashi_com
 */
export const GET: RequestHandler = async ({ url }) => {
	// 1. Validate siteId parameter
	const siteId = url.searchParams.get('siteId');

	if (!siteId) {
		return json({ error: 'Missing required parameter: siteId' }, { status: 400 });
	}

	// Validate siteId format: alphanumeric, underscore, dot only
	if (!/^[a-zA-Z0-9_.]+$/.test(siteId)) {
		return json({ error: 'Invalid siteId format' }, { status: 400 });
	}

	// 2. Filter by siteId from in-memory data
	const filtered = filterBySiteId(bibliographyData, siteId);

	if (filtered.length === 0) {
		return json({ error: `siteId not found: ${siteId}` }, { status: 404 });
	}

	// 3. Transform to frontend format: extract site-specific customInfo
	const transformed = filtered.map((item) => ({
		...item,
		customInfo: item.customInfo?.[siteId]
	})) as Array<BibEntry & { customInfo?: CustomInfoFrontend }>;

	// 4. Return with cache headers
	return json(transformed, {
		headers: {
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Content-Type': 'application/json'
		}
	});
};

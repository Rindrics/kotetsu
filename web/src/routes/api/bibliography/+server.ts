import type { RequestHandler } from './$types';
import type { BibEntry, CustomInfoFrontend } from '$lib/types';
import { json } from '@sveltejs/kit';
import { bibliographyData } from '$lib/data/bibliography';
import { filterBySiteId } from '$lib/api/filter';

/**
 * GET /api/bibliography?siteId=<site-id>
 *
 * Returns bibliography entries associated with a specific site.
 * Only entries with metadata for the specified siteId are returned.
 *
 * Currently supports single site operations. Multi-site aggregation
 * requires separate API calls with different siteId values.
 *
 * Query Parameters:
 *   - siteId (required): Site identifier. Format: alphanumeric, underscore, dot only.
 *                       Example: akirahayashi_com
 *
 * Response Body (200 OK):
 *   JSON array of bibliography entries. Each entry includes:
 *   - id: citation key (string)
 *   - type: BibTeX entry type (string, lowercase)
 *   - title, author, year: standard BibTeX fields
 *   - publisher?, series?, isbn?, url?: optional fields
 *   - customInfo?: metadata for the requested siteId
 *     - tags?: array of strings
 *     - review?: string or array of strings
 *     - readDate?: ISO 8601 date string
 *   Note: internal memo field is intentionally excluded for security
 *
 * Error Responses:
 *   - 400: { error: "..." } - Missing or invalid siteId parameter
 *   - 404: { error: "..." } - siteId not found or no entries for site
 *
 * Cache:
 *   - Cache-Control: public, max-age=3600, stale-while-revalidate=86400
 *   - ETag: SHA-256 hash of response content for conditional requests
 *
 * Examples:
 *   GET /api/bibliography?siteId=akirahayashi_com
 *   GET /api/bibliography?siteId=invalid (400 if no entries)
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

	// 4. Generate ETag from response content using Web Crypto API
	const responseBody = JSON.stringify(transformed);
	const encoder = new TextEncoder();
	const data = encoder.encode(responseBody);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
	const etag = `"${hashHex.slice(0, 16)}"`;

	// 5. Return with cache and ETag headers
	return json(transformed, {
		headers: {
			'ETag': etag,
			'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			'Content-Type': 'application/json'
		}
	});
};

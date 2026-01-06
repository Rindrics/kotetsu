import { parse } from 'yaml';
import type { CustomInfo } from '../types';

/**
 * Default site ID for custom info lookup
 */
const DEFAULT_SITE_ID = 'akirahayashi_com';

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parse YAML content and return a map of entry ID to CustomInfo
 * Returns empty Map on invalid inputs or parse errors
 */
export function parseCustomInfo(
	content: string,
	siteId: string = DEFAULT_SITE_ID
): Map<string, CustomInfo> {
	const result = new Map<string, CustomInfo>();

	let parsed: unknown;
	try {
		parsed = parse(content);
	} catch (error) {
		console.error('Failed to parse YAML:', error);
		return result;
	}

	if (!isPlainObject(parsed)) {
		return result;
	}

	for (const [entryId, sites] of Object.entries(parsed)) {
		if (!isPlainObject(sites)) {
			continue;
		}

		const siteInfo = sites[siteId];
		if (!isPlainObject(siteInfo)) {
			continue;
		}

		// Validate tags (array of strings or undefined)
		const tags = siteInfo.tags;
		const validTags =
			tags === undefined || (Array.isArray(tags) && tags.every((t) => typeof t === 'string'));

		// Validate review (string or undefined)
		const review = siteInfo.review;
		const validReview = review === undefined || typeof review === 'string';

		if (validTags && validReview) {
			result.set(entryId, {
				tags: tags as string[] | undefined,
				review: review as string | undefined
			});
		}
	}

	return result;
}


import { parse } from 'yaml';
import type { CustomInfoFull } from '../types';

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate CustomInfoFull fields
 */
function validateCustomInfo(value: unknown): value is CustomInfoFull {
	if (!isPlainObject(value)) {
		return false;
	}

	// Validate tags (array of strings or undefined)
	const tags = value.tags;
	const validTags =
		tags === undefined || (Array.isArray(tags) && tags.every((t) => typeof t === 'string'));

	// Validate review (string, array of strings, or undefined)
	const review = value.review;
	const validReview =
		review === undefined ||
		typeof review === 'string' ||
		(Array.isArray(review) && review.every((r) => typeof r === 'string'));

	// Validate memo (array of strings or undefined)
	const memo = value.memo;
	const validMemo =
		memo === undefined || (Array.isArray(memo) && memo.every((m) => typeof m === 'string'));

	// Validate readDate (string or undefined)
	const readDate = value.readDate;
	const validReadDate = readDate === undefined || typeof readDate === 'string';

	return validTags && validReview && validMemo && validReadDate;
}

/**
 * Parse YAML content and return a map of entry ID to per-site CustomInfoFull
 * Returns empty Map on invalid inputs or parse errors
 * @internal Returns full info including memo (internal-only field)
 */
export function parseCustomInfo(content: string): Map<string, { [siteId: string]: CustomInfoFull }> {
	const result = new Map<string, { [siteId: string]: CustomInfoFull }>();

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

		const siteMap: { [siteId: string]: CustomInfoFull } = {};

		for (const [siteId, siteInfo] of Object.entries(sites)) {
			if (validateCustomInfo(siteInfo)) {
				siteMap[siteId] = siteInfo;
			}
		}

		if (Object.keys(siteMap).length > 0) {
			result.set(entryId, siteMap);
		}
	}

	return result;
}


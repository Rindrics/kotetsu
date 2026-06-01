import { parse } from 'yaml';
import type { CustomInfoFull, ParsedEntryInfo } from '../types';
import { extractTags, unescapeText } from '../extractTags';

/**
 * Check if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate readDate format (YYYY-MM-DD)
 */
function isValidReadDate(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}

	const match = value.match(/^\d{4}-\d{2}-\d{2}$/);
	if (!match) {
		return false;
	}

	const [, , month, day] = match.map((s) => parseInt(s, 10));

	// Validate month and day ranges
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return false;
	}

	// Validate with Date constructor for leap year and actual day validity
	const date = new Date(`${value}T00:00:00Z`);
	if (isNaN(date.getTime())) {
		return false;
	}

	return true;
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

	return validTags && validReview && validMemo;
}

/**
 * Extract and deduplicate tags from text fields
 */
function extractAndMergeTags(
	review: string | string[] | undefined,
	memo: string[] | undefined
): string[] {
	const allTags = new Set<string>();

	// Extract tags from review
	if (typeof review === 'string') {
		const { tags } = extractTags(review);
		tags.forEach((t) => allTags.add(t));
	} else if (Array.isArray(review)) {
		review.forEach((line) => {
			const { tags } = extractTags(line);
			tags.forEach((t) => allTags.add(t));
		});
	}

	// Extract tags from memo
	if (Array.isArray(memo)) {
		memo.forEach((line) => {
			const { tags } = extractTags(line);
			tags.forEach((t) => allTags.add(t));
		});
	}

	return Array.from(allTags);
}

/**
 * Unescape hashes in review and memo fields
 */
function unescapeCustomInfo(info: CustomInfoFull): CustomInfoFull {
	return {
		...info,
		review: Array.isArray(info.review)
			? info.review.map((r) => unescapeText(r))
			: info.review
				? unescapeText(info.review)
				: undefined,
		memo: info.memo?.map((m) => unescapeText(m))
	};
}

/**
 * Parse YAML content and return a map of entry ID to ParsedEntryInfo
 * Extracts readDate at entry level and per-site CustomInfoFull
 * Returns empty Map on invalid inputs or parse errors
 * @internal Returns full info including memo (internal-only field)
 */
export function parseCustomInfo(content: string): Map<string, ParsedEntryInfo> {
	const result = new Map<string, ParsedEntryInfo>();

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

	for (const [entryId, entryValue] of Object.entries(parsed)) {
		if (!isPlainObject(entryValue)) {
			continue;
		}

		const readDate = isValidReadDate(entryValue.readDate)
			? (entryValue.readDate as string)
			: undefined;
		const sites: { [siteId: string]: CustomInfoFull } = {};

		for (const [key, value] of Object.entries(entryValue)) {
			if (key === 'readDate') continue;
			if (validateCustomInfo(value)) {
				// Extract tags and unescape hashes
				const info = unescapeCustomInfo(value);
				const extractedTags = extractAndMergeTags(info.review, info.memo);
				sites[key] = {
					...info,
					extractedTags: extractedTags.length > 0 ? extractedTags : undefined
				};
			}
		}

		if (Object.keys(sites).length > 0 || readDate !== undefined) {
			result.set(entryId, { readDate, sites });
		}
	}

	return result;
}


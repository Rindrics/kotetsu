import { parse } from 'yaml';
import type { CustomInfo, CustomInfoYaml } from '../types';

/**
 * Default site ID for custom info lookup
 */
const DEFAULT_SITE_ID = 'akirahayashi_com';

/**
 * Parse YAML content and return a map of entry ID to CustomInfo
 */
export function parseCustomInfo(
	content: string,
	siteId: string = DEFAULT_SITE_ID
): Map<string, CustomInfo> {
	const parsed = parse(content) as CustomInfoYaml;
	const result = new Map<string, CustomInfo>();

	if (!parsed) return result;

	for (const [entryId, sites] of Object.entries(parsed)) {
		const siteInfo = sites[siteId];
		if (siteInfo) {
			result.set(entryId, {
				tags: siteInfo.tags,
				review: siteInfo.review
			});
		}
	}

	return result;
}


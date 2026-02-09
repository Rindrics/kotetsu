/**
 * BibTeX entry parsed from .bib file
 */
export interface BibEntry {
	id: string;
	type: string;
	title: string;
	author: string;
	year: number;
	publisher?: string;
	series?: string;
	isbn?: string;
	url?: string;
}

/**
 * Custom metadata from YAML file - INTERNAL representation (includes memo)
 * Used during parsing and data processing
 * @internal Never expose to frontend
 */
export interface CustomInfoFull {
	tags?: string[];
	review?: string | string[];
	memo?: string[];
	readDate?: string; // ISO 8601 format (YYYY-MM-DD)
}

/**
 * Custom metadata for frontend consumption (memo excluded)
 * Type-safe representation of what frontend can receive
 */
export interface CustomInfoFrontend {
	tags?: string[];
	review?: string | string[];
	readDate?: string; // ISO 8601 format (YYYY-MM-DD)
}

/**
 * Backward compatibility alias
 * @deprecated Use CustomInfoFull or CustomInfoFrontend instead
 */
export type CustomInfo = CustomInfoFrontend;

/**
 * Merged bibliography item combining BibTeX entry and custom info
 * Supports multiple sites via customInfo[siteId]
 */
export interface BibliographyItem extends BibEntry {
	customInfo?: {
		[siteId: string]: CustomInfoFrontend;
	};
}

/**
 * Raw YAML structure for custom_info.yaml
 */
export interface CustomInfoYaml {
	[entryId: string]: {
		[siteId: string]: CustomInfoFull;
	};
}


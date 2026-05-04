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
}

/**
 * Custom metadata for frontend consumption (memo excluded)
 * Type-safe representation of what frontend can receive
 */
export interface CustomInfoFrontend {
	tags?: string[];
	review?: string | string[];
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
	readDate?: string; // ISO 8601 format (YYYY-MM-DD)
	customInfo?: {
		[siteId: string]: CustomInfoFrontend;
	};
}

/**
 * Parsed entry info including readDate at entry level
 * @internal Used internally during YAML parsing
 */
export interface ParsedEntryInfo {
	readDate?: string;
	sites: { [siteId: string]: CustomInfoFull };
}


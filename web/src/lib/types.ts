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
 * Custom metadata from YAML file (blog-specific info)
 */
export interface CustomInfo {
	tags?: string[];
	review?: string;
	memo?: string;
}

/**
 * Merged bibliography item combining BibTeX entry and custom info
 */
export interface BibliographyItem extends BibEntry {
	customInfo?: CustomInfo;
}

/**
 * Raw YAML structure for custom_info.yaml
 */
export interface CustomInfoYaml {
	[entryId: string]: {
		[siteId: string]: {
			tags?: string[];
			review?: string;
			memo?: string;
		};
	};
}


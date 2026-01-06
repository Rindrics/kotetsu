import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBibTeX } from '$lib/parsers/bib';
import { parseCustomInfo } from '$lib/parsers/yaml';
import { mergeBibliography } from '$lib/merge';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Read files from project root (one level up from web/)
	const projectRoot = join(process.cwd(), '..');

	const bibContent = readFileSync(join(projectRoot, 'references.bib'), 'utf-8');
	const yamlContent = readFileSync(join(projectRoot, 'custom_info.yaml'), 'utf-8');

	const bibEntries = parseBibTeX(bibContent);
	const customInfo = parseCustomInfo(yamlContent);

	const items = mergeBibliography(bibEntries, customInfo);

	return {
		items
	};
};


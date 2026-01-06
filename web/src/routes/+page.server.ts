import { readFileSync } from 'fs';
import { join } from 'path';
import { parseBibTeX } from '$lib/parsers/bib';
import { parseCustomInfo } from '$lib/parsers/yaml';
import { mergeBibliography } from '$lib/merge';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Read files from contents directory (one level up from web/)
	const contentsDir = join(process.cwd(), '..', 'contents');

	const bibContent = readFileSync(join(contentsDir, 'references.bib'), 'utf-8');
	const yamlContent = readFileSync(join(contentsDir, 'custom_info.yaml'), 'utf-8');

	const bibEntries = parseBibTeX(bibContent);
	const customInfo = parseCustomInfo(yamlContent);

	const items = mergeBibliography(bibEntries, customInfo);

	return {
		items
	};
};


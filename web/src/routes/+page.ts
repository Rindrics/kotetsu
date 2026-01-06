import type { BibliographyItem } from '$lib/types';

export const prerender = true;

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
	try {
		const response = await fetch('/data/bibliography.json');

		if (!response.ok) {
			console.error(`Failed to fetch bibliography: HTTP ${response.status}`);
			return { items: [] as BibliographyItem[] };
		}

		const items: BibliographyItem[] = await response.json();
		return { items };
	} catch (error) {
		console.error('Failed to load bibliography:', error);
		return { items: [] as BibliographyItem[] };
	}
}


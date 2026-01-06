import type { BibliographyItem } from '$lib/types';

export const prerender = true;

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
	const response = await fetch('/data/bibliography.json');
	const items: BibliographyItem[] = await response.json();

	return {
		items
	};
}


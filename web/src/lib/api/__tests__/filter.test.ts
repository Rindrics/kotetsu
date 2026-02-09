import { describe, it, expect } from 'vitest';
import { filterBySiteId } from '../filter';
import type { BibliographyItem } from '../../types';

const mockBibliographyData: BibliographyItem[] = [
	{
		id: 'entry1',
		type: 'book',
		title: 'Test Book 1',
		author: 'Author A',
		year: 2020,
		customInfo: {
			foobar_com: {
				tags: ['test', 'documentation'],
				review: 'A great book',
				readDate: '2020-01-01'
			}
		}
	},
	{
		id: 'entry2',
		type: 'book',
		title: 'Test Book 2',
		author: 'Author B',
		year: 2021,
		customInfo: {
			foobar_com: {
				tags: ['advanced'],
				review: ['Multi-line', 'review'],
				readDate: '2021-06-15'
			},
			other_site: {
				tags: ['shared'],
				review: 'Another perspective'
			}
		}
	},
	{
		id: 'entry3',
		type: 'article',
		title: 'Test Article',
		author: 'Author C',
		year: 2022
		// No customInfo for any site
	}
];

describe('filterBySiteId', () => {
	it('should filter entries by siteId', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'foobar_com');

		// Should return 2 entries (entry1 and entry2 have customInfo for foobar_com)
		expect(filtered).toHaveLength(2);
		expect(filtered[0].id).toBe('entry1');
		expect(filtered[1].id).toBe('entry2');
	});

	it('should exclude entries without customInfo for the siteId', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'foobar_com');

		// entry3 should not be included (no customInfo)
		const entry3 = filtered.find((e) => e.id === 'entry3');
		expect(entry3).toBeUndefined();
	});

	it('should handle different siteId', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'other_site');

		// Should return only entry2
		expect(filtered).toHaveLength(1);
		expect(filtered[0].id).toBe('entry2');
	});

	it('should return empty array for non-existent siteId', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'unknown_site');

		expect(filtered).toHaveLength(0);
	});

	it('should preserve all entry fields', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'foobar_com');

		const entry = filtered[0];
		expect(entry).toHaveProperty('id');
		expect(entry).toHaveProperty('type');
		expect(entry).toHaveProperty('title');
		expect(entry).toHaveProperty('author');
		expect(entry).toHaveProperty('year');
		expect(entry).toHaveProperty('customInfo');
	});

	it('should preserve site-specific customInfo', () => {
		const filtered = filterBySiteId(mockBibliographyData, 'foobar_com');

		const entry = filtered.find((e) => e.id === 'entry2');
		expect(entry?.customInfo).toBeDefined();
		expect(entry?.customInfo).toHaveProperty('foobar_com');
		expect(entry?.customInfo?.foobar_com).toHaveProperty('tags');
		expect(entry?.customInfo?.foobar_com).toHaveProperty('review');
	});
});

describe('siteId format validation', () => {
	it('should validate siteId format (alphanumeric, underscore, dot only)', () => {
		const validFormats = ['site', 'site_name', 'site.com', 'site_com_2024', 'site.sub_domain'];
		const invalidFormats = ['site@invalid', 'site-name', 'site name', 'site!', 'site#'];

		const regex = /^[a-zA-Z0-9_.]+$/;

		for (const format of validFormats) {
			expect(regex.test(format)).toBe(true);
		}

		for (const format of invalidFormats) {
			expect(regex.test(format)).toBe(false);
		}
	});
});

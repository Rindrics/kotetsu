import { describe, it, expect } from 'vitest';
import { GET } from './+server';

// Mock bibliographyData
const mockBibliographyData = [
	{
		id: 'entry1',
		type: 'book',
		title: 'Test Book 1',
		author: 'Author A',
		year: 2020,
		customInfo: {
			akirahayashi_com: {
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
			akirahayashi_com: {
				tags: ['advanced'],
				review: ['Multi-line', 'review'],
				readDate: '2021-06-15',
				memo: ['Internal note - should not be exposed']
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

describe('GET /api/bibliography', () => {
	it('should return 400 when siteId is missing', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data).toHaveProperty('error');
		expect(data.error).toContain('siteId');
	});

	it('should return 400 when siteId format is invalid', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=invalid@site');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data).toHaveProperty('error');
		expect(data.error).toContain('Invalid');
	});

	it('should return 404 when siteId has no entries', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=unknown_site');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(404);
		const data = await response.json();
		expect(data).toHaveProperty('error');
		expect(data.error).toContain('not found');
	});

	it('should return filtered entries for valid siteId', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=akirahayashi_com');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		const data = await response.json();

		// Should return 2 entries (entry1 and entry2 have customInfo for akirahayashi_com)
		expect(Array.isArray(data)).toBe(true);
		expect(data).toHaveLength(2);

		// Check entry structure
		expect(data[0]).toHaveProperty('id');
		expect(data[0]).toHaveProperty('title');
		expect(data[0]).toHaveProperty('customInfo');
	});

	it('should not expose memo field in response', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=akirahayashi_com');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		const data = await response.json();

		// Find entry2 in response
		const entry2 = data.find((e: any) => e.id === 'entry2');
		expect(entry2).toBeDefined();

		// Ensure memo is not present in customInfo
		expect(entry2.customInfo).not.toHaveProperty('memo');
		expect(entry2.customInfo).toHaveProperty('review');
		expect(entry2.customInfo).toHaveProperty('tags');
	});

	it('should include ETag header in response', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=akirahayashi_com');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		expect(response.headers.has('ETag')).toBe(true);
		const etag = response.headers.get('ETag');
		expect(etag).toMatch(/^".+"$/); // Should be quoted string
	});

	it('should include proper Cache-Control headers', async () => {
		const mockUrl = new URL('http://localhost/api/bibliography?siteId=akirahayashi_com');
		const response = await GET({
			url: mockUrl
		} as Parameters<typeof GET>[0]);

		const cacheControl = response.headers.get('Cache-Control');
		expect(cacheControl).toContain('public');
		expect(cacheControl).toContain('max-age=3600');
		expect(cacheControl).toContain('stale-while-revalidate=86400');
	});

	it('should accept valid siteId formats', async () => {
		const validFormats = ['site', 'site_name', 'site.com', 'site_com_2024', 'site.sub_domain'];

		for (const siteId of validFormats) {
			const mockUrl = new URL(`http://localhost/api/bibliography?siteId=${siteId}`);
			const response = await GET({
				url: mockUrl
			} as Parameters<typeof GET>[0]);

			// Should not return 400 for format validation
			expect(response.status).not.toBe(400);
		}
	});

	it('should reject invalid siteId formats', async () => {
		const invalidFormats = ['site@invalid', 'site-name', 'site name', 'site!'];

		for (const siteId of invalidFormats) {
			const mockUrl = new URL(`http://localhost/api/bibliography?siteId=${siteId}`);
			const response = await GET({
				url: mockUrl
			} as Parameters<typeof GET>[0]);

			expect(response.status).toBe(400);
		}
	});
});

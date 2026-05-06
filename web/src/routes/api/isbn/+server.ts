import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const isbn = url.searchParams.get('isbn');

	if (!isbn || typeof isbn !== 'string') {
		return error(400, 'isbn required');
	}

	// Get API configuration from environment
	const apiUrl = process.env.ISBN_SEARCH_API_URL || '';
	const token = process.env.LAMBDA_JWT_TOKEN || '';

	if (!apiUrl || !token) {
		console.warn('ISBN API not configured');
		return error(503, 'ISBN search unavailable');
	}

	try {
		const response = await fetch(`${apiUrl}isbn-search`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`,
			},
			body: JSON.stringify({ isbn }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`ISBN API error: ${response.status} ${errorText}`);
			return error(response.status, 'ISBN search failed');
		}

		const data = await response.json();
		return new Response(JSON.stringify(data), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('ISBN search error:', err);
		return error(500, 'ISBN search failed');
	}
};

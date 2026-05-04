import { describe, it, expect } from 'vitest';
import { isAllowedSender, handleEmailMessage } from '../email-parser';

describe('isAllowedSender', () => {
	it('should allow matching sender', () => {
		const allowed = 'akira.hayashi.1987@gmail.com,rindrics@gmail.com';
		expect(isAllowedSender('akira.hayashi.1987@gmail.com', allowed)).toBe(true);
		expect(isAllowedSender('rindrics@gmail.com', allowed)).toBe(true);
	});

	it('should reject non-matching sender', () => {
		const allowed = 'akira.hayashi.1987@gmail.com,rindrics@gmail.com';
		expect(isAllowedSender('attacker@example.com', allowed)).toBe(false);
	});

	it('should handle whitespace in allowed list', () => {
		const allowed = ' akira.hayashi.1987@gmail.com , rindrics@gmail.com ';
		expect(isAllowedSender('akira.hayashi.1987@gmail.com', allowed)).toBe(true);
	});

	it('should handle empty allowed list', () => {
		const allowed = '';
		expect(isAllowedSender('akira.hayashi.1987@gmail.com', allowed)).toBe(false);
	});
});

describe('handleEmailMessage', () => {
	const mockMessage = {
		mail: {
			source: 'akira.hayashi.1987@gmail.com',
			messageId: 'test-message-id',
			timestamp: new Date().toISOString()
		},
		content: '9784103396512\n2026-05-04'
	};

	const allowedAddresses = 'akira.hayashi.1987@gmail.com,rindrics@gmail.com';
	const mockGithubToken = 'ghp_test_token';

	it('should reject unauthorized sender', async () => {
		const unauthorizedMessage = {
			...mockMessage,
			mail: {
				...mockMessage.mail,
				source: 'attacker@example.com'
			}
		};

		const result = await handleEmailMessage(unauthorizedMessage, allowedAddresses, mockGithubToken);
		expect(result.success).toBe(false);
		expect(result.message).toContain('not in allowed list');
	});

	it('should reject invalid email format', async () => {
		const invalidMessage = {
			...mockMessage,
			content: 'invalid email body'
		};

		const result = await handleEmailMessage(invalidMessage, allowedAddresses, mockGithubToken);
		expect(result.success).toBe(false);
		expect(result.message).toContain('Invalid email format');
	});

	it('should parse valid email and attempt GitHub dispatch', async () => {
		// Mock fetch for GitHub API
		const originalFetch = global.fetch;
		let fetchCalled = false;

		global.fetch = async (url, options) => {
			fetchCalled = true;
			if (typeof url === 'string' && url.includes('github.com/repos/Rindrics/kotetsu/dispatches')) {
				// GitHub returns 204 No Content on successful dispatch
				return new Response(null, { status: 204 });
			}
			return new Response(JSON.stringify({}), { status: 500 });
		};

		const result = await handleEmailMessage(mockMessage, allowedAddresses, mockGithubToken);

		global.fetch = originalFetch;

		expect(fetchCalled).toBe(true);
		expect(result.success).toBe(true);
		expect(result.message).toContain('9784103396512');
	});

	it('should handle GitHub API failure gracefully', async () => {
		const originalFetch = global.fetch;

		global.fetch = async () => {
			return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
		};

		const result = await handleEmailMessage(mockMessage, allowedAddresses, mockGithubToken);

		global.fetch = originalFetch;

		expect(result.success).toBe(false);
		expect(result.message).toContain('Failed to trigger GitHub workflow');
	});
});

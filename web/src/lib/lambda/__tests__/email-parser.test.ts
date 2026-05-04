import { describe, it, expect } from 'vitest';
import { isAllowedSender, handleEmailMessage, verifyEmailAuthentication } from '../email-parser';

describe('isAllowedSender', () => {
	it('should allow matching sender', () => {
		const allowed = 'alice@example.com,bob@example.com';
		expect(isAllowedSender('alice@example.com', allowed)).toBe(true);
		expect(isAllowedSender('bob@example.com', allowed)).toBe(true);
	});

	it('should reject non-matching sender', () => {
		const allowed = 'alice@example.com,bob@example.com';
		expect(isAllowedSender('attacker@example.com', allowed)).toBe(false);
	});

	it('should handle whitespace in allowed list', () => {
		const allowed = ' alice@example.com , bob@example.com ';
		expect(isAllowedSender('alice@example.com', allowed)).toBe(true);
	});

	it('should handle empty allowed list', () => {
		const allowed = '';
		expect(isAllowedSender('alice@example.com', allowed)).toBe(false);
	});
});

describe('verifyEmailAuthentication', () => {
	it('should accept email with all authentication passed', () => {
		const message = {
			mail: {
				source: 'test@example.com',
				messageId: 'id',
				timestamp: new Date().toISOString(),
				authentication: {
					spf: ['Pass'],
					dkim: ['Pass'],
					dmarc: ['Pass']
				}
			},
			content: ''
		};

		const result = verifyEmailAuthentication(message);
		expect(result.valid).toBe(true);
	});

	it('should reject email with SPF failure', () => {
		const message = {
			mail: {
				source: 'test@example.com',
				messageId: 'id',
				timestamp: new Date().toISOString(),
				authentication: {
					spf: ['Fail'],
					dkim: ['Pass'],
					dmarc: ['Pass']
				}
			},
			content: ''
		};

		const result = verifyEmailAuthentication(message);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('SPF');
	});

	it('should reject email with DKIM failure', () => {
		const message = {
			mail: {
				source: 'test@example.com',
				messageId: 'id',
				timestamp: new Date().toISOString(),
				authentication: {
					spf: ['Pass'],
					dkim: ['Fail'],
					dmarc: ['Pass']
				}
			},
			content: ''
		};

		const result = verifyEmailAuthentication(message);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('DKIM');
	});

	it('should reject email with DMARC failure', () => {
		const message = {
			mail: {
				source: 'test@example.com',
				messageId: 'id',
				timestamp: new Date().toISOString(),
				authentication: {
					spf: ['Pass'],
					dkim: ['Pass'],
					dmarc: ['Fail']
				}
			},
			content: ''
		};

		const result = verifyEmailAuthentication(message);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('DMARC');
	});

	it('should reject email with missing authentication data', () => {
		const message = {
			mail: {
				source: 'test@example.com',
				messageId: 'id',
				timestamp: new Date().toISOString()
			},
			content: ''
		};

		const result = verifyEmailAuthentication(message);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain('No authentication data');
	});
});

describe('handleEmailMessage', () => {
	const mockMessage = {
		mail: {
			source: 'alice@example.com',
			messageId: 'test-message-id',
			timestamp: new Date().toISOString(),
			authentication: {
				spf: ['Pass'],
				dkim: ['Pass'],
				dmarc: ['Pass']
			}
		},
		content: '9784103396512\n2026-05-04'
	};

	const allowedAddresses = 'alice@example.com,bob@example.com';
	const mockGithubToken = 'ghp_test_token';

	it('should reject email with failed authentication', async () => {
		const unauthenticatedMessage = {
			...mockMessage,
			mail: {
				...mockMessage.mail,
				authentication: {
					spf: ['Fail'],
					dkim: ['Pass'],
					dmarc: ['Pass']
				}
			}
		};

		const result = await handleEmailMessage(unauthenticatedMessage, allowedAddresses, mockGithubToken);
		expect(result.success).toBe(false);
		expect(result.message).toContain('Authentication failed');
	});

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

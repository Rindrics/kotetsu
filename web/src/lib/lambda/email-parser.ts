/**
 * Parse email body from SES message and trigger GitHub Actions
 */

import { parseEmailBody } from '../parsers/email';

export interface SESMessage {
	mail: {
		source: string;
		messageId: string;
		timestamp: string;
		authentication?: {
			spf?: string[];
			dkim?: string[];
			dmarc?: string[];
		};
	};
	content: string;
}

/**
 * Verify if email sender is in allowed list
 */
export function isAllowedSender(sender: string, allowedAddresses: string): boolean {
	const allowed = allowedAddresses
		.split(',')
		.map((addr) => addr.trim())
		.filter((addr) => addr.length > 0);

	return allowed.includes(sender);
}

/**
 * Verify SPF, DKIM, and DMARC authentication
 * All three must pass for the email to be accepted
 */
export function verifyEmailAuthentication(sesMessage: SESMessage): { valid: boolean; reason?: string } {
	const auth = sesMessage.mail.authentication;

	// Check if authentication data is present
	if (!auth) {
		return {
			valid: false,
			reason: 'No authentication data found in SES message'
		};
	}

	// Check SPF
	if (!auth.spf || auth.spf.length === 0) {
		return {
			valid: false,
			reason: 'SPF check not performed or missing'
		};
	}
	if (auth.spf[0] !== 'Pass') {
		return {
			valid: false,
			reason: `SPF check failed: ${auth.spf[0]}`
		};
	}

	// Check DKIM
	if (!auth.dkim || auth.dkim.length === 0) {
		return {
			valid: false,
			reason: 'DKIM check not performed or missing'
		};
	}
	if (auth.dkim[0] !== 'Pass') {
		return {
			valid: false,
			reason: `DKIM check failed: ${auth.dkim[0]}`
		};
	}

	// Check DMARC
	if (!auth.dmarc || auth.dmarc.length === 0) {
		return {
			valid: false,
			reason: 'DMARC check not performed or missing'
		};
	}
	if (auth.dmarc[0] !== 'Pass') {
		return {
			valid: false,
			reason: `DMARC check failed: ${auth.dmarc[0]}`
		};
	}

	return {
		valid: true
	};
}

/**
 * Trigger GitHub Actions via repository_dispatch
 */
export async function triggerGitHubDispatch(
	isbn: string,
	readDate: string,
	githubToken: string
): Promise<boolean> {
	const dispatchPayload = {
		event_type: 'add-entry',
		client_payload: {
			isbn,
			readDate
		}
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch('https://api.github.com/repos/Rindrics/kotetsu/dispatches', {
			method: 'POST',
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'Authorization': `token ${githubToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(dispatchPayload),
			signal: controller.signal
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error('GitHub API error:', response.status, errorBody);
			return false;
		}

		console.log(`Successfully triggered GitHub workflow for ISBN ${isbn}`);
		return true;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			console.error('GitHub dispatch request timeout');
			return false;
		}
		console.error('Failed to trigger GitHub dispatch:', error);
		return false;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Mask PII sender email for logging
 */
function maskSenderEmail(sender: string): string {
	const parts = sender.split('@');
	if (parts.length !== 2) return '***';
	return `***@${parts[1]}`;
}

/**
 * Main handler: parse email, validate sender, trigger workflow
 */
export async function handleEmailMessage(
	sesMessage: SESMessage,
	allowedAddresses: string,
	githubToken: string
): Promise<{ success: boolean; message: string }> {
	const sender = sesMessage.mail.source;
	const emailBody = sesMessage.content;
	const messageId = sesMessage.mail.messageId;
	const maskedSender = maskSenderEmail(sender);

	console.log(`Processing email from ${maskedSender} (Message ID: ${messageId})`);

	// 1. Verify SPF/DKIM/DMARC authentication
	const authCheck = verifyEmailAuthentication(sesMessage);
	if (!authCheck.valid) {
		console.warn(`Email from ${maskedSender} rejected: authentication failed - ${authCheck.reason}`);
		return {
			success: false,
			message: `Authentication failed: ${authCheck.reason}`
		};
	}

	console.log(`Email authentication passed (SPF, DKIM, DMARC)`);

	// 2. Check sender whitelist
	if (!isAllowedSender(sender, allowedAddresses)) {
		console.warn(`Email from ${maskedSender} rejected: not in allowed sender list`);
		return {
			success: false,
			message: `Sender is not in allowed list`
		};
	}

	console.log(`Sender ${maskedSender} is allowed`);

	// 3. Parse email
	const parsed = parseEmailBody(emailBody);
	if (!parsed) {
		console.warn(`Failed to parse email body from ${maskedSender}`);
		return {
			success: false,
			message: 'Invalid email format. Expected: ISBN on line 1, date (yyyy-mm-dd or yyyy/mm/dd) on line 2'
		};
	}

	console.log(`Parsed email: ISBN=${parsed.isbn}, ReadDate=${parsed.readDate}`);

	// 4. Trigger GitHub workflow
	const dispatchSuccess = await triggerGitHubDispatch(parsed.isbn, parsed.readDate, githubToken);
	if (!dispatchSuccess) {
		return {
			success: false,
			message: 'Failed to trigger GitHub workflow'
		};
	}

	return {
		success: true,
		message: `Entry addition workflow triggered for ISBN ${parsed.isbn}`
	};
}

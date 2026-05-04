/**
 * Parse email body from SES message and trigger GitHub Actions
 */

import { parseEmailBody } from '../parsers/email';

export interface SESMessage {
	mail: {
		source: string;
		messageId: string;
		timestamp: string;
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

	try {
		const response = await fetch('https://api.github.com/repos/Rindrics/kotetsu/dispatches', {
			method: 'POST',
			headers: {
				'Accept': 'application/vnd.github.v3+json',
				'Authorization': `token ${githubToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(dispatchPayload)
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error('GitHub API error:', response.status, errorBody);
			return false;
		}

		console.log(`Successfully triggered GitHub workflow for ISBN ${isbn}`);
		return true;
	} catch (error) {
		console.error('Failed to trigger GitHub dispatch:', error);
		return false;
	}
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

	console.log(`Processing email from ${sender} (Message ID: ${messageId})`);

	// 1. Check sender
	if (!isAllowedSender(sender, allowedAddresses)) {
		console.warn(`Email from ${sender} rejected: not in allowed sender list`);
		return {
			success: false,
			message: `Sender ${sender} is not in allowed list`
		};
	}

	console.log(`Sender ${sender} is allowed`);

	// 2. Parse email
	const parsed = parseEmailBody(emailBody);
	if (!parsed) {
		console.warn(`Failed to parse email body from ${sender}`);
		return {
			success: false,
			message: 'Invalid email format. Expected: ISBN on line 1, date (yyyy-mm-dd or yyyy/mm/dd) on line 2'
		};
	}

	console.log(`Parsed email: ISBN=${parsed.isbn}, ReadDate=${parsed.readDate}`);

	// 3. Trigger GitHub workflow
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

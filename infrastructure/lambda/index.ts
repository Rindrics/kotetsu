/**
 * Lambda handler for SES email processing via SNS
 *
 * Receives SNS notification from SES, extracts email content,
 * validates sender, parses ISBN + date, triggers GitHub Actions
 */

import { SNSEvent, SNSHandler } from 'aws-lambda';
import { handleEmailMessage, SESMessage } from './email-parser';

const ALLOWED_ADDRESSES = process.env.ALLOWED_EMAIL_ADDRESSES || '';
const GITHUB_TOKEN = process.env.REPOSITORY_DISPATCH_TOKEN || '';

/**
 * Parse SNS message containing SES receipt notification
 * Extracts mail metadata, content, and email authentication verdicts
 */
function parseSNSMessage(snsMessage: string): SESMessage | null {
	try {
		// SNS message contains SES receipt data
		const parsed = JSON.parse(snsMessage);

		// Extract mail metadata and content
		if (parsed.mail && parsed.mail.source) {
			const authentication = {
				spf: undefined as string[] | undefined,
				dkim: undefined as string[] | undefined,
				dmarc: undefined as string[] | undefined
			};

			// Extract and normalize authentication verdicts from SES receipt
			if (parsed.receipt) {
				const receipt = parsed.receipt;

				// Convert AWS uppercase statuses (e.g., "PASS", "FAIL") to title case
				if (receipt.spfVerdict?.status) {
					authentication.spf = [toTitleCase(receipt.spfVerdict.status)];
				}
				if (receipt.dkimVerdict?.status) {
					authentication.dkim = [toTitleCase(receipt.dkimVerdict.status)];
				}
				if (receipt.dmarcVerdict?.status) {
					authentication.dmarc = [toTitleCase(receipt.dmarcVerdict.status)];
				}
			}

			return {
				mail: {
					source: parsed.mail.source,
					messageId: parsed.mail.messageId || 'unknown',
					timestamp: parsed.mail.timestamp || new Date().toISOString(),
					authentication: Object.values(authentication).some((v) => v)
						? (authentication as unknown as NonNullable<SESMessage['mail']['authentication']>)
						: undefined
				},
				content: parsed.content || ''
			};
		}

		console.warn('SNS message does not contain expected SES structure:', snsMessage);
		return null;
	} catch (error) {
		console.error('Failed to parse SNS message:', error);
		return null;
	}
}

/**
 * Convert string to title case (first letter uppercase, rest lowercase)
 */
function toTitleCase(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Main Lambda handler
 */
export const handler: SNSHandler = async (event: SNSEvent): Promise<void> => {
	console.log('Received SNS event:', JSON.stringify(event, null, 2));

	const results = [];

	for (const record of event.Records) {
		const snsMessage = record.Sns.Message;
		console.log('Processing SNS message:', snsMessage);

		// Parse SNS message to extract SES data
		const sesMessage = parseSNSMessage(snsMessage);
		if (!sesMessage) {
			console.error('Failed to parse SES message from SNS');
			results.push({
				statusCode: 400,
				body: 'Failed to parse email message'
			});
			continue;
		}

		// Validate environment variables
		if (!ALLOWED_ADDRESSES) {
			console.error('ALLOWED_EMAIL_ADDRESSES environment variable not set');
			results.push({
				statusCode: 500,
				body: 'Server configuration error'
			});
			continue;
		}

		if (!GITHUB_TOKEN) {
			console.error('REPOSITORY_DISPATCH_TOKEN environment variable not set');
			results.push({
				statusCode: 500,
				body: 'Server configuration error'
			});
			continue;
		}

		// Process email
		console.log(`Email content length: ${sesMessage.content.length}, first 200 chars: ${sesMessage.content.substring(0, 200)}`);
		const result = await handleEmailMessage(sesMessage, ALLOWED_ADDRESSES, GITHUB_TOKEN);

		results.push({
			statusCode: result.success ? 200 : 400,
			body: result.message
		});
	}

	// Log results
	console.log('Processing completed:', JSON.stringify(results, null, 2));
};

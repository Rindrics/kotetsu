/**
 * Lambda handler for SES email processing via SNS
 *
 * Receives SNS notification from SES, extracts email content,
 * validates sender, parses ISBN + date, triggers GitHub Actions
 */

import { SNSEvent, SNSHandler } from 'aws-lambda';
import { handleEmailMessage, SESMessage } from './email-parser';

const ALLOWED_ADDRESSES = process.env.ALLOWED_EMAIL_ADDRESSES || '';
const GITHUB_TOKEN = process.env.GITHUB_DISPATCH_TOKEN || '';

/**
 * Parse SNS message containing SES receipt notification
 * SNS message body contains the raw email or SES receipt metadata
 */
function parseSNSMessage(snsMessage: string): SESMessage | null {
	try {
		// SNS message contains SES receipt data
		const parsed = JSON.parse(snsMessage);

		// Extract mail metadata and content
		if (parsed.mail && parsed.mail.source) {
			return {
				mail: {
					source: parsed.mail.source,
					messageId: parsed.mail.messageId || 'unknown',
					timestamp: parsed.mail.timestamp || new Date().toISOString()
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
			console.error('GITHUB_DISPATCH_TOKEN environment variable not set');
			results.push({
				statusCode: 500,
				body: 'Server configuration error'
			});
			continue;
		}

		// Process email
		const result = await handleEmailMessage(sesMessage, ALLOWED_ADDRESSES, GITHUB_TOKEN);

		results.push({
			statusCode: result.success ? 200 : 400,
			body: result.message
		});
	}

	// Log results
	console.log('Processing completed:', JSON.stringify(results, null, 2));
};

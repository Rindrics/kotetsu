/**
 * Parse email body from SES message and trigger GitHub Actions
 */

interface ParsedEmail {
	isbn: string;
	readDate: string;
}

/**
 * Validate ISBN-10 format (10 digits, last can be X)
 * Also validates the check digit
 */
function isValidISBN10(isbn: string): boolean {
	const pattern = /^\d{9}[\dX]$/;
	if (!pattern.test(isbn)) {
		return false;
	}

	// Validate check digit
	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += parseInt(isbn[i], 10) * (10 - i);
	}

	const checkDigit = isbn[9];
	const expectedCheck = (11 - (sum % 11)) % 11;
	const expectedCheckStr = expectedCheck === 10 ? 'X' : expectedCheck.toString();

	return checkDigit === expectedCheckStr;
}

/**
 * Validate ISBN-13 format and check digit
 * Starts with 978 or 979, 13 digits total
 * Check digit validation: weighted sum with alternating weights 1 and 3
 */
function isValidISBN13(isbn: string): boolean {
	const pattern = /^97[89]\d{10}$/;
	if (!pattern.test(isbn)) {
		return false;
	}

	// Validate check digit
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		const weight = i % 2 === 0 ? 1 : 3;
		sum += parseInt(isbn[i], 10) * weight;
	}

	const checkDigit = parseInt(isbn[12], 10);
	const expectedCheck = (10 - (sum % 10)) % 10;

	return checkDigit === expectedCheck;
}

/**
 * Strip hyphens and spaces from ISBN
 */
function normalizeISBN(raw: string): string {
	return raw.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Validate and normalize read date
 * Accepts: yyyy-mm-dd or yyyy/mm/dd (but not mixed)
 * Returns: yyyy-mm-dd or null if invalid
 */
function normalizeDateISO8601(raw: string): string | null {
	const trimmed = raw.trim();

	// Accept yyyy-mm-dd or yyyy/mm/dd (same separator throughout)
	const match = trimmed.match(/^(\d{4})([/-])(\d{2})\2(\d{2})$/);
	if (!match) {
		return null;
	}

	const [, year, , month, day] = match;
	const dateStr = `${year}-${month}-${day}`;

	// Ensure month and day are in valid ranges
	const monthNum = parseInt(month, 10);
	const dayNum = parseInt(day, 10);
	if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
		return null;
	}

	// Validate with Date constructor for leap year and actual day validity
	const date = new Date(`${dateStr}T00:00:00Z`);
	if (isNaN(date.getTime())) {
		return null;
	}

	// Extra check: ensure the date components round-trip correctly
	// This catches invalid dates like 2023-02-29
	const returnedDate = new Date(dateStr);
	if (
		returnedDate.getUTCFullYear() !== parseInt(year, 10) ||
		returnedDate.getUTCMonth() + 1 !== monthNum ||
		returnedDate.getUTCDate() !== dayNum
	) {
		return null;
	}

	return dateStr;
}

/**
 * Extract plain text body from MIME email message
 * Searches for the last occurrence of \n\n (actual body separator)
 * since SES messages have multiple header sections
 */
function extractPlainTextBody(fullMessage: string): string {
	console.log('[MIME] Starting extraction, message length:', fullMessage.length);

	// Normalize line endings to just \n for easier parsing
	const normalized = fullMessage.replace(/\r\n/g, '\n');
	console.log('[MIME] After normalization, length:', normalized.length);

	// Find the MAIN email headers by looking for last newline before multipart boundary
	// Email structure: Return-Path + headers + blank line + MIME parts
	// Look for the boundary declaration first
	const boundaryMatch = normalized.match(/boundary\s*=\s*"?([^";\n]+)"?/i);
	if (!boundaryMatch) {
		console.log('[MIME] No boundary found, not multipart');
		return fullMessage;
	}

	const boundary = boundaryMatch[1].trim();
	console.log('[MIME] Found boundary:', boundary);

	// Find where the actual MIME parts start (first --boundary)
	const boundaryStart = normalized.indexOf(`\n--${boundary}`);
	if (boundaryStart === -1) {
		console.log('[MIME] Boundary marker not found in message');
		return fullMessage;
	}

	console.log('[MIME] Boundary marker found at position:', boundaryStart);

	// Everything after the boundary marker start is the MIME body
	const mimeBody = normalized.substring(boundaryStart + 1);
	console.log('[MIME] MIME body length:', mimeBody.length, 'first 200 chars:', mimeBody.substring(0, 200));

	// Split by boundary markers
	const parts = mimeBody.split(`--${boundary}`);
	console.log('[MIME] Found', parts.length, 'MIME parts');

	// Find the part with text/plain content
	for (let partIdx = 0; partIdx < parts.length; partIdx++) {
		const part = parts[partIdx];
		console.log(`[MIME] Processing part ${partIdx}, length: ${part.length}, first 100 chars:`, part.substring(0, 100));

		const lines = part.split('\n');

		// Look for Content-Type: text/plain header in this part
		let isPlainText = false;
		let contentStartIndex = -1;

		for (let i = 0; i < Math.min(lines.length, 10); i++) {
			const line = lines[i];
			console.log(`[MIME] Part ${partIdx} line ${i}:`, line.substring(0, 80));

			if (line.match(/Content-Type:\s*text\/plain/i)) {
				console.log(`[MIME] Found text/plain at part ${partIdx} line ${i}`);
				isPlainText = true;
			}

			// Content starts after the blank line following headers
			if (isPlainText && line.trim() === '') {
				contentStartIndex = i + 1;
				console.log(`[MIME] Content starts at line ${contentStartIndex}`);
				break;
			}
		}

		if (isPlainText && contentStartIndex >= 0) {
			// Extract content lines
			const contentLines = lines.slice(contentStartIndex);
			const content = contentLines.join('\n').trim();
			console.log('[MIME] Extracted content:', content.substring(0, 150));
			return content;
		}
	}

	// Fallback: return original message as-is
	console.log('[MIME] No text/plain part found, returning original message');
	return fullMessage;
}

/**
 * Parse email body to extract ISBN and read date
 * Returns parsed data or null if invalid
 */
function parseEmailBody(text: string): ParsedEmail | null {
	// Extract plain text body if this is a MIME message
	const plainTextBody = extractPlainTextBody(text);

	const lines = plainTextBody
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length < 2) {
		return null;
	}

	const rawISBN = lines[0];
	const rawDate = lines[1];

	// Normalize ISBN
	const isbn = normalizeISBN(rawISBN);
	if (!isValidISBN10(isbn) && !isValidISBN13(isbn)) {
		return null;
	}

	// Normalize date
	const readDate = normalizeDateISO8601(rawDate);
	if (!readDate) {
		return null;
	}

	return { isbn, readDate };
}

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

	if (!auth) {
		return {
			valid: false,
			reason: 'No authentication data found in SES message'
		};
	}

	if (!auth.spf || auth.spf.length === 0 || auth.spf[0] !== 'Pass') {
		return {
			valid: false,
			reason: `SPF check failed: ${auth.spf?.[0] || 'missing'}`
		};
	}

	if (!auth.dkim || auth.dkim.length === 0 || auth.dkim[0] !== 'Pass') {
		return {
			valid: false,
			reason: `DKIM check failed: ${auth.dkim?.[0] || 'missing'}`
		};
	}

	if (!auth.dmarc || auth.dmarc.length === 0 || auth.dmarc[0] !== 'Pass') {
		return {
			valid: false,
			reason: `DMARC check failed: ${auth.dmarc?.[0] || 'missing'}`
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

	// 1. Verify SPF/DKIM/DMARC authentication
	const authCheck = verifyEmailAuthentication(sesMessage);
	if (!authCheck.valid) {
		console.warn(`Email from ${sender} rejected: authentication failed - ${authCheck.reason}`);
		return {
			success: false,
			message: `Authentication failed: ${authCheck.reason}`
		};
	}

	console.log(`Email authentication passed (SPF, DKIM, DMARC)`);

	// 2. Check sender whitelist
	if (!isAllowedSender(sender, allowedAddresses)) {
		console.warn(`Email from ${sender} rejected: not in allowed sender list`);
		return {
			success: false,
			message: `Sender ${sender} is not in allowed list`
		};
	}

	console.log(`Sender ${sender} is allowed`);

	// 3. Parse email
	const parsed = parseEmailBody(emailBody);
	if (!parsed) {
		console.warn(`Failed to parse email body from ${sender}`);
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

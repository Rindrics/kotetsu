/**
 * Parse email body containing ISBN and read date
 * Expected format: plain text, two lines
 * Line 1: ISBN-10 or ISBN-13 (may include hyphens)
 * Line 2: Read date in yyyy-mm-dd or yyyy/mm/dd format
 */

export interface ParsedEmail {
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
 * Parse email body to extract ISBN and read date
 * Returns parsed data or null if invalid
 */
export function parseEmailBody(text: string): ParsedEmail | null {
	const lines = text
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

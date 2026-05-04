import { describe, it, expect } from 'vitest';
import { parseEmailBody } from '../email';

describe('parseEmailBody', () => {
	describe('valid ISBN-13 + date', () => {
		it('should parse ISBN-13 with yyyy-mm-dd format', () => {
			const result = parseEmailBody('9784103396512\n2026-05-04');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});

		it('should parse ISBN-13 with yyyy/mm/dd format', () => {
			const result = parseEmailBody('9784103396512\n2026/05/04');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});

		it('should parse ISBN-13 with hyphens', () => {
			const result = parseEmailBody('978-4-10-339651-2\n2026-05-04');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});

		it('should handle whitespace around lines', () => {
			const result = parseEmailBody('  9784103396512  \n  2026/05/04  ');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});
	});

	describe('valid ISBN-10 + date', () => {
		it('should parse ISBN-10 with digits', () => {
			const result = parseEmailBody('0451526538\n2026-05-04');
			expect(result).toEqual({ isbn: '0451526538', readDate: '2026-05-04' });
		});

		it('should parse ISBN-10 with hyphens', () => {
			const result = parseEmailBody('0-201-63361-2\n2026/05/04');
			expect(result).toEqual({ isbn: '0201633612', readDate: '2026-05-04' });
		});
	});

	describe('invalid ISBN', () => {
		it('should reject ISBN with wrong length', () => {
			const result = parseEmailBody('123456\n2026-05-04');
			expect(result).toBeNull();
		});

		it('should reject ISBN with non-numeric characters (except hyphens)', () => {
			const result = parseEmailBody('978-ABC-9651-2\n2026-05-04');
			expect(result).toBeNull();
		});

		it('should reject ISBN-13 not starting with 978 or 979', () => {
			const result = parseEmailBody('9774103396512\n2026-05-04');
			expect(result).toBeNull();
		});

		it('should reject ISBN-10 with invalid check digit', () => {
			const result = parseEmailBody('0201633611\n2026-05-04');
			expect(result).toBeNull();
		});
	});

	describe('invalid date', () => {
		it('should reject malformed date (no separators)', () => {
			const result = parseEmailBody('9784103396512\n20260504');
			expect(result).toBeNull();
		});

		it('should reject invalid month', () => {
			const result = parseEmailBody('9784103396512\n2026-13-04');
			expect(result).toBeNull();
		});

		it('should reject invalid day', () => {
			const result = parseEmailBody('9784103396512\n2026-05-32');
			expect(result).toBeNull();
		});

		it('should reject invalid date format', () => {
			const result = parseEmailBody('9784103396512\nMay 4, 2026');
			expect(result).toBeNull();
		});

		it('should reject date with wrong separator mix', () => {
			const result = parseEmailBody('9784103396512\n2026-05/04');
			expect(result).toBeNull();
		});

		it('should accept leap year date', () => {
			const result = parseEmailBody('9784103396512\n2024-02-29');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2024-02-29' });
		});

		it('should reject invalid leap year date', () => {
			const result = parseEmailBody('9784103396512\n2023-02-29');
			expect(result).toBeNull();
		});
	});

	describe('missing or insufficient lines', () => {
		it('should reject single line input', () => {
			const result = parseEmailBody('9784103396512');
			expect(result).toBeNull();
		});

		it('should reject empty input', () => {
			const result = parseEmailBody('');
			expect(result).toBeNull();
		});

		it('should handle extra blank lines (filter them)', () => {
			const result = parseEmailBody('9784103396512\n\n2026-05-04\n');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});
	});

	describe('edge cases', () => {
		it('should handle multiple blank lines between data', () => {
			const result = parseEmailBody('9784103396512\n\n\n2026-05-04');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});

		it('should use first two non-empty lines', () => {
			const result = parseEmailBody('9784103396512\n2026-05-04\nextra line');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});

		it('should handle ISBN with spaces', () => {
			const result = parseEmailBody('978 4 10 339651 2\n2026-05-04');
			expect(result).toEqual({ isbn: '9784103396512', readDate: '2026-05-04' });
		});
	});
});

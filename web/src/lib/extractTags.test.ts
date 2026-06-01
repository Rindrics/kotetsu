import { describe, it, expect } from 'vitest';
import { extractTags, unescapeText } from './extractTags';

describe('extractTags', () => {
	it('extracts single tag from text', () => {
		const { tags } = extractTags('興味深い #学習');
		expect(tags).toEqual(['学習']);
	});

	it('extracts multiple tags from text', () => {
		const { tags } = extractTags('実に興味深い内容だった #学習 #読書');
		expect(tags).toEqual(['学習', '読書']);
	});

	it('returns empty array when no tags present', () => {
		const { tags } = extractTags('普通のテキスト');
		expect(tags).toEqual([]);
	});

	it('handles tags followed by punctuation', () => {
		const { tags } = extractTags('素晴らしい本だった #推薦 。');
		expect(tags).toEqual(['推薦']);
	});

	it('handles multiple tags in a row', () => {
		const { tags } = extractTags('#tag1 #tag2 #tag3');
		expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
	});

	it('extracts tags with numbers and underscores', () => {
		const { tags } = extractTags('#tag_1 #tag2');
		expect(tags).toEqual(['tag_1', 'tag2']);
	});

	it('ignores escaped hash symbols', () => {
		const { tags } = extractTags('C\\# は良い言語 #プログラミング');
		expect(tags).toEqual(['プログラミング']);
	});

	it('handles escaped hash at word boundary', () => {
		const { tags } = extractTags('本当のシャープ \\# を使う #タグ');
		expect(tags).toEqual(['タグ']);
	});

	it('does not treat hash in middle of word as tag', () => {
		const { tags } = extractTags('test#middle #tag');
		expect(tags).toEqual(['tag']);
	});

	it('removes tags from text', () => {
		const { cleanedText } = extractTags('実に興味深い #学習 #読書');
		expect(cleanedText).toEqual('実に興味深い');
	});

	it('removes tags and normalizes spaces', () => {
		const { cleanedText } = extractTags('text #tag1 more #tag2 end');
		expect(cleanedText).toEqual('text more end');
	});
});

describe('unescapeText', () => {
	it('converts \\# to #', () => {
		const result = unescapeText('C\\# は良い言語');
		expect(result).toBe('C# は良い言語');
	});

	it('handles multiple escaped hashes', () => {
		const result = unescapeText('\\#\\#\\#');
		expect(result).toBe('###');
	});

	it('preserves unescaped text', () => {
		const result = unescapeText('通常のテキスト');
		expect(result).toBe('通常のテキスト');
	});

	it('handles mixed escaped and normal characters', () => {
		const result = unescapeText('本当のシャープ\\# を使う');
		expect(result).toBe('本当のシャープ# を使う');
	});
});

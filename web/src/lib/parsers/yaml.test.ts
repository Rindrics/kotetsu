import { describe, it, expect } from 'vitest';
import { parseCustomInfo } from './yaml';

describe('parseCustomInfo', () => {
	it('extracts tags from review string', () => {
		const yaml = `
entry1:
  readDate: 2026-01-01
  site1:
    review: "素晴らしい #推薦 #必読"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['推薦', '必読']);
	});

	it('extracts tags from review array', () => {
		const yaml = `
entry1:
  site1:
    review:
      - "第一印象 #良い"
      - "深い内容 #学習"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['良い', '学習']);
	});

	it('extracts tags from memo array', () => {
		const yaml = `
entry1:
  site1:
    memo:
      - "p.5 重要な章 #重要"
      - "p.10 参考情報 #参考"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['重要', '参考']);
	});

	it('merges tags from both review and memo', () => {
		const yaml = `
entry1:
  site1:
    review: "良い本 #推薦"
    memo:
      - "重要 #重要"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['推薦', '重要']);
	});

	it('removes duplicate tags', () => {
		const yaml = `
entry1:
  site1:
    review: "#学習 #重要"
    memo:
      - "#学習 #参考"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['学習', '重要', '参考']);
	});

	it('unescapes hashes in review and memo', () => {
		const yaml = `
entry1:
  site1:
    review: C\\# #プログラミング
    memo:
      - JavaScript\\# #JS
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		// Review and memo should have escaped hashes converted
		expect(entry?.sites['site1'].review).toContain('C#');
		expect((entry?.sites['site1'].memo as string[])[0]).toContain('JavaScript#');
	});

	it('handles tags with underscores and numbers', () => {
		const yaml = `
entry1:
  site1:
    review: "#tag_1 #tag_2 #tag123"
`;
		const result = parseCustomInfo(yaml);
		const entry = result.get('entry1');
		expect(entry?.sites['site1'].extractedTags).toEqual(['tag_1', 'tag_2', 'tag123']);
	});
});

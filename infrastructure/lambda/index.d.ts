declare module 'node-isbn' {
  export function resolve(isbn: string, callback: (err: Error | null, book: any) => void): void;
}

declare module 'kuroshiro' {
  interface KuroshiroOptions {
    to: 'romaji' | 'hiragana' | 'katakana';
  }

  class Kuroshiro {
    init(): Promise<void>;
    convert(text: string, options: KuroshiroOptions): Promise<string>;
  }

  export default Kuroshiro;
}

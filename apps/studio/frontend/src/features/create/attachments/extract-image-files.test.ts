import { describe, expect, it } from 'vitest';
import { extractImageFiles } from './extract-image-files';

describe('extractImageFiles', () => {
  it('keeps only jpeg/png/webp', () => {
    const files = [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.gif', { type: 'image/gif' }),
      new File(['c'], 'c.webp', { type: 'image/webp' }),
    ];
    const data = {
      files: {
        length: files.length,
        item: (i: number) => files[i] ?? null,
        [Symbol.iterator]: function* () {
          yield* files;
        },
      },
      items: [],
    } as unknown as DataTransfer;
    expect(extractImageFiles(data).map((f) => f.name)).toEqual([
      'a.png',
      'c.webp',
    ]);
  });

  it('returns empty for null', () => {
    expect(extractImageFiles(null)).toEqual([]);
  });
});

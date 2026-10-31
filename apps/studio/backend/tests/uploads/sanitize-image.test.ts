import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { AppError } from '../../src/lib/errors.js';
import { sanitizeUploadImage } from '../../src/uploads/sanitize-image.js';

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .jpeg()
    .toBuffer();
}

describe('sanitizeUploadImage', () => {
  it('rejects non-image bytes', async () => {
    await expect(sanitizeUploadImage(Buffer.from('not-an-image'))).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('rejects oversized payloads', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
    await expect(sanitizeUploadImage(big)).rejects.toMatchObject({
      code: 'UPLOAD_TOO_LARGE',
    });
  });

  it('downscales long side to 2048 and strips to PNG', async () => {
    const jpeg = await makeJpeg(3000, 1500);
    const out = await sanitizeUploadImage(jpeg);
    expect(out.width).toBe(2048);
    expect(out.height).toBe(1024);
    const meta = await sharp(out.png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.exif).toBeUndefined();
  });

  it('applies EXIF orientation', async () => {
    // Orientation 6 = rotate 90 CW; after rotate the 2x4 becomes 4x2.
    const raw = await sharp({
      create: {
        width: 2,
        height: 4,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const out = await sanitizeUploadImage(raw);
    expect(out.width).toBe(4);
    expect(out.height).toBe(2);
  });
});

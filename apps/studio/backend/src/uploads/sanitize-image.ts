import sharp from 'sharp';
import { AppError, ErrorCodes } from '../lib/errors.js';

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_MAX_SIDE = 2048;

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export type SanitizedUpload = {
  png: Buffer;
  width: number;
  height: number;
  bytes: number;
};

/**
 * Decode, rotate from EXIF, strip metadata, clamp longest side, re-encode PNG.
 * Server is the authority; client checks are only for fast feedback.
 */
export async function sanitizeUploadImage(
  bytes: Buffer,
): Promise<SanitizedUpload> {
  if (bytes.byteLength > UPLOAD_MAX_BYTES) {
    throw new AppError(
      400,
      ErrorCodes.UPLOAD_TOO_LARGE,
      'Image is too large (max 10 MB)',
    );
  }

  let pipeline = sharp(bytes, { failOn: 'error' }).rotate();
  let meta: Awaited<ReturnType<typeof pipeline.metadata>>;
  try {
    meta = await pipeline.metadata();
  } catch {
    throw new AppError(
      400,
      ErrorCodes.UPLOAD_INVALID,
      'Image could not be read',
    );
  }

  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new AppError(
      400,
      ErrorCodes.UPLOAD_INVALID,
      'Only JPEG, PNG, or WebP images are allowed',
    );
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 1 || height < 1) {
    throw new AppError(
      400,
      ErrorCodes.UPLOAD_INVALID,
      'Image could not be read',
    );
  }

  if (Math.max(width, height) > UPLOAD_MAX_SIDE) {
    pipeline = pipeline.resize({
      width: UPLOAD_MAX_SIDE,
      height: UPLOAD_MAX_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // PNG re-encode drops EXIF / ICC / other metadata.
  const png = await pipeline.png().toBuffer();
  const outMeta = await sharp(png).metadata();
  const outWidth = outMeta.width ?? width;
  const outHeight = outMeta.height ?? height;

  return {
    png,
    width: outWidth,
    height: outHeight,
    bytes: png.byteLength,
  };
}

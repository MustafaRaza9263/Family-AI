import { toast } from 'sonner';
import { errorMessage } from '@/lib/errors';
import { assetUrl } from '@/lib/files';
import { uploadImage } from '../api';
import {
  CLIENT_MAX_UPLOAD_BYTES,
  isAllowedImageFile,
} from './extract-image-files';
import type { AttachmentsAction } from './reducer';

/** Queue local files into the tray and POST each to /uploads. */
export function enqueueUploads(
  files: File[],
  opts: {
    max: number;
    currentCount: number;
    dispatch: (action: AttachmentsAction) => void;
    /** Fired once when the first file in this batch becomes a ready asset. */
    onFirstAssetSize?: (size: { width: number; height: number }) => void;
  },
): void {
  let count = opts.currentCount;
  let reportedSize = opts.currentCount > 0;
  for (const file of files) {
    if (!isAllowedImageFile(file)) {
      toast.error(errorMessage('UPLOAD_INVALID'));
      continue;
    }
    if (file.size > CLIENT_MAX_UPLOAD_BYTES) {
      toast.error(errorMessage('UPLOAD_TOO_LARGE'));
      continue;
    }
    if (count >= opts.max) break;
    const key = `local-${crypto.randomUUID()}`;
    const previewUrl = URL.createObjectURL(file);
    opts.dispatch({
      type: 'add',
      max: opts.max,
      item: { key, previewUrl, uploading: true },
    });
    count += 1;
    void uploadImage(file)
      .then((asset) => {
        opts.dispatch({
          type: 'mark_uploaded',
          key,
          assetId: asset.id,
          previewUrl: assetUrl(asset.id, { thumb: true }),
        });
        if (!reportedSize && opts.onFirstAssetSize) {
          reportedSize = true;
          opts.onFirstAssetSize({
            width: asset.width,
            height: asset.height,
          });
        }
        URL.revokeObjectURL(previewUrl);
      })
      .catch((err: unknown) => {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : 'UPLOAD_INVALID';
        toast.error(errorMessage(code));
        opts.dispatch({ type: 'fail_upload', key });
        URL.revokeObjectURL(previewUrl);
      });
  }
}

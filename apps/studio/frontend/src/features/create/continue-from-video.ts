import { assetUrl } from '@/lib/files';
import type { AttachmentItem } from './attachments/types';

export type ExtractFrameFn = (
  assetId: string,
  at: 'first' | 'last',
) => Promise<{ asset: { id: string } }>;

/** Call the frame endpoint and shape the result as a Start-frame attachment. */
export async function continueFromLastFrame(
  assetId: string,
  extract: ExtractFrameFn,
): Promise<AttachmentItem> {
  const res = await extract(assetId, 'last');
  return {
    key: `start-${res.asset.id}`,
    assetId: res.asset.id,
    previewUrl: assetUrl(res.asset.id, { thumb: true }),
    uploading: false,
  };
}

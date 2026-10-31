export type AttachmentItem = {
  /** Stable UI id (local until upload finishes, then asset id). */
  key: string;
  assetId?: string;
  previewUrl: string;
  uploading: boolean;
  /** Explicit working-image chip from the last result. */
  working?: boolean;
};

export type AttachmentsState = {
  items: AttachmentItem[];
  /** Per-thread: user dismissed the auto working image. */
  dismissedWorking: boolean;
};

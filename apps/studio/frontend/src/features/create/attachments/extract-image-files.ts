const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Pull image files from a paste or drop DataTransfer. */
export function extractImageFiles(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files: File[] = [];
  if (data.files?.length) {
    for (const file of Array.from(data.files)) {
      if (IMAGE_TYPES.has(file.type)) files.push(file);
    }
    return files;
  }
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && IMAGE_TYPES.has(file.type)) files.push(file);
    }
  }
  return files;
}

export function isAllowedImageFile(file: File): boolean {
  return IMAGE_TYPES.has(file.type);
}

export const CLIENT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

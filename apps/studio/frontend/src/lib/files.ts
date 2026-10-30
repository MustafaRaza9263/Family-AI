/** Same-origin asset URLs served by the Studio backend. */
export function assetUrl(
  assetId: string,
  opts?: { thumb?: boolean; download?: boolean },
): string {
  const params = new URLSearchParams();
  if (opts?.thumb) params.set('thumb', '1');
  if (opts?.download) params.set('download', '1');
  const qs = params.toString();
  return `/api/files/${assetId}${qs ? `?${qs}` : ''}`;
}

export async function downloadAsset(
  assetId: string,
  filename = 'generation.png',
): Promise<void> {
  const res = await fetch(assetUrl(assetId, { download: true }), {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

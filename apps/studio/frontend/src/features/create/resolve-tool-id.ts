/** Map `?tool=` query values to a known tool id (default image). */
export function resolveToolId(
  param: string | null | undefined,
): 'image' | 'video' {
  return param === 'video' ? 'video' : 'image';
}

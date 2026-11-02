export const queryKeys = {
  me: ['me'] as const,
  capabilities: ['capabilities'] as const,
  threads: (cursor?: string, tool?: string) =>
    ['threads', tool ?? 'all', cursor ?? ''] as const,
  thread: (id: string) => ['thread', id] as const,
  library: (kind: string | undefined, cursor?: string) =>
    ['library', kind ?? 'all', cursor ?? ''] as const,
  libraryInfinite: (kind: string | undefined, favorited = false) =>
    ['library', 'infinite', kind ?? 'all', favorited ? 'fav' : 'all'] as const,
  adminUsers: (status: string | undefined, q: string, page: number) =>
    ['admin', 'users', status ?? 'all', q, page] as const,
  adminEngine: ['admin', 'engine'] as const,
};

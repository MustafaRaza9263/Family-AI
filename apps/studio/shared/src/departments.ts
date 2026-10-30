/** Signup / profile department choices (product copy, not auth schema). */
export const DEPARTMENTS = [
  'Marketing',
  'Sales',
  'Design',
  'Management',
  'IT',
  'Other',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

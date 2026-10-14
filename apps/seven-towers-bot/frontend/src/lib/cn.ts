import { clsx, type ClassValue } from "clsx";

/** Tiny className helper — keeps conditional classes readable. */
export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

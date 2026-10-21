import { promises as fs } from 'fs';
import path from 'path';

let cached: string | null = null;

/** Shared, code-owned gap instructions (static — safe for prefix caching). */
export async function loadGapReportingPrompt(): Promise<string> {
  if (cached !== null) {
    return cached;
  }
  const filePath = path.join(__dirname, '..', '..', 'prompts', 'gap-reporting.md');
  cached = (await fs.readFile(filePath, 'utf8')).trim();
  return cached;
}

export function clearGapReportingPromptCache(): void {
  cached = null;
}

/**
 * Validate all knowledge packs. Shared rules with startup and admin reload.
 *
 * Usage: npm run knowledge:check
 */
import { promises as fs } from 'fs';
import path from 'path';
import {
  formatIssue,
  validateProjectPack,
} from '../src/services/knowledge-validate';

async function main(): Promise<void> {
  const knowledgeDir = path.resolve(
    process.env.KNOWLEDGE_DIR ?? path.join(__dirname, '..', 'knowledge'),
  );

  let entries: string[];
  try {
    entries = await fs.readdir(knowledgeDir);
  } catch (err) {
    console.error(`Knowledge dir not readable: ${knowledgeDir}`);
    console.error(err);
    process.exit(1);
  }

  let failed = false;
  let checked = 0;

  for (const name of entries) {
    const rootDir = path.join(knowledgeDir, name);
    const stat = await fs.stat(rootDir);
    if (!stat.isDirectory()) {
      continue;
    }
    checked += 1;
    const result = await validateProjectPack(name, rootDir);
    console.log(`\n== ${name} ==`);
    for (const issue of result.errors) {
      console.error(formatIssue(issue));
    }
    for (const issue of result.warnings) {
      console.warn(formatIssue(issue));
    }
    console.log(
      `stats: tables=${result.stats.tables} images=${result.stats.images} tokens≈${result.stats.tokens}`,
    );
    if (!result.ok) {
      failed = true;
      console.error(`FAIL ${name}`);
    } else {
      console.log(`OK ${name}`);
    }
  }

  if (checked === 0) {
    console.error(`No knowledge packs found in ${knowledgeDir}`);
    process.exit(1);
  }

  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Convert source/ images to images/ WebP + thumbnails for a knowledge pack.
 *
 * Usage:
 *   npm run assets:build -- --project seven-towers
 *   npm run assets:build -- --project seven-towers --placeholder
 */
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function slugify(base: string): string {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
  return slug;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const projectIdx = args.indexOf('--project');
  const project = projectIdx >= 0 ? args[projectIdx + 1] : undefined;
  const placeholder = args.includes('--placeholder');

  if (!project) {
    console.error('Usage: npm run assets:build -- --project <id> [--placeholder]');
    process.exit(1);
  }

  const root = path.resolve(__dirname, '..', 'knowledge', project);
  const sourceDir = path.join(root, 'source');
  const imagesDir = path.join(root, 'images');
  await fs.mkdir(imagesDir, { recursive: true });

  if (placeholder) {
    await fs.mkdir(sourceDir, { recursive: true });
    const sample = path.join(sourceDir, 'sample-floor-plan.png');
    await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 180, g: 180, b: 180 },
      },
    })
      .png()
      .toFile(sample);
    console.log(`Wrote placeholder source: ${sample}`);
  }

  let sources: string[] = [];
  try {
    sources = (await fs.readdir(sourceDir)).filter((f) =>
      /\.(png|jpe?g|webp|gif|tiff?)$/i.test(f),
    );
  } catch {
    console.warn(`No source dir at ${sourceDir}`);
  }

  const planned = new Map<string, string>();
  for (const file of sources) {
    const base = path.parse(file).name.replace(/\.thumb$/, '');
    const slug = slugify(base);
    if (!NAME_RE.test(slug)) {
      console.error(`Refuse: cannot slugify "${file}" to a valid kebab-case name`);
      process.exit(1);
    }
    const prev = planned.get(slug);
    if (prev) {
      console.error(`Refuse: collision — "${file}" and "${prev}" both become "${slug}"`);
      process.exit(1);
    }
    planned.set(slug, file);
  }

  const markdownLines: string[] = [];

  for (const [slug, file] of planned) {
    const input = path.join(sourceDir, file);
    const webpOut = path.join(imagesDir, `${slug}.webp`);
    const thumbOut = path.join(imagesDir, `${slug}.thumb.webp`);

    await sharp(input)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webpOut);

    await sharp(input)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(thumbOut);

    const alt = slug.replace(/-/g, ' ');
    const md = `![${alt}](images/${slug}.webp)`;
    markdownLines.push(md);
    console.log(`ok  ${file} -> ${slug}.webp / ${slug}.thumb.webp`);
    console.log(`     paste: ${md}`);
  }

  if (markdownLines.length === 0) {
    console.log('No source images processed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

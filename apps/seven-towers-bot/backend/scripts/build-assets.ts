/**
 * Convert source images to WebP + thumbnails for a knowledge pack.
 *
 * Usage:
 *   npm run assets:build -- --project seven-towers
 *   npm run assets:build -- --project seven-towers --placeholder
 */
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

type ResultRow = { name: string; webp: string; thumb: string; status: string };

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
  const sourceDir = path.join(root, 'assets', 'source');
  const imagesDir = path.join(root, 'assets', 'images');
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

  const rows: ResultRow[] = [];

  for (const file of sources) {
    const base = path.parse(file).name.replace(/\.thumb$/, '');
    const input = path.join(sourceDir, file);
    const webpOut = path.join(imagesDir, `${base}.webp`);
    const thumbOut = path.join(imagesDir, `${base}.thumb.webp`);

    await sharp(input)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(webpOut);

    await sharp(input)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(thumbOut);

    rows.push({ name: base, webp: webpOut, thumb: thumbOut, status: 'ok' });
  }

  console.table(
    rows.map((r) => ({
      name: r.name,
      webp: path.basename(r.webp),
      thumb: path.basename(r.thumb),
      status: r.status,
    })),
  );

  // Warn about catalog image entries whose files are missing.
  try {
    const catalog = JSON.parse(
      await fs.readFile(path.join(root, 'catalog.json'), 'utf8'),
    ) as { id: string; type: string; file: string }[];
    for (const entry of catalog) {
      if (entry.type !== 'image') {
        continue;
      }
      const webp = path.join(imagesDir, `${entry.file}.webp`);
      const thumb = path.join(imagesDir, `${entry.file}.thumb.webp`);
      try {
        await fs.access(webp);
        await fs.access(thumb);
      } catch {
        console.warn(
          `WARNING: catalog image "${entry.id}" missing files (${entry.file}.webp / .thumb.webp)`,
        );
      }
    }
  } catch {
    console.warn('Could not read catalog.json for missing-file warnings');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

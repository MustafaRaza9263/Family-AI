import type { Recipe } from '../comfy/recipes/recipe.js';
import { binaryAvailable } from './ffmpeg-media.js';

/** Fail boot when video recipes are loaded but ffmpeg/ffprobe cannot run. */
export async function assertMediaBinariesForRecipes(
  recipes: ReadonlyMap<string, Recipe>,
  ffmpegPath: string,
  ffprobePath: string,
): Promise<void> {
  const hasVideo = [...recipes.values()].some((r) => r.manifest.tool === 'video');
  if (!hasVideo) return;

  const ffmpegOk = await binaryAvailable(ffmpegPath);
  const ffprobeOk = await binaryAvailable(ffprobePath);
  if (ffmpegOk && ffprobeOk) return;

  const missing: string[] = [];
  if (!ffmpegOk) missing.push(`ffmpeg (${ffmpegPath})`);
  if (!ffprobeOk) missing.push(`ffprobe (${ffprobePath})`);
  throw new Error(
    `Video recipes are loaded but media binaries are missing or unusable: ${missing.join(', ')}. Set FFMPEG_PATH / FFPROBE_PATH or install them.`,
  );
}

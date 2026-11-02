export type VideoProbe = {
  width: number;
  height: number;
  frames: number;
  durationSec: number;
};

export type FrameAt = 'first' | 'last';

/** Injectable so tests can fake ffmpeg without spawning. */
export type MediaTools = {
  probeVideo(path: string): Promise<VideoProbe>;
  extractFrame(videoPath: string, at: FrameAt): Promise<Buffer>;
};

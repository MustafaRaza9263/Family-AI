import { Clapperboard, ImagePlus, type LucideIcon } from 'lucide-react';
import { GenerationCard } from './components/generation-card';
import { VideoGenerationCard } from './components/video-generation-card';

export type ToolId = 'image' | 'video';

export type AttachmentStyle = 'numbered' | 'slots';

export type ToolUiEntry = {
  id: ToolId;
  icon: LucideIcon;
  title: string;
  newLabel: string;
  /** Footer quota noun: "N of 25 images/videos left today". */
  quotaNoun: string;
  attachmentStyle: AttachmentStyle;
  /** Result card component for this tool (narrow props at the call site). */
  ResultCard: typeof GenerationCard | typeof VideoGenerationCard;
};

/**
 * Product UI keyed by tool id. Adding a tool later = one entry here
 * (composer + cards stay mode-driven from capabilities).
 */
export const TOOL_UI: Record<ToolId, ToolUiEntry> = {
  image: {
    id: 'image',
    icon: ImagePlus,
    title: 'Image',
    newLabel: 'New image',
    quotaNoun: 'images',
    attachmentStyle: 'numbered',
    ResultCard: GenerationCard,
  },
  video: {
    id: 'video',
    icon: Clapperboard,
    title: 'Video',
    newLabel: 'New video',
    quotaNoun: 'videos',
    attachmentStyle: 'slots',
    ResultCard: VideoGenerationCard,
  },
};

export function toolUi(id: string): ToolUiEntry {
  return TOOL_UI[id === 'video' ? 'video' : 'image'];
}

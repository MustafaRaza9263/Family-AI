import {
  PRODUCT_NAME,
  type CapabilitiesResponse,
  type EngineState,
  type ModeControl,
  type ToolCapability,
  type ToolMode,
} from '@studio/shared';
import type { Recipe } from '../comfy/recipes/recipe.js';
import type { LimitsService } from '../limits/limits.service.js';

const TOOL_LABELS: Record<'image' | 'video', string> = {
  image: 'Image',
  video: 'Video',
};

export type CapabilitiesServiceDeps = {
  recipes: ReadonlyMap<string, Recipe>;
  limits: LimitsService;
  getEngineState: () => EngineState;
};

/** Build the public capabilities menu from loaded recipes (no engine leakage). */
export class CapabilitiesService {
  constructor(private readonly deps: CapabilitiesServiceDeps) {}

  async getForUser(userId: string): Promise<CapabilitiesResponse> {
    const [remaining, resolved] = await Promise.all([
      this.deps.limits.remaining(userId),
      this.deps.limits.resolvedLimits(),
    ]);

    return {
      product: PRODUCT_NAME,
      engine: { state: this.deps.getEngineState() },
      tools: buildTools(this.deps.recipes),
      limits: {
        image: remaining.image,
        video: remaining.video,
        activeCap: {
          running: resolved.perUserRunning,
          queued: resolved.perUserQueued,
        },
      },
    };
  }
}

function buildTools(
  recipes: ReadonlyMap<string, Recipe>,
): ToolCapability[] {
  const byTool = new Map<'image' | 'video', Recipe[]>();
  for (const recipe of recipes.values()) {
    const list = byTool.get(recipe.manifest.tool) ?? [];
    list.push(recipe);
    byTool.set(recipe.manifest.tool, list);
  }

  const tools: ToolCapability[] = [];
  for (const tool of ['image', 'video'] as const) {
    const list = byTool.get(tool);
    if (!list || list.length === 0) continue;
    const modes = list.map(toPublicMode);
    const maxAttach = Math.max(...modes.map((m) => m.inputImages.max), 0);
    tools.push({
      id: tool,
      label: TOOL_LABELS[tool],
      attachments: { max: maxAttach },
      modes,
    });
  }
  return tools;
}

function toPublicMode(recipe: Recipe): ToolMode {
  const { match, params } = recipe.manifest;
  const controls: ModeControl[] = Object.entries(params).map(([id, param]) => {
    if (param.type === 'text') {
      return {
        id,
        type: 'text',
        label: param.label,
        icon: param.icon,
        group: param.group,
        default: '',
        maxLength: param.maxLength,
      };
    }
    return {
      id,
      type: 'enum',
      label: param.label,
      icon: param.icon,
      group: param.group,
      default: param.default,
      options: param.options.map((o) => ({
        value: o.value,
        label: o.label,
        icon: o.icon,
      })),
    };
  });

  return {
    inputImages: { ...match.inputImages },
    variant: match.variant
      ? {
          id: match.variant.id,
          label: match.variant.label,
          icon: match.variant.icon,
          default: match.variant.default,
        }
      : undefined,
    controls,
  };
}

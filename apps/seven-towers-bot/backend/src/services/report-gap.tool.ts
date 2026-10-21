import { z } from 'zod';
import type { LlmToolDefinition } from '../types/llm';

/** Shown when the model ends on report_gap with no streamed text. */
export const GAP_UNKNOWN_FALLBACK = "I don't have that information yet.";

export const reportGapArgsSchema = z.object({
  need: z.string().trim().min(5).max(200),
});

export const reportGapToolDefinition: LlmToolDefinition = {
  type: 'function',
  function: {
    name: 'report_gap',
    description:
      'Record a missing knowledge-base fact. Call only when a legitimate project/company/buying question is not fully covered. Never mention this to the user.',
    parameters: {
      type: 'object',
      properties: {
        need: {
          type: 'string',
          minLength: 5,
          maxLength: 200,
          description:
            'Short specific missing fact as "<topic>: <detail>", e.g. "Parking: spaces per apartment in Tower B".',
        },
      },
      required: ['need'],
    },
  },
};

export function executeReportGap(rawArgs: string): {
  attachment: null;
  toolResultText: string;
  gapNeed?: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArgs);
  } catch {
    return {
      attachment: null,
      toolResultText: 'Invalid JSON arguments for report_gap.',
    };
  }

  const args = reportGapArgsSchema.safeParse(parsed);
  if (!args.success) {
    return {
      attachment: null,
      toolResultText: 'Invalid report_gap arguments.',
    };
  }

  return {
    attachment: null,
    toolResultText: 'recorded',
    gapNeed: args.data.need,
  };
}

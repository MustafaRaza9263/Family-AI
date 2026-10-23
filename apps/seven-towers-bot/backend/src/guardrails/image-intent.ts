/**
 * Detect when the user (or the model's own claim) means floor-plan / map
 * images must be shown via show_images this turn.
 */

type HistoryTurn = { role: string; content: string };

const WANTS_IMAGE_RE =
  /\b(floor\s*plans?|show\s+(me\s+)?(the\s+)?images?|images\b|location\s+map|show\s+(me\s+)?(the\s+)?map|not\s+seen|didn'?t\s+see|did\s+not\s+see|can'?t\s+see|cannot\s+see|i\s+don'?t\s+see)\b/i;

const AFFIRM_RE = /^(yes|yeah|yep|yup|sure|ok|okay|please|show(\s+me)?|go\s+ahead)\b/i;

const OFFERED_FLOOR_PLAN_RE =
  /floor\s*plan|would you like to see|want to see the (floor|image|location)/i;

const CLAIMS_SHOWN_RE =
  /\bhere (is|are) the floor plans?\b|\bhere is the (floor plan|location map)\b/i;

export function userWantsFloorPlanImages(
  userMessage: string,
  history: HistoryTurn[],
): boolean {
  const msg = userMessage.trim();
  if (msg.length === 0) {
    return false;
  }
  if (WANTS_IMAGE_RE.test(msg)) {
    return true;
  }
  if (AFFIRM_RE.test(msg)) {
    const lastAssistant = [...history]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (lastAssistant && OFFERED_FLOOR_PLAN_RE.test(lastAssistant.content)) {
      return true;
    }
  }
  return false;
}

/** Model said images were shown (often without calling the tool). */
export function claimsFloorPlanShown(text: string): boolean {
  return CLAIMS_SHOWN_RE.test(text);
}

import { describe, expect, it } from 'vitest';
import {
  claimsFloorPlanShown,
  userWantsFloorPlanImages,
} from '../../src/guardrails/image-intent';

describe('userWantsFloorPlanImages', () => {
  it('detects explicit floor-plan and image asks', () => {
    expect(userWantsFloorPlanImages('show me the floor plans', [])).toBe(true);
    expect(userWantsFloorPlanImages('show me images', [])).toBe(true);
    expect(userWantsFloorPlanImages('not seen anything', [])).toBe(true);
  });

  it('treats yes after a floor-plan offer as an image ask', () => {
    expect(
      userWantsFloorPlanImages('yes show me', [
        {
          role: 'assistant',
          content: 'Would you like to see the floor plans for Type A and Type B now?',
        },
      ]),
    ).toBe(true);
  });

  it('does not force images for payment-plan wording alone', () => {
    expect(
      userWantsFloorPlanImages('show me all available plan for the Nexus tower', []),
    ).toBe(false);
  });
});

describe('claimsFloorPlanShown', () => {
  it('detects prose that pretends images were shown', () => {
    expect(
      claimsFloorPlanShown(
        'Here are the floor plans for the Nexus Type A and Nexus Type B units.',
      ),
    ).toBe(true);
    expect(claimsFloorPlanShown('Total price is PKR 31,000,000.')).toBe(false);
  });
});

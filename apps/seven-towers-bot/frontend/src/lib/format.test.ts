import { describe, expect, it } from "vitest";
import {
  groupByDate,
  isOverMessageLimit,
  shouldShowCharCounter,
} from "./format";

describe("groupByDate", () => {
  const now = new Date("2026-10-14T15:00:00");

  it("buckets Today / Yesterday / Previous 7 days / Older", () => {
    expect(groupByDate("2026-10-14T08:00:00", now)).toBe("Today");
    expect(groupByDate("2026-10-13T08:00:00", now)).toBe("Yesterday");
    expect(groupByDate("2026-10-10T08:00:00", now)).toBe("Previous 7 days");
    expect(groupByDate("2026-09-01T08:00:00", now)).toBe("Older");
  });
});

describe("character limit helpers", () => {
  it("flags over-limit messages", () => {
    expect(isOverMessageLimit(1500, 1500)).toBe(false);
    expect(isOverMessageLimit(1501, 1500)).toBe(true);
  });

  it("shows the counter from 80%", () => {
    expect(shouldShowCharCounter(1199, 1500)).toBe(false);
    expect(shouldShowCharCounter(1200, 1500)).toBe(true);
  });
});

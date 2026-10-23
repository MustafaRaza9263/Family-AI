import { describe, expect, it } from "vitest";
import { stripAttachmentMarkers } from "./attachment-markers";

describe("stripAttachmentMarkers", () => {
  it("removes legacy and tag markers", () => {
    const raw =
      "Here is the floor plan for Harmony Type B:\n" +
      "[Shown to the user: image(s) harmony-type-b]\n" +
      "Would you like another? <images_shown>imperial-type-a</images_shown>";
    expect(stripAttachmentMarkers(raw)).toBe(
      "Here is the floor plan for Harmony Type B:\nWould you like another?",
    );
  });

  it("leaves normal answers unchanged", () => {
    expect(stripAttachmentMarkers("Total price is 23,000,000 PKR.")).toBe(
      "Total price is 23,000,000 PKR.",
    );
  });
});

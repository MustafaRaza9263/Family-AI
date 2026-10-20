import { describe, expect, it } from "vitest";
import { parseSseChunks } from "./sse-client";

describe("parseSseChunks", () => {
  it("parses a complete frame", () => {
    const { frames, rest } = parseSseChunks(
      'event: token\ndata: {"text":"hi"}\n\n',
    );
    expect(rest).toBe("");
    expect(frames).toEqual([{ event: "token", data: '{"text":"hi"}' }]);
  });

  it("keeps an incomplete trailing frame in rest", () => {
    const { frames, rest } = parseSseChunks("event: token\ndata: {\"tex");
    expect(frames).toEqual([]);
    expect(rest).toContain("event: token");
  });

  it("handles CRLF line endings", () => {
    const { frames } = parseSseChunks(
      'event: done\r\ndata: {"messageId":"1"}\r\n\r\n',
    );
    expect(frames[0]?.event).toBe("done");
    expect(frames[0]?.data).toBe('{"messageId":"1"}');
  });

  it("joins multi-line data", () => {
    const { frames } = parseSseChunks("event: token\ndata: a\ndata: b\n\n");
    expect(frames[0]?.data).toBe("a\nb");
  });

  it("ignores heartbeat comment lines", () => {
    const { frames } = parseSseChunks(": ping\n\nevent: meta\ndata: {}\n\n");
    expect(frames).toHaveLength(1);
    expect(frames[0]?.event).toBe("meta");
  });

  it("keeps unknown event names for the caller to ignore", () => {
    const { frames } = parseSseChunks("event: weird\ndata: {}\n\n");
    expect(frames[0]?.event).toBe("weird");
  });
});

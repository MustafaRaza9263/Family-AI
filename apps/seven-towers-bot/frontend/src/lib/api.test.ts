import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, apiFetch, registerAuthHandlers } from "./api";

describe("apiFetch error mapping", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws ApiError with code and fields from JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [{ path: "email", message: "Invalid" }],
          },
        }),
        { status: 400 },
      ),
    );

    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      fields: [{ path: "email", message: "Invalid" }],
    } satisfies Partial<ApiError>);
  });

  it("invokes unauthorized handler on 401 UNAUTHENTICATED", async () => {
    const onUnauthorized = vi.fn();
    registerAuthHandlers({
      onUnauthorized,
      onPasswordChangeRequired: vi.fn(),
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "Authentication required" },
        }),
        { status: 401 },
      ),
    );

    await expect(apiFetch("/api/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});

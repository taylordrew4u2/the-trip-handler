import { describe, it, expect } from "vitest";
import { resolveAuthOrigin, shouldDeferToRequestHost } from "@/lib/authOrigin";

/**
 * NextAuth v4 trusts NEXTAUTH_URL with no sanity check, so a stale value is
 * silently wrong rather than loudly broken. These pin down when we take it
 * away from it — and, just as importantly, when we leave it alone.
 */

describe("shouldDeferToRequestHost", () => {
  it("defers on Vercel, where the request host is authoritative", () => {
    expect(shouldDeferToRequestHost({ VERCEL: "1" })).toBe(true);
  });

  it("does not defer anywhere else — off Vercel, NEXTAUTH_URL is the only answer", () => {
    expect(shouldDeferToRequestHost({})).toBe(false);
    expect(shouldDeferToRequestHost({ NEXTAUTH_URL: "http://localhost:3000" })).toBe(false);
  });
});

describe("resolveAuthOrigin", () => {
  it("discards a NEXTAUTH_URL pointing at the wrong domain", () => {
    // The exact shape of the bug this exists for.
    const env = {
      VERCEL: "1",
      NEXTAUTH_URL: "https://some-other-project.vercel.app",
    };

    const result = resolveAuthOrigin(env);

    expect(result).toEqual({
      deferredToRequestHost: true,
      discarded: "https://some-other-project.vercel.app",
    });
    expect(env.NEXTAUTH_URL).toBeUndefined();
  });

  it("discards a correct-looking one too, rather than trying to judge it", () => {
    // Comparing it against the deployment URL would be guesswork on a project
    // with a custom domain. The request host is already the right answer, so
    // there is nothing to compare.
    const env = { VERCEL: "1", NEXTAUTH_URL: "https://the-trip-handler.vercel.app" };

    expect(resolveAuthOrigin(env).deferredToRequestHost).toBe(true);
    expect(env.NEXTAUTH_URL).toBeUndefined();
  });

  it("is a no-op on Vercel when the variable was never set", () => {
    const env: Record<string, string | undefined> = { VERCEL: "1" };

    expect(resolveAuthOrigin(env)).toEqual({
      deferredToRequestHost: true,
      discarded: undefined,
    });
  });

  it("leaves local development completely alone", () => {
    const env = { NEXTAUTH_URL: "http://localhost:3000" };

    expect(resolveAuthOrigin(env)).toEqual({ deferredToRequestHost: false });
    expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
  });

  it("leaves CI alone, where there is no Vercel host to fall back to", () => {
    const env = { CI: "true", NEXTAUTH_URL: "http://127.0.0.1:3222" };

    resolveAuthOrigin(env);

    expect(env.NEXTAUTH_URL).toBe("http://127.0.0.1:3222");
  });
});

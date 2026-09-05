/**
 * Decide which origin NextAuth should believe it is served from.
 *
 * NextAuth v4 resolves this in `detectOrigin`, and the order matters:
 *
 *   1. `NEXTAUTH_URL`, unconditionally, if it is set;
 *   2. otherwise, on Vercel, the request's own `x-forwarded-host`;
 *   3. otherwise, undefined.
 *
 * Step 1 has no sanity check, which makes a stale `NEXTAUTH_URL` silently
 * wrong rather than loudly broken: every URL NextAuth generates — sign-in,
 * callback, error redirects — points at whatever that variable says, even when
 * the request plainly arrived somewhere else. This project shipped with it
 * pointing at an unrelated project's domain and nothing complained.
 *
 * A fixed value is also wrong by construction on preview deployments, which
 * each get their own hostname.
 *
 * So on Vercel we drop it and let step 2 run: the origin is then whatever host
 * the request actually came in on, which is right for production and for every
 * preview, and cannot drift. Off Vercel — local development, CI, any other
 * host — nothing changes, because step 2 doesn't apply there and `NEXTAUTH_URL`
 * is the only answer available.
 *
 * Exported and env-injected rather than inlined so the decision is testable
 * without a running server.
 */

type Env = Record<string, string | undefined>;

export function shouldDeferToRequestHost(env: Env): boolean {
  return Boolean(env.VERCEL);
}

/**
 * Applies the decision to `env`, and reports what happened so a caller can log
 * it. Mutates rather than returning a value because NextAuth reads the
 * environment directly.
 */
export function resolveAuthOrigin(env: Env): {
  deferredToRequestHost: boolean;
  discarded?: string;
} {
  if (!shouldDeferToRequestHost(env)) return { deferredToRequestHost: false };

  const discarded = env.NEXTAUTH_URL;
  delete env.NEXTAUTH_URL;
  return { deferredToRequestHost: true, discarded };
}

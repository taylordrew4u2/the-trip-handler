"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

// Demo organizer account, populated by `npm run db:seed`.
const DEMO_IDENTIFIER = "demo@thetriphandler.app";
const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWith(id: string, pw: string, onError: string) {
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      identifier: id,
      password: pw,
    });

    setLoading(false);
    if (result?.error) {
      setError(onError);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await signInWith(identifier, password, "Invalid email or password");
  }

  function handleDemo() {
    void signInWith(
      DEMO_IDENTIFIER,
      DEMO_PASSWORD,
      "Demo data isn't seeded yet — run `npm run db:seed`.",
    );
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-7">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">EMAIL</label>
          <input
            type="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-700 mb-1.5 tracking-wide">PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:border-stone-900 focus:ring-1 focus:ring-stone-900 text-sm"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <span className="h-px flex-1 bg-stone-200" />
        <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
        <span className="h-px flex-1 bg-stone-200" />
      </div>

      <button
        type="button"
        onClick={handleDemo}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
      >
        Try the demo →
      </button>
      <p className="text-xs text-stone-500 text-center mt-2">
        Sign in as a demo organizer — no account needed.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      redirect: false,
      identifier: username,
      password,
      isAdmin: "true",
    });

    setLoading(false);
    if (result?.error) {
      setError("Invalid credentials");
    } else {
      router.push("/admin/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Admin</p>
          <h1 className="font-serif text-3xl font-medium text-stone-100">The Trip Handler</h1>
          <p className="text-xs text-stone-500 italic mt-3 leading-snug">
            For the friend who accidentally became the adult in charge of making the plan.
          </p>
        </div>

        <div className="bg-stone-900 rounded-xl border border-stone-800 p-7">
          {error && (
            <div className="bg-red-950/50 border border-red-900 text-red-300 rounded-lg px-3 py-2 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5 tracking-wide">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400 text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-stone-100 hover:bg-white text-stone-900 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-stone-500">
          <a href="/login" className="hover:text-stone-300">← Member login</a>
        </p>
      </div>
    </div>
  );
}

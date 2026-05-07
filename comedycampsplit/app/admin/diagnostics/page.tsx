import { prisma } from "@/lib/db";
import { Resend } from "resend";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

type Check = {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
};

const REQUIRED_ENV = [
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

async function checkDb(): Promise<Check> {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 5000, "DB");
    return { name: "Postgres", status: "ok", detail: "SELECT 1 succeeded" };
  } catch (e) {
    return { name: "Postgres", status: "fail", detail: (e as Error).message };
  }
}

async function checkStripe(): Promise<Check> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { name: "Stripe", status: "fail", detail: "STRIPE_SECRET_KEY not set" };
  try {
    const stripe = new Stripe(key);
    const balance = await withTimeout(stripe.balance.retrieve(), 8000, "Stripe");
    const mode = key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : "unknown";
    return { name: "Stripe", status: "ok", detail: `balance.retrieve OK · mode=${mode} · livemode=${balance.livemode}` };
  } catch (e) {
    return { name: "Stripe", status: "fail", detail: (e as Error).message };
  }
}

async function checkResend(): Promise<Check> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { name: "Resend", status: "fail", detail: "RESEND_API_KEY not set" };
  try {
    const resend = new Resend(key);
    const domains = await withTimeout(resend.domains.list(), 8000, "Resend");
    type ResendDomain = { name: string; status: string };
    const list: ResendDomain[] = ((domains?.data as { data?: ResendDomain[] } | ResendDomain[] | undefined) as ResendDomain[]) ?? [];
    const verified = list.filter((d) => d.status === "verified").map((d) => d.name);
    if (verified.length === 0) {
      return { name: "Resend", status: "warn", detail: `API key valid but no verified domains (${list.length} total). EMAIL_FROM must use a verified domain or onboarding@resend.dev.` };
    }
    return { name: "Resend", status: "ok", detail: `API key valid · verified domains: ${verified.join(", ")}` };
  } catch (e) {
    return { name: "Resend", status: "fail", detail: (e as Error).message };
  }
}

function checkBlob(): Check {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { name: "Vercel Blob", status: "fail", detail: "BLOB_READ_WRITE_TOKEN not set" };
  if (!token.startsWith("vercel_blob_rw_")) {
    return { name: "Vercel Blob", status: "warn", detail: "Token format unexpected (should start with vercel_blob_rw_)" };
  }
  return { name: "Vercel Blob", status: "ok", detail: "Token present (full validation requires an actual upload)" };
}

function checkAuth(): Check {
  const secret = process.env.NEXTAUTH_SECRET;
  const url = process.env.NEXTAUTH_URL;
  if (!secret) return { name: "NextAuth", status: "fail", detail: "NEXTAUTH_SECRET missing" };
  if (!url) return { name: "NextAuth", status: "fail", detail: "NEXTAUTH_URL missing" };
  return { name: "NextAuth", status: "ok", detail: `URL=${url}` };
}

export default async function DiagnosticsPage() {
  const [db, stripe, resend] = await Promise.all([checkDb(), checkStripe(), checkResend()]);
  const integrationChecks: Check[] = [checkAuth(), db, checkBlob(), resend, stripe];

  const envRows = REQUIRED_ENV.map((name) => ({
    name,
    set: Boolean(process.env[name]),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diagnostics</h1>
        <p className="text-gray-500 text-sm mt-1">Live status of integrations and configuration. Refresh to re-run.</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Integrations</h2>
        <div className="grid gap-3">
          {integrationChecks.map((c) => (
            <div
              key={c.name}
              className={`rounded-2xl border p-4 ${
                c.status === "ok"
                  ? "bg-green-50 border-green-200"
                  : c.status === "warn"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <span
                  className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                    c.status === "ok"
                      ? "bg-green-200 text-green-900"
                      : c.status === "warn"
                      ? "bg-yellow-200 text-yellow-900"
                      : "bg-red-200 text-red-900"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1 font-mono break-all">{c.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Environment variables</h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Variable</th>
                <th className="px-4 py-2 font-medium">Set?</th>
              </tr>
            </thead>
            <tbody>
              {envRows.map((row) => (
                <tr key={row.name} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono">{row.name}</td>
                  <td className="px-4 py-2">
                    {row.set ? (
                      <span className="text-green-700 font-semibold">✓ set</span>
                    ) : (
                      <span className="text-red-700 font-semibold">✗ missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-2">Values are never displayed — only whether they're present.</p>
      </section>
    </div>
  );
}

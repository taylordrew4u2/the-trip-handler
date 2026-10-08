import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { AuthShell } from "@/components/AuthShell";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Members"
      title="Welcome back."
      description="For the friend who accidentally became the adult in charge of making the plan. Sign in to pick up where your group left off."
    >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-4 hover:decoration-indigo-600">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

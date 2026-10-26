import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { AuthShell } from "@/components/AuthShell";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Members"
      title="Welcome back."
      description="Sign in to join a trip, review your next steps, or manage a trip you organize."
    >
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-teal-800 underline decoration-teal-200 underline-offset-4 hover:decoration-teal-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

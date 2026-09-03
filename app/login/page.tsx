import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center gutter py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Members</p>
            <h1 className="font-serif text-4xl font-medium text-stone-900 leading-tight">
              The Trip<br />Handler
            </h1>
          </Link>
          <p className="text-xs text-stone-500 italic mt-3 max-w-xs mx-auto leading-snug">
            For the friend who accidentally became the adult in charge of making the plan.
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-center">
          <p className="text-sm text-stone-600">
            New here?{" "}
            <Link href="/signup" className="text-stone-900 font-medium underline underline-offset-2 decoration-stone-300 hover:decoration-stone-900">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

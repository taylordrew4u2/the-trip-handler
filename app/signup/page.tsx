import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center gutter py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Create account</p>
            <h1 className="font-serif text-4xl font-medium text-stone-900 leading-tight">
              The Trip<br />Handler
            </h1>
          </Link>
          <p className="text-xs text-stone-500 italic mt-3 max-w-xs mx-auto leading-snug">
            For the friend who accidentally became the adult in charge of making the plan.
          </p>
          <p className="text-stone-600 mt-4 text-sm">
            Make an account to host your own trip and invite people. Got an invite link?
            Open it to apply to that trip.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}

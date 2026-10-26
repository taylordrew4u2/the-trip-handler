import Link from "next/link";
import { Brand } from "@/components/Brand";
import { HelpClient } from "./HelpClient";

export const metadata = { title: "Help and FAQ | The Trip Handler", description: "How to join or organize a trip, complete your guest form, and understand costs and payments." };

export default function HelpPage() {
  return <div className="min-h-dvh bg-[#faf8f3] text-slate-900">
    <header className="border-b border-slate-200 bg-white"><nav aria-label="Help navigation" className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
      <Link href="/" className="inline-flex min-h-11 min-w-0 items-center" aria-label="The Trip Handler home"><Brand compact /></Link>
      <Link href="/dashboard" className="inline-flex min-h-11 shrink-0 items-center text-sm text-teal-800 underline">Back to the app</Link>
    </nav></header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <h1 className="font-serif text-4xl font-medium tracking-tight text-slate-950">Help and FAQ</h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">Find the next step, understand what a setting does, or get an answer to a common question.</p>
      <HelpClient />
    </main>
  </div>;
}

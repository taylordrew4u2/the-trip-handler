import Link from "next/link";
import { prisma } from "@/lib/db";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "";
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    if (sameYear) {
      const startShort = start.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      return `${startShort} – ${fmt(end)}`;
    }
    return `${fmt(start)} – ${fmt(end)}`;
  }
  return fmt((start ?? end) as Date);
}

export default async function LoginPage() {
  const trip = await prisma.trip.findFirst({
    select: { name: true, destination: true, startDate: true, endDate: true, description: true },
  });

  const dateRange = trip ? formatDateRange(trip.startDate, trip.endDate) : "";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
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

        {trip && (
          <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5 text-center">
            <p className="font-serif text-lg font-medium text-stone-900">{trip.name}</p>
            {trip.destination && (
              <p className="text-sm text-stone-700 mt-1">{trip.destination}</p>
            )}
            {dateRange && (
              <p className="text-xs uppercase tracking-[0.15em] text-stone-500 mt-2">
                {dateRange}
              </p>
            )}
          </div>
        )}

        <LoginForm />

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-stone-600">
            New here?{" "}
            <Link href="/signup" className="text-stone-900 font-medium underline underline-offset-2 decoration-stone-300 hover:decoration-stone-900">
              Apply for camp
            </Link>
          </p>
          <p className="text-xs text-stone-400">
            <Link href="/admin" className="hover:text-stone-700">Admin login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

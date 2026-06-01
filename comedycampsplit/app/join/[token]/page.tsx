import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripByInviteToken } from "@/lib/trip";
import { SignupForm } from "@/app/signup/SignupForm";
import { ApplyButton } from "./ApplyButton";

export const dynamic = "force-dynamic";

function dateLabel(start: Date | null, end: Date | null): string {
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  if (end) return fmt(end);
  return "Dates TBD";
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trip = await getTripByInviteToken(token);

  if (!trip || !trip.isApplicationOpen) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <h1 className="font-serif text-3xl font-medium text-stone-900 mb-3">
            This invite isn&apos;t active.
          </h1>
          <p className="text-stone-600 mb-6 text-sm">
            The link may be wrong, or the trip has stopped accepting applications.
          </p>
          <Link href="/login" className="text-stone-900 font-medium underline underline-offset-2">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const loggedIn = Boolean(userId) && userId !== "admin";

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">You&apos;re invited to</p>
          <h1 className="font-serif text-4xl font-medium text-stone-900 leading-tight">{trip.name}</h1>
          <p className="text-sm text-stone-500 mt-3">
            {[trip.destination, dateLabel(trip.startDate, trip.endDate)].filter(Boolean).join(" · ")}
          </p>
          {trip.description && (
            <p className="text-stone-600 mt-4 text-sm leading-relaxed">{trip.description}</p>
          )}
        </div>

        {loggedIn ? (
          <div className="bg-white rounded-xl border border-stone-200 p-7">
            <ApplyButton token={token} ownTrip={trip.ownerId === userId} />
          </div>
        ) : (
          <SignupForm
            invite={{
              token,
              tripName: trip.name,
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
            }}
          />
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripByInviteToken } from "@/lib/trip";
import { SignupForm } from "@/app/signup/SignupForm";
import { ApplyButton } from "./ApplyButton";
import { AuthShell } from "@/components/AuthShell";

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
      <AuthShell
        eyebrow="Trip invite"
        title="This invite isn't active."
        description="The link may be wrong, or the trip has stopped accepting applications."
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="mb-6 text-sm leading-6 text-slate-600">Sign in to see the trips you&apos;re already part of.</p>
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-700">
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const loggedIn = Boolean(userId) && userId !== "admin";

  return (
    <AuthShell
      eyebrow="You're invited to"
      title={trip.name}
      description={
        <>
          <p className="text-sm font-medium text-indigo-700">
            {[trip.destination, dateLabel(trip.startDate, trip.endDate)].filter(Boolean).join(" · ")}
          </p>
          {trip.description && (
            <p className="text-slate-600 mt-4 text-sm leading-relaxed">{trip.description}</p>
          )}
        </>
      }
    >
        {loggedIn ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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
    </AuthShell>
  );
}

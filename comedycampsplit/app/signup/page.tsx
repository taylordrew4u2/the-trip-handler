import Link from "next/link";
import { getOpenTrips } from "@/lib/trip";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const trips = await getOpenTrips();
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Apply</p>
            <h1 className="font-serif text-4xl font-medium text-stone-900 leading-tight">
              The Trip<br />Handler
            </h1>
          </Link>
          <p className="text-xs text-stone-500 italic mt-3 max-w-xs mx-auto leading-snug">
            For the friend who accidentally became the adult in charge of making the plan.
          </p>
          <p className="text-stone-600 mt-4 text-sm">Tell us about yourself — admin will approve shortly.</p>
        </div>
        <SignupForm
          trips={trips.map((t) => ({
            id: t.id,
            name: t.name,
            destination: t.destination,
            startDate: t.startDate,
            endDate: t.endDate,
          }))}
        />
      </div>
    </div>
  );
}

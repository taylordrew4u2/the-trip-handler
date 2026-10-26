import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { intakeQuestions, defaultIntakeQuestions } from "@/lib/intakeQuestions";
import { IntakeEditor } from "./IntakeEditor";

export const dynamic = "force-dynamic";

export default async function IntakeEditorPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const session = await getServerSession(authOptions);
  const ownerId = (session?.user as { id?: string } | undefined)?.id;
  if (!ownerId) redirect("/login");
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!trip) redirect("/dashboard/my-trips");
  return <div className="min-w-0 space-y-6">
    <Link href={`/dashboard/my-trips/${trip.id}`} className="inline-flex min-h-11 items-center text-sm text-teal-800 underline">← Back to {trip.name}</Link>
    <h1 className="font-serif text-3xl font-medium text-slate-950">Edit guest form questions</h1>
    <p className="max-w-3xl text-sm leading-7 text-slate-600">Your form starts with just name and phone number. Add the questions you want from the list of suggestions, or write your own, and choose how many answer choices each one has. People who already submitted keep the questions and answers from their submission.</p>
    <IntakeEditor tripId={trip.id} initial={intakeQuestions(trip.intakeQuestions)} defaults={defaultIntakeQuestions(trip.disabledSections)} off={trip.disabledSections} deposit={trip.depositAmount} />
  </div>;
}

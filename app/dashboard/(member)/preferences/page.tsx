import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApprovalRequired } from "@/components/ApprovalRequired";
import { isApproved } from "@/lib/approval";
import { PreferencesForm } from "./PreferencesForm";
import { PageNote } from "@/components/PageNote";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!isApproved(sessionUser?.status)) return <ApprovalRequired what="Preferences" />;
  const userId = sessionUser?.id ?? "";
  if (!userId) redirect("/login");

  const existing = await prisma.guestForm.findUnique({ where: { userId } });

  return (
    <div className="max-w-3xl mx-auto">
      <PageNote pageKey="preferences" />
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Trip preferences</p>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Help plan the trip</h1>
        <p className="text-stone-600 mt-3 text-sm leading-relaxed">
          Now that you&apos;re approved, fill this out so we can plan emergency contacts, vans, food,
          and the activity itinerary. <strong>Every field is required</strong> — write &ldquo;N/A&rdquo;
          if something genuinely doesn&apos;t apply. You can come back and update this anytime.
        </p>
      </div>
      <PreferencesForm existing={existing} />
    </div>
  );
}

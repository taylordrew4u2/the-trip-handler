import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardNav } from "@/components/DashboardNav";
import { SignOutLink } from "@/components/SignOutLink";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!sessionUser?.id) redirect("/login");

  // PENDING users with no form must finish the intake first.
  if (sessionUser.status === "PENDING") {
    const form = await prisma.guestForm.findUnique({ where: { userId: sessionUser.id } });
    if (!form) redirect("/dashboard/intake");
  }

  if (sessionUser.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Declined</p>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">Application not approved</h2>
          <p className="text-stone-600">Reach out to the admin for details.</p>
          <div className="mt-6"><SignOutLink /></div>
        </div>
      </div>
    );
  }

  const isPending = sessionUser.status === "PENDING";

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav status={sessionUser.status ?? null} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isPending && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6 text-sm text-amber-900">
            <strong>You&apos;re pending admin approval.</strong> You can browse trip basics here, but
            you won&apos;t see the roster or be able to sign up for contributions, submit anything, or
            pay until you&apos;re approved.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

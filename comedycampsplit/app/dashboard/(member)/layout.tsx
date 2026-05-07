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

  // PENDING users: must complete intake form first; if already submitted,
  // they wait here until admin approval.
  if (sessionUser.status === "PENDING") {
    const form = await prisma.guestForm.findUnique({ where: { userId: sessionUser.id } });
    if (!form) redirect("/dashboard/intake");

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">In review</p>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">Form submitted</h2>
          <p className="text-stone-600 leading-relaxed">
            Thanks — admin has your guest form and will review your application. You&apos;ll get
            an email once you&apos;re approved.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <a
              href="/dashboard/intake"
              className="text-sm text-stone-700 underline underline-offset-2 hover:text-stone-900"
            >
              Edit your form →
            </a>
            <SignOutLink />
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="min-h-screen bg-stone-50">
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

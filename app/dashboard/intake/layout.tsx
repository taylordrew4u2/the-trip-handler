import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { SignOutLink } from "@/components/SignOutLink";

export default async function IntakeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; status?: string } | undefined;
  if (!sessionUser?.id) redirect("/login");

  if (sessionUser.status === "CANCELLED") redirect("/dashboard");

  // Decide nav: APPROVED & beyond get a "back to dashboard" link;
  // PENDING users get a sign-out link only (no nav into the rest of the app).
  let isApproved = sessionUser.status !== "PENDING";

  // Belt-and-suspenders: also count as approved if a guest form was previously
  // submitted and admin has since approved.
  if (!isApproved) {
    const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { status: true } });
    isApproved = user?.status !== "PENDING";
  }

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white pt-safe">
        <div className="max-w-3xl mx-auto gutter h-14 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex items-center min-h-[44px] font-serif text-base sm:text-lg font-medium text-stone-900 truncate">
            The Trip Handler
          </Link>
          {isApproved ? (
            <Link href="/dashboard" className="inline-flex items-center min-h-[44px] px-1 text-sm text-stone-600 hover:text-stone-900 shrink-0 whitespace-nowrap">
              ← Back to dashboard
            </Link>
          ) : (
            <SignOutLink />
          )}
        </div>
      </header>
      <main className="max-w-3xl mx-auto gutter py-6 md:py-10">{children}</main>
    </div>
  );
}

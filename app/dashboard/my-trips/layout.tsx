import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutLink } from "@/components/SignOutLink";

export default async function MyTripsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) redirect("/login");

  return (
    <div className="min-h-dvh bg-stone-50">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 pt-safe">
        <div className="max-w-3xl mx-auto gutter h-14 md:h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="inline-flex items-center min-h-[44px] font-serif text-base md:text-lg font-medium text-stone-900 truncate">
            The Trip Handler
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
            <Link href="/dashboard" className="inline-flex items-center min-h-[44px] px-1 text-stone-600 hover:text-stone-900 whitespace-nowrap">
              Dashboard
            </Link>
            <SignOutLink />
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto gutter py-6 md:py-10">{children}</main>
    </div>
  );
}

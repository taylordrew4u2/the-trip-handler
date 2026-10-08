import { Brand } from "@/components/Brand";
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
    <div className="min-h-dvh bg-[#f6f7fb]">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 pt-safe">
        <div className="max-w-5xl mx-auto gutter h-16 md:h-16 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="inline-flex items-center min-h-[44px] min-w-0">
            <Brand compact />
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
            <Link href="/dashboard" className="inline-flex items-center min-h-[44px] px-1 text-slate-600 hover:text-slate-900 whitespace-nowrap">
              Dashboard
            </Link>
            <SignOutLink />
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto gutter py-8 md:py-12">{children}</main>
    </div>
  );
}

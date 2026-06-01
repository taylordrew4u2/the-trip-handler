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
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="font-serif text-lg font-medium text-stone-900">
            The Trip Handler
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-stone-600 hover:text-stone-900">
              Dashboard
            </Link>
            <SignOutLink />
          </div>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

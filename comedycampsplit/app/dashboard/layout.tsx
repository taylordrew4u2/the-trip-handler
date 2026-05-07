import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; status?: string };
  if (user.role === "ADMIN") redirect("/admin/dashboard");

  if (user.status === "PENDING") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">In review</p>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">Pending approval</h2>
          <p className="text-stone-600">
            Your application is being reviewed. We&apos;ll email you as soon as you&apos;re approved.
          </p>
        </div>
      </div>
    );
  }

  if (user.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-stone-200 p-8 max-w-md text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">Declined</p>
          <h2 className="font-serif text-2xl font-medium text-stone-900 mb-3">Application not approved</h2>
          <p className="text-stone-600">
            Unfortunately your application was not approved. Reach out to the admin for details.
          </p>
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

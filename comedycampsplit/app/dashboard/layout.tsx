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
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-gray-500">
            Your application is being reviewed by the admin. You&apos;ll receive an email once approved!
          </p>
        </div>
      </div>
    );
  }

  if (user.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Declined</h2>
          <p className="text-gray-500">
            Unfortunately your application was not approved. Contact the admin for more info.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50">
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

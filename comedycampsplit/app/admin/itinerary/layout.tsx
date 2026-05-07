import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminItineraryLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-screen bg-stone-100">
      <AdminNav />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role === "ADMIN") redirect("/admin/dashboard");
    else redirect("/dashboard");
  }
  redirect("/login");
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SectionKey } from "@/lib/nav";

/**
 * Send the member home if their trip's owner has turned this section off.
 * Hiding the nav link alone would leave the page reachable by URL.
 */
export async function requireSection(key: SectionKey): Promise<void> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId || userId === "admin") return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { trip: { select: { disabledSections: true } } },
  });
  if (user?.trip?.disabledSections.includes(key)) redirect("/dashboard");
}

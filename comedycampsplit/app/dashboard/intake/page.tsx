import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { IntakeForm } from "./IntakeForm";

export default async function IntakePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || userId === "admin") redirect("/login");

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.guestForm.findUnique({ where: { userId } }),
  ]);

  if (!user) redirect("/login");

  const isPending = user.status === "PENDING";

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">
          {isPending ? "Required before approval" : "Guest form"}
        </p>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Comedy Summer Camp Guest Form</h1>
        <p className="text-stone-600 mt-3 text-sm leading-relaxed">
          {isPending ? (
            <>
              Admin needs this filled out before approving you for the trip. We use it to plan food, sleeping,
              van transportation, group activities, comedy workshops, and social-media content — without
              texting everyone individually 400 times. <strong>Submit this and you&apos;ll be reviewed for approval.</strong>
            </>
          ) : (
            <>
              Fill this out so we can plan food, sleeping arrangements, van transportation, group activities,
              comedy workshops, and social-media content without texting everyone individually 400 times.
            </>
          )}
        </p>
      </div>
      <IntakeForm
        userId={userId}
        defaultEmail={user.email}
        defaultName={user.name}
        defaultPhone={user.phone ?? ""}
        existing={existing}
        isPending={isPending}
      />
    </div>
  );
}

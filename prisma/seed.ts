/**
 * Seed a self-contained demo: one organizer who owns a trip, with a couple
 * of applicants in different states. Idempotent — safe to re-run; it upserts
 * by email / invite token. Prints the demo login and invite link at the end.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";
const INVITE_TOKEN = "demo-invite-token";

async function upsertUser(email: string, name: string, extra: Record<string, unknown> = {}) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, ...extra },
    create: { email, name, password, role: "PARTICIPANT", ...extra },
  });
}

async function main() {
  const organizer = await upsertUser("demo@thetriphandler.app", "Demo Organizer");

  const trip = await prisma.trip.upsert({
    where: { inviteToken: INVITE_TOKEN },
    update: { ownerId: organizer.id },
    create: {
      name: "Demo Cabin Weekend",
      destination: "Lake Tahoe, CA",
      description: "A long-weekend cabin trip — the demo data behind The Trip Handler.",
      inviteToken: INVITE_TOKEN,
      isApplicationOpen: true,
      ownerId: organizer.id,
    },
  });

  // A couple of applicants on the trip, in different review states.
  await upsertUser("alex@example.com", "Alex Approved", { tripId: trip.id, status: "APPROVED" });
  await upsertUser("sam@example.com", "Sam Pending", { tripId: trip.id, status: "PENDING" });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log("Demo data ready.");
  console.log(`  Organizer login:  demo@thetriphandler.app / ${DEMO_PASSWORD}`);
  console.log(`  Applicant login:  alex@example.com / ${DEMO_PASSWORD}`);
  console.log(`  Invite link:      ${appUrl}/join/${INVITE_TOKEN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

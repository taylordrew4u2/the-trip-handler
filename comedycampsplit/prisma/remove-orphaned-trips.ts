/**
 * Maintenance: delete "orphaned" trips — those with no owner (`ownerId` is
 * null). These are the pre-multi-tenant trips that no one can manage in the
 * owner model.
 *
 * Each trip is removed in a transaction: its child records are deleted first
 * (meal slots, days, and beds cascade to their own children at the DB level;
 * contributions, expenses, lodging photos, and the meal-plan phase are
 * removed explicitly), attached members are detached (tripId -> null, so the
 * accounts survive and can host or re-apply), then the trip itself is deleted.
 *
 * Run against the target database, e.g.:
 *   vercel env pull .env.production.local
 *   DATABASE_URL="$(grep '^DATABASE_URL=' .env.production.local | cut -d= -f2-)" \
 *     npm run db:remove-orphaned-trips
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.trip.findMany({
    where: { ownerId: null },
    select: { id: true, name: true, _count: { select: { users: true } } },
  });

  if (orphans.length === 0) {
    console.log("No orphaned (owner-less) trips to remove.");
    return;
  }

  console.log(`Removing ${orphans.length} owner-less trip(s):`);
  for (const t of orphans) {
    console.log(`  - ${t.name} (${t.id}) — detaching ${t._count.users} member(s)`);
  }

  for (const trip of orphans) {
    const tripId = trip.id;
    await prisma.$transaction(async (tx) => {
      const contributions = await tx.contribution.findMany({
        where: { tripId },
        select: { id: true },
      });
      const contributionIds = contributions.map((c) => c.id);
      if (contributionIds.length) {
        await tx.userContribution.deleteMany({ where: { contributionId: { in: contributionIds } } });
      }
      await tx.contribution.deleteMany({ where: { tripId } });
      await tx.expense.deleteMany({ where: { tripId } });
      await tx.lodgingPhoto.deleteMany({ where: { tripId } });
      await tx.mealPlanPhase.deleteMany({ where: { tripId } });
      await tx.mealSlot.deleteMany({ where: { tripId } }); // cascades suggestions/votes/helpers/groceries
      await tx.day.deleteMany({ where: { tripId } }); // cascades itinerary items + comments
      await tx.bed.deleteMany({ where: { tripId } }); // cascades bed assignments + bedmate requests
      await tx.user.updateMany({ where: { tripId }, data: { tripId: null } });
      await tx.trip.delete({ where: { id: tripId } });
    });
    console.log(`  ✓ removed ${trip.name} (${tripId})`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

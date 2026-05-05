import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingTrip = await prisma.trip.findFirst();
  if (!existingTrip) {
    await prisma.trip.create({
      data: {
        name: "Comedy Summer Camp",
        destination: "TBD",
        description: "The funniest trip of the year! Gather your comedy crew for a summer camp experience like no other.",
      },
    });
    console.log("Seeded trip.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingTrip = await prisma.trip.findFirst();
  if (!existingTrip) {
    await prisma.trip.create({
      data: {
        name: "Untitled Trip",
        destination: "TBD",
        description: "Edit me from the admin Trip page.",
      },
    });
    console.log("Seeded trip.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

"use server";

import { prisma } from "@/lib/db";

export async function getRoster(sort: string = "name") {
  const orderBy: Record<string, unknown> =
    sort === "name" ? { name: "asc" } :
    sort === "newest" ? { createdAt: "desc" } :
    sort === "status" ? { status: "asc" } :
    { name: "asc" };

  return await prisma.user.findMany({
    where: {
      status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] },
      role: "PARTICIPANT",
    },
    orderBy,
    include: {
      contributions: {
        include: { contribution: true },
      },
    },
  });
}

export async function searchRoster(query: string) {
  return await prisma.user.findMany({
    where: {
      status: { in: ["APPROVED", "CONFIRMED_PAID", "PENDING_PAYMENT"] },
      role: "PARTICIPANT",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
        { bio: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      contributions: {
        include: { contribution: true },
      },
    },
  });
}

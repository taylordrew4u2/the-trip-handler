import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ON_TRIP = new Set(["PENDING", "APPROVED", "PENDING_PAYMENT", "CONFIRMED_PAID"]);

/**
 * Serve a stored photo or receipt to someone allowed to see it:
 * - avatars: anyone signed in (they're shown on rosters and the board);
 * - lodging photos: the trip's owner and people on the trip;
 * - receipts: the person who uploaded it and the trip's owner.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const viewerId = (session?.user as { id?: string } | undefined)?.id;
  if (!viewerId) return new NextResponse("Sign in to view this file.", { status: 401 });

  const meta = await prisma.storedFile.findUnique({
    where: { id },
    select: { kind: true, uploaderId: true, tripId: true },
  });
  if (!meta) return new NextResponse("Not found", { status: 404 });

  if (!(await canView(viewerId, meta))) return new NextResponse("Not found", { status: 404 });

  const file = await prisma.storedFile.findUnique({ where: { id }, select: { data: true, contentType: true } });
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      // Files never change (a new upload gets a new id), so browsers can keep them.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

async function canView(
  viewerId: string,
  meta: { kind: string; uploaderId: string | null; tripId: string | null },
): Promise<boolean> {
  if (meta.kind === "avatar") return true;
  if (meta.uploaderId === viewerId) return true;
  if (!meta.tripId) return false;

  const trip = await prisma.trip.findUnique({ where: { id: meta.tripId }, select: { ownerId: true } });
  if (trip?.ownerId === viewerId) return true;

  if (meta.kind === "lodging") {
    const viewer = await prisma.user.findUnique({ where: { id: viewerId }, select: { tripId: true, status: true } });
    return viewer?.tripId === meta.tripId && ON_TRIP.has(viewer.status);
  }
  return false;
}

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const tripId = formData.get("tripId") as string;

  if (!file || !tripId) {
    return NextResponse.json({ error: "Missing file or tripId" }, { status: 400 });
  }

  const max = 10 * 1024 * 1024;
  if (file.size > max) {
    return NextResponse.json({ error: "Photo must be 10MB or less" }, { status: 400 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Photo must be an image" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const key = `lodging/${tripId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { url } = await put(key, file, { access: "public" });

  return NextResponse.json({ url });
}

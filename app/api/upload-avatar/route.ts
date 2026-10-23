import { MAX_UPLOAD_BYTES, safeUploadType, saveUpload } from "@/lib/files";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = MAX_UPLOAD_BYTES;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.id === "admin" || user.role === "ADMIN") {
    return NextResponse.json({ error: "Sign in as a participant first." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too big — try a smaller one" }, { status: 400 });
  }
  const type = safeUploadType(file);
  if (!type || !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: "Avatar must be a JPG, PNG, WebP, or GIF" }, { status: 400 });
  }

  try {
    const url = await saveUpload(file, { kind: "avatar", contentType: type, uploaderId: user.id, tripId: null });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}

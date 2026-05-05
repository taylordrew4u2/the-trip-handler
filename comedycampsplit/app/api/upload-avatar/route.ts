import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file || !userId) {
    return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "png";
  const { url } = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    allowOverwrite: true,
  });

  return NextResponse.json({ url });
}

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Vercel API routes cap request bodies at ~4.5MB. To support larger lodging
// photos (we accept up to 10MB) we use Vercel Blob's client-upload pattern:
// the browser POSTs straight to Blob with a one-time token we issue here.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getServerSession(authOptions);
        const role = (session?.user as { role?: string } | undefined)?.role;
        if (role !== "ADMIN") {
          throw new Error("Admin only");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
          maximumSizeInBytes: 10 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // No-op. The client follows up with addLodgingPhoto(tripId, url) to
        // record the upload in the DB.
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

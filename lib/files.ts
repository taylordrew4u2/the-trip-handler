import { prisma } from "@/lib/db";

/**
 * Photos and receipts live in the app's own database — no paid storage
 * service. Files are served back by /api/files/[id], which checks who's asking.
 *
 * The browser shrinks photos before upload (components/compressImage.ts), so
 * stored images are typically a few hundred KB.
 */

export type FileKind = "avatar" | "lodging" | "payment-receipt" | "expense-receipt";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// The stored type comes from this list, never from the uploaded file name, so
// an "image" can't be served back as HTML or SVG.
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

/**
 * The safe content type for an upload, or null if it isn't an allowed image /
 * PDF. Some phones send HEIC photos with no type, so fall back to the extension.
 */
export function safeUploadType(file: File, allowPdf = false): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const declared = file.type === "image/jpg" ? "image/jpeg" : file.type;
  const type = declared ? (ALLOWED.has(declared) ? declared : null) : TYPE_BY_EXT[ext] ?? null;
  if (!type) return null;
  if (type === "application/pdf" && !allowPdf) return null;
  return type;
}

const URL_PREFIX = "/api/files/";

/** Store an upload and return the URL to show it at. */
export async function saveUpload(
  file: File,
  opts: { kind: FileKind; contentType: string; uploaderId: string | null; tripId: string | null },
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File too large");
  const data = Buffer.from(await file.arrayBuffer());
  const row = await prisma.storedFile.create({
    data: {
      kind: opts.kind,
      contentType: opts.contentType,
      size: data.length,
      data,
      uploaderId: opts.uploaderId,
      tripId: opts.tripId,
    },
    select: { id: true },
  });
  return `${URL_PREFIX}${row.id}`;
}

/** Delete a stored upload by its URL. Links to anything else are left alone. */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  if (!url?.startsWith(URL_PREFIX)) return;
  await prisma.storedFile.deleteMany({ where: { id: url.slice(URL_PREFIX.length) } });
}

export function isStoredFileUrl(url: string): boolean {
  return /^\/api\/files\/[a-z0-9]+$/i.test(url);
}

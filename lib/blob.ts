import { put, del } from "@vercel/blob";

// The stored file's type and extension come from this list, never from the
// uploaded file name, so an "image" can't be served back as HTML or SVG.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};
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
  const type = file.type ? (EXT_BY_TYPE[file.type] ? file.type : null) : TYPE_BY_EXT[ext] ?? null;
  if (!type) return null;
  if (type === "application/pdf" && !allowPdf) return null;
  return type === "image/jpg" ? "image/jpeg" : type;
}

async function store(prefix: string, file: File, contentType: string): Promise<string> {
  const { url } = await put(`${prefix}.${EXT_BY_TYPE[contentType]}`, file, {
    access: "public",
    contentType,
    // Unguessable URL, and a new URL each upload so browsers don't show a stale copy.
    addRandomSuffix: true,
  });
  return url;
}

export async function uploadAvatar(file: File, userId: string, contentType: string): Promise<string> {
  return store(`avatars/${userId}`, file, contentType);
}

export async function uploadReceipt(file: File, expenseId: string): Promise<string> {
  const type = safeUploadType(file, true);
  if (!type) throw new Error("Unsupported receipt type");
  return store(`receipts/${expenseId}`, file, type);
}

export async function uploadPaymentReceipt(file: File, paymentId: string): Promise<string> {
  const type = safeUploadType(file, true);
  if (!type) throw new Error("Unsupported receipt type");
  return store(`payment-receipts/${paymentId}`, file, type);
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}

import { put, del } from "@vercel/blob";

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const { url } = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    allowOverwrite: true,
  });
  return url;
}

export async function uploadReceipt(file: File, expenseId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const { url } = await put(`receipts/${expenseId}.${ext}`, file, {
    access: "public",
    allowOverwrite: true,
  });
  return url;
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}

import { prisma } from "@/lib/db";

export async function PageNote({ pageKey }: { pageKey: string }) {
  const note = await prisma.pageNote.findUnique({ where: { pageKey } });
  if (!note?.body?.trim()) return null;
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-900 whitespace-pre-wrap mb-4">
      {note.body}
    </div>
  );
}

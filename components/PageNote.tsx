import { prisma } from "@/lib/db";
import type { PageNoteKey } from "@/lib/pageNotes";

// Keyed to the registry in lib/pageNotes.ts rather than a bare string: a page
// note is looked up by exact key, so a typo would silently render nothing.
export async function PageNote({ pageKey }: { pageKey: PageNoteKey }) {
  const note = await prisma.pageNote.findUnique({ where: { pageKey } });
  if (!note?.body?.trim()) return null;
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-900 whitespace-pre-wrap mb-4">
      {note.body}
    </div>
  );
}

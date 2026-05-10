import { prisma } from "@/lib/db";
import { PAGE_NOTE_KEYS } from "@/lib/pageNotes";
import { PageNoteEditor } from "./PageNoteEditor";

export const dynamic = "force-dynamic";

export default async function AdminPageNotesPage() {
  const notes = await prisma.pageNote.findMany();
  const byKey = Object.fromEntries(notes.map((n) => [n.pageKey, n.body]));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Page notes</h1>
        <p className="text-stone-500 text-sm mt-1">
          Each note shows in an amber banner at the top of the matching member page. Leave blank to remove.
        </p>
      </div>

      <div className="space-y-3">
        {PAGE_NOTE_KEYS.map((p) => (
          <PageNoteEditor key={p.key} pageKey={p.key} label={p.label} initial={byKey[p.key] ?? ""} />
        ))}
      </div>
    </div>
  );
}

import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AdminRosterPage() {
  const users = await prisma.user.findMany({
    where: { role: "PARTICIPANT" },
    orderBy: { name: "asc" },
    include: {
      contributions: { include: { contribution: true } },
    },
  });

  function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  const csv = [
    ["Name", "Email", "Username", "Phone", "Status", "Joined"].map(escapeCSV).join(","),
    ...users.map((u) =>
      [
        u.name,
        u.email,
        u.username ?? "",
        u.phone ?? "",
        u.status,
        u.createdAt.toISOString().split("T")[0],
      ]
        .map(escapeCSV)
        .join(",")
    ),
  ].join("\n");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-medium text-stone-900">Full roster</h1>
          <p className="text-stone-500 text-sm mt-1">{users.length} total participants on file.</p>
        </div>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="roster.csv"
          className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100"
        >
          Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Contributions</th>
              <th className="text-left px-4 py-3 font-medium text-stone-600 text-xs uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-stone-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-stone-900">{user.name}</p>
                    {user.username && <p className="text-xs text-stone-400">@{user.username}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-700">{user.email}</td>
                <td className="px-4 py-3 text-stone-700">{user.phone ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                <td className="px-4 py-3 text-stone-600 text-xs">
                  {user.contributions.map((c) => c.contribution.title).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-stone-500 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-stone-400 py-8">No users yet.</p>
        )}
      </div>
    </div>
  );
}

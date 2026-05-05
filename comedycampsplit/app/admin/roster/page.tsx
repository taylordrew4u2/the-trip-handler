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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 Full Roster</h1>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="roster.csv"
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
        >
          ↓ Export CSV
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Contributions</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    {user.username && <p className="text-xs text-gray-400">@{user.username}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-gray-600">{user.phone ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {user.contributions.map((c) => c.contribution.title).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-center text-gray-400 py-8">No users yet.</p>
        )}
      </div>
    </div>
  );
}

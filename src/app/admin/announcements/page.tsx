import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { listAnnouncements } from "@/lib/services/announcements";
import { DashboardShell } from "@/components/DashboardShell";
import { AnnouncementForm } from "./AnnouncementForm";

export default async function AnnouncementsPage() {
  await requireRole([Role.ADMIN]);
  const estate = await getEstate();
  const announcements = await listAnnouncements();

  return (
    <DashboardShell estateName={estate?.name ?? ""} role="ADMIN">
      <h1 className="text-2xl font-semibold text-slate-900">Announcements</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Posted here, everyone sees it as a banner next time they open the app, and it&apos;s pushed
        as a notification to anyone who&apos;s enabled them on their device.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Post an announcement</h2>
        <div className="mt-3">
          <AnnouncementForm />
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Message</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">
                Posted by
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 whitespace-nowrap">
                Posted
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {announcements.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 text-slate-900">{a.message}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {a.postedBy.name ?? a.postedBy.email}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {a.postedAt.toLocaleString()}
                </td>
              </tr>
            ))}
            {announcements.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}

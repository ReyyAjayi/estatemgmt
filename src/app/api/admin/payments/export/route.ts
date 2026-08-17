import { getSession } from "@/lib/session";
import { Role } from "@/generated/prisma/enums";
import type { DueStatus } from "@/generated/prisma/enums";
import { getEstate } from "@/lib/estate";
import { ensureDuesForYear, listDuesForViewer } from "@/lib/services/dues";
import { describePromiseStatus } from "@/lib/promise-status";
import { DUE_STATUS_DISPLAY } from "@/lib/due-status";
import { buildCsv } from "@/lib/csv";

// CSV export of the same filtered table shown on /admin/payments — the
// "filterable dashboard table + CSV export" reporting requirement from
// docs/phase-0-discovery.md §2.11. Admin-only, same authorization as the
// dashboard itself (no Landlord/Tenant/Security equivalent in this phase).
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.role !== Role.ADMIN) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const sp = url.searchParams;
  const currentYear = new Date().getFullYear();
  const year = sp.get("year") ? Number(sp.get("year")) : currentYear;
  const houseId = sp.get("houseId") || undefined;
  const landlordId = sp.get("landlordId") || undefined;
  const livingSpaceTypeId = sp.get("livingSpaceTypeId") || undefined;
  const status = (sp.get("status") || undefined) as DueStatus | undefined;

  const estate = await getEstate();
  if (estate) {
    await ensureDuesForYear(estate.id, year);
  }

  const dues = await listDuesForViewer(session, year, {
    houseId,
    landlordId,
    livingSpaceTypeId,
    status,
  });

  const rows = dues.map((due) => {
    const promise = describePromiseStatus(due);
    return [
      due.tenant.house.houseNumber,
      due.tenant.fullName,
      due.tenant.house.landlord.fullName,
      due.tenant.livingSpaceType.name,
      (due.amount / 100).toFixed(2),
      DUE_STATUS_DISPLAY[due.status].label,
      promise ? promise.label : "",
      due.year,
    ];
  });

  const csv = buildCsv(
    ["House", "Tenant", "Landlord", "Space type", "Amount (NGN)", "Status", "Promise", "Year"],
    rows
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${year}.csv"`,
    },
  });
}

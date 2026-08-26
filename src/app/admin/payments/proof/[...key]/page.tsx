import { requireRole } from "@/lib/auth-guard";
import { Role } from "@/generated/prisma/enums";
import { BackButton } from "@/components/BackButton";

// A real in-app page for viewing proof-of-payment, rather than linking
// straight to /api/proofs/[...key] (a bare file response with no page
// chrome). Landing on that raw response left no in-app way back except
// the hardware/gesture back button -- which, on an installed PWA, closes
// the app entirely once it pops past the one history entry the direct
// link created. Routing through here keeps the viewer inside the app's
// own navigation stack and gives it an explicit Back button.
//
// Deliberately skips DashboardShell: this is a quick look-and-return
// flow, not a page anyone navigates deeper from, and the shell's nav +
// announcement banner cost a few extra DB round-trips (estate lookup,
// latest-announcement lookup) before the proof image's own request even
// starts. requireRole's own session-status check is the one DB call that
// can't be skipped -- it's the actual auth gate.
export default async function ProofOfPaymentPage({
  params,
}: {
  params: Promise<{ key: string[] }>;
}) {
  await requireRole([Role.ADMIN]);
  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  const fileUrl = `/api/proofs/${key}`;
  const isPdf = key.toLowerCase().endsWith(".pdf");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton />
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-sm text-slate-700 underline">
          Open in new tab
        </a>
      </div>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Proof of payment</h1>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isPdf ? (
          <iframe src={fileUrl} title="Proof of payment" className="h-[80vh] w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- authenticated, dynamically-sized uploaded file, not an optimizable static asset
          <img src={fileUrl} alt="Proof of payment" className="max-h-[80vh] w-full bg-slate-50 object-contain" />
        )}
      </div>
    </div>
  );
}

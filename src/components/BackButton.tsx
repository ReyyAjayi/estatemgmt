"use client";

import { useRouter } from "next/navigation";

// router.back() rather than a fixed href: this button exists specifically
// so a viewer page (e.g. proof-of-payment) has an in-app way back that
// doesn't depend on the hardware/gesture back button -- on an installed
// PWA, hitting hardware back on a page with no prior in-app history entry
// closes the app instead of navigating, since there's nothing left in the
// stack to pop to.
export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
    >
      <span aria-hidden>←</span> {label}
    </button>
  );
}

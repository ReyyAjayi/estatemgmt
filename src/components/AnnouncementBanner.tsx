"use client";

import { useEffect, useState } from "react";

// Dismissal is per-viewer, tracked client-side only (which announcement id
// they last dismissed) -- no server-side read-tracking. Simple on purpose:
// re-seeing an old announcement once (e.g. on a new device) is harmless,
// and it avoids a whole per-user "read" table for a broadcast feature.
export function AnnouncementBanner({
  announcement,
}: {
  announcement: { id: string; message: string; postedAt: string } | null;
}) {
  const [dismissed, setDismissed] = useState(true); // start hidden until we've checked storage

  useEffect(() => {
    if (!announcement) return;
    (async () => {
      try {
        const lastDismissedId = window.localStorage.getItem("estatemgmt:lastDismissedAnnouncementId");
        setDismissed(lastDismissedId === announcement.id);
      } catch {
        setDismissed(false);
      }
    })();
  }, [announcement]);

  if (!announcement || dismissed) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">Announcement:</span> {announcement.message}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem("estatemgmt:lastDismissedAnnouncementId", announcement.id);
            } catch {
              // ignore -- storage may be unavailable (private mode, blocked, etc.)
            }
            setDismissed(true);
          }}
          aria-label="Dismiss announcement"
          className="shrink-0 text-amber-700 hover:text-amber-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

// applicationServerKey needs raw bytes, not the base64url string the VAPID
// tooling gives us.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

type Status = "checking" | "hidden" | "offer" | "subscribing" | "done" | "error";

export function PushSubscribePrompt() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    (async () => {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("hidden");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("hidden");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "hidden" : "offer");
      } catch {
        setStatus("hidden");
      }
    })();
  }, []);

  async function enable() {
    setStatus("subscribing");
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("error");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("hidden");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "offer" || status === "subscribing" || status === "error") {
    return (
      <div className="border-b border-slate-200 bg-slate-100 px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-700">
            {status === "error"
              ? "Couldn't enable notifications on this device."
              : "Get notified about estate announcements on this device."}
          </p>
          <button
            type="button"
            onClick={enable}
            disabled={status === "subscribing"}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {status === "subscribing" ? "Enabling…" : status === "error" ? "Try again" : "Enable"}
          </button>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900 sm:px-6">
        Notifications enabled on this device.
      </div>
    );
  }

  return null;
}

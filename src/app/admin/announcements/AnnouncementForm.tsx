"use client";

import { useActionState } from "react";
import { postAnnouncementAction, type PostAnnouncementState } from "./actions";

const initialState: PostAnnouncementState = { error: null };

export function AnnouncementForm() {
  const [state, formAction, pending] = useActionState(postAnnouncementAction, initialState);

  return (
    <div>
      <form action={formAction} className="max-w-lg space-y-3">
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-slate-700">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={3}
            required
            maxLength={500}
            placeholder="e.g. Estate meeting this Saturday at 10am, community hall."
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post announcement"}
        </button>
      </form>

      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.posted && (
        <p className="mt-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Posted. Everyone will see it next time they open the app.
          {state.posted.pushError ? (
            <span className="mt-1 block text-amber-800">Push notifications: {state.posted.pushError}</span>
          ) : (
            <span className="mt-1 block">
              Push notifications sent to {state.posted.sent} device
              {state.posted.sent === 1 ? "" : "s"}
              {state.posted.failed > 0 ? ` (${state.posted.failed} failed)` : ""}.
            </span>
          )}
        </p>
      )}
    </div>
  );
}

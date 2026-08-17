"use client";

import { useActionState } from "react";
import { updateEstateSettingsAction, type SettingsState } from "./actions";

const initialState: SettingsState = { error: null };

export function SettingsForm({
  currentChairmanName,
  hasSignature,
}: {
  currentChairmanName: string;
  hasSignature: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateEstateSettingsAction, initialState);

  return (
    <form action={formAction} className="max-w-md space-y-5">
      <div>
        <label htmlFor="chairmanName" className="block text-sm font-medium text-slate-700">
          Chairman name
        </label>
        <input
          id="chairmanName"
          name="chairmanName"
          type="text"
          defaultValue={currentChairmanName}
          placeholder="e.g. Chief Ade Bello"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">Printed on every certificate.</p>
      </div>

      <div>
        <label htmlFor="signature" className="block text-sm font-medium text-slate-700">
          Chairman signature
        </label>
        {hasSignature && (
          <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/estate/signature" alt="Chairman signature" className="h-16" />
          </div>
        )}
        <input
          id="signature"
          name="signature"
          type="file"
          accept="image/jpeg,image/png"
          className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="mt-1 text-xs text-slate-500">
          JPG or PNG, up to 5MB. {hasSignature ? "Upload a new file to replace it." : "Optional — certificates work without one."}
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

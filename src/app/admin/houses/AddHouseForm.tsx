"use client";

import { useActionState } from "react";
import { createHouseAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function AddHouseForm({
  landlords,
}: {
  landlords: { id: string; fullName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createHouseAction, initialState);

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="houseNumber" className="block text-sm font-medium text-slate-700">
            House number
          </label>
          <input
            id="houseNumber"
            name="houseNumber"
            type="text"
            required
            placeholder="e.g. A01"
            className="mt-1 block w-32 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label htmlFor="landlordId" className="block text-sm font-medium text-slate-700">
            Landlord
          </label>
          <select
            id="landlordId"
            name="landlordId"
            required
            defaultValue=""
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Select a landlord
            </option>
            {landlords.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.fullName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending || landlords.length === 0}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add house"}
        </button>
      </form>

      {landlords.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">Add a landlord first before adding houses.</p>
      )}
      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.houseCode && (
        <p className="mt-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          House added. House Code: <span className="font-mono">{state.houseCode}</span> — share
          this with the landlord.
        </p>
      )}
    </div>
  );
}

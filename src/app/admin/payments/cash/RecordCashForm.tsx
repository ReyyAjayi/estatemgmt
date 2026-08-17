"use client";

import { useActionState, useState } from "react";
import { formatNaira } from "@/lib/currency";
import { recordCashPaymentAction, type RecordCashState } from "./actions";

const initialState: RecordCashState = { error: null };

type EligibleDue = {
  id: string;
  houseNumber: string;
  tenantName: string;
  amount: number;
};

export function RecordCashForm({ dues }: { dues: EligibleDue[] }) {
  const [state, formAction, pending] = useActionState(recordCashPaymentAction, initialState);
  const [selectedId, setSelectedId] = useState(dues[0]?.id ?? "");
  const selected = dues.find((d) => d.id === selectedId);

  if (dues.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No tenants currently need a cash payment recorded — everyone is either paid or awaiting
        bank-transfer review.
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Cash payment recorded. That due is now marked paid.
      </p>
    );
  }

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor="tenantDueId" className="block text-sm font-medium text-slate-700">
          Tenant
        </label>
        <select
          id="tenantDueId"
          name="tenantDueId"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {dues.map((due) => (
            <option key={due.id} value={due.id}>
              {due.houseNumber} — {due.tenantName}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md bg-slate-50 px-4 py-3">
        <p className="text-xs font-medium text-slate-500">Amount to confirm</p>
        <p className="text-2xl font-semibold text-slate-900">
          {selected ? formatNaira(selected.amount) : "—"}
        </p>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. received at estate office"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Recording…" : "Record cash payment — mark as paid"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateFee, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function FeeEditForm({
  livingSpaceTypeId,
  year,
  currentAmountNaira,
}: {
  livingSpaceTypeId: string;
  year: number;
  currentAmountNaira: number | null;
}) {
  const [state, formAction, pending] = useActionState(updateFee, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="livingSpaceTypeId" value={livingSpaceTypeId} />
      <input type="hidden" name="year" value={year} />
      <span className="text-sm text-slate-500">₦</span>
      <input
        name="amount"
        type="number"
        min="1"
        step="1"
        required
        defaultValue={currentAmountNaira ?? ""}
        placeholder="Not set"
        className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

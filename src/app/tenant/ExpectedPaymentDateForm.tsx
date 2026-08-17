"use client";

import { useActionState } from "react";
import { setExpectedPaymentDateAction, type PromiseState } from "./actions";

const initialState: PromiseState = { error: null };

export function ExpectedPaymentDateForm({ currentDate }: { currentDate: string | null }) {
  const [state, formAction, pending] = useActionState(setExpectedPaymentDateAction, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="expectedPaymentDate" className="block text-xs font-medium text-slate-700">
          When do you expect to pay?
        </label>
        <input
          id="expectedPaymentDate"
          name="expectedPaymentDate"
          type="date"
          defaultValue={currentDate ?? ""}
          className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="w-full text-xs text-red-700">{state.error}</p>}
      {state.success && <p className="w-full text-xs text-emerald-700">Saved.</p>}
    </form>
  );
}

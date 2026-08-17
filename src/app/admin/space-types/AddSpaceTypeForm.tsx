"use client";

import { useActionState } from "react";
import { createSpaceType, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function AddSpaceTypeForm({ year }: { year: number }) {
  const [state, formAction, pending] = useActionState(createSpaceType, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Living space type
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. 1 Bedroom"
          className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label htmlFor="year" className="block text-sm font-medium text-slate-700">
          Year
        </label>
        <input
          id="year"
          name="year"
          type="number"
          required
          defaultValue={year}
          className="mt-1 block w-24 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
          Fee (₦)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="1"
          step="1"
          required
          placeholder="20000"
          className="mt-1 block w-32 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <p className="w-full text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

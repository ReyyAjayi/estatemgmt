"use client";

import { useActionState } from "react";
import { submitPaymentAction, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function SubmitPaymentForm() {
  const [state, formAction, pending] = useActionState(submitPaymentAction, initialState);

  if (state.success) {
    return (
      <p className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Submitted. Your payment status will change once it&apos;s reviewed.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="referenceNumber" className="block text-sm font-medium text-slate-700">
          Payment reference (optional)
        </label>
        <input
          id="referenceNumber"
          name="referenceNumber"
          type="text"
          placeholder="e.g. bank transfer reference"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label htmlFor="proof" className="block text-sm font-medium text-slate-700">
          Proof of payment
        </label>
        <input
          id="proof"
          name="proof"
          type="file"
          required
          accept="image/jpeg,image/png,application/pdf"
          className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="mt-1 text-xs text-slate-500">JPG, PNG or PDF, up to 5MB.</p>
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
        {pending ? "Submitting…" : "Submit payment"}
      </button>
    </form>
  );
}

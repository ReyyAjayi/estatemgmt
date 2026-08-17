"use client";

import { useActionState, useState } from "react";
import { validatePaymentAction, rejectPaymentAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function PaymentRowActions({ paymentId }: { paymentId: string }) {
  const [validateState, validateAction, validatePending] = useActionState(
    validatePaymentAction,
    initialState
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectPaymentAction,
    initialState
  );
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <form action={validateAction}>
          <input type="hidden" name="paymentId" value={paymentId} />
          <button
            type="submit"
            disabled={validatePending || rejectPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {validatePending ? "Validating…" : "Validate"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setShowReject((v) => !v)}
          disabled={validatePending || rejectPending}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Reject
        </button>
      </div>

      {showReject && (
        <form action={rejectAction} className="space-y-2">
          <input type="hidden" name="paymentId" value={paymentId} />
          <textarea
            name="notes"
            required
            rows={2}
            placeholder="Reason for rejection (shown to the tenant)"
            className="block w-56 rounded-md border border-slate-300 px-2 py-1.5 text-xs shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            disabled={rejectPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {rejectPending ? "Rejecting…" : "Confirm reject"}
          </button>
        </form>
      )}

      {validateState.error && <p className="text-xs text-red-700">{validateState.error}</p>}
      {rejectState.error && <p className="text-xs text-red-700">{rejectState.error}</p>}
    </div>
  );
}

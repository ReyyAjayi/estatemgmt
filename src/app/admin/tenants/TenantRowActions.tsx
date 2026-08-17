"use client";

import { useActionState } from "react";
import {
  deactivateTenantAction,
  dismissRequestAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { error: null };

export function TenantRowActions({
  tenantId,
  status,
  deactivationRequested,
}: {
  tenantId: string;
  status: string;
  deactivationRequested: boolean;
}) {
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateTenantAction,
    initialState
  );
  const [dismissState, dismissAction, dismissPending] = useActionState(
    dismissRequestAction,
    initialState
  );

  if (status !== "active") {
    return <span className="text-xs text-slate-400">Inactive</span>;
  }

  return (
    <div className="space-y-1">
      {deactivationRequested && (
        <p className="text-xs font-medium text-amber-700">Deactivation requested by landlord</p>
      )}
      <div className="flex gap-2">
        <form action={deactivateAction}>
          <input type="hidden" name="tenantId" value={tenantId} />
          <button
            type="submit"
            disabled={deactivatePending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {deactivatePending ? "Deactivating…" : "Deactivate"}
          </button>
        </form>
        {deactivationRequested && (
          <form action={dismissAction}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <button
              type="submit"
              disabled={dismissPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {dismissPending ? "Dismissing…" : "Dismiss request"}
            </button>
          </form>
        )}
      </div>
      {deactivateState.error && <p className="text-xs text-red-700">{deactivateState.error}</p>}
      {dismissState.error && <p className="text-xs text-red-700">{dismissState.error}</p>}
    </div>
  );
}

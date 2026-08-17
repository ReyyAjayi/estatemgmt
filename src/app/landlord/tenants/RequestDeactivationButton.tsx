"use client";

import { useActionState } from "react";
import { requestDeactivationAction, type ActionState } from "./actions";

const initialState: ActionState = { error: null };

export function RequestDeactivationButton({
  tenantId,
  status,
  deactivationRequested,
}: {
  tenantId: string;
  status: string;
  deactivationRequested: boolean;
}) {
  const [state, formAction, pending] = useActionState(requestDeactivationAction, initialState);

  if (status !== "active") {
    return <span className="text-xs text-slate-400">Inactive</span>;
  }
  if (deactivationRequested) {
    return <span className="text-xs font-medium text-amber-700">Deactivation requested</span>;
  }

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="tenantId" value={tenantId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Requesting…" : "Request deactivation"}
        </button>
      </form>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
    </div>
  );
}

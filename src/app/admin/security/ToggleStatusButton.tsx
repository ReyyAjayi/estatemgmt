"use client";

import { useActionState } from "react";
import { toggleSecurityStatusAction, type ToggleStatusState } from "./actions";

const initialState: ToggleStatusState = { error: null };

export function ToggleStatusButton({
  securityId,
  status,
}: {
  securityId: string;
  status: string;
}) {
  const [state, formAction, pending] = useActionState(toggleSecurityStatusAction, initialState);
  const isActive = status === "active";

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="securityId" value={securityId} />
        <input type="hidden" name="nextStatus" value={isActive ? "inactive" : "active"} />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
            isActive
              ? "border-red-300 text-red-700 hover:bg-red-50"
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {pending ? "Saving…" : isActive ? "Deactivate" : "Reactivate"}
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
    </div>
  );
}

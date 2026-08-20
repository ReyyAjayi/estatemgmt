"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { error: null };

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Resetting…" : "Reset password"}
        </button>
      </form>
      {state.tempPassword && (
        <p className="mt-1 text-xs text-emerald-700">
          New password: <span className="font-mono">{state.tempPassword}</span>
        </p>
      )}
      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
    </div>
  );
}

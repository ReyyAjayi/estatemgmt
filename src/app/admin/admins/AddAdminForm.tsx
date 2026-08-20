"use client";

import { useActionState } from "react";
import { createAdminAction, type CreateAdminState } from "./actions";

const initialState: CreateAdminState = { error: null };

export function AddAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add admin"}
        </button>
      </form>

      {state.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}

      {state.created && (
        <div className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">{state.created.fullName} was added.</p>
          <p className="mt-1">
            Share these sign-in details with them directly (they won&apos;t be shown again):
          </p>
          <p className="mt-1">
            Email: <span className="font-mono">{state.created.email}</span>
            <br />
            Temporary password: <span className="font-mono">{state.created.tempPassword}</span>
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { setupEstate, type SetupState } from "./actions";

const initialState: SetupState = { error: null };

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupEstate, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="estateName" className="block text-sm font-medium text-slate-700">
          Estate name
        </label>
        <input
          id="estateName"
          name="estateName"
          type="text"
          required
          placeholder="e.g. Greenfield Estate"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label htmlFor="adminName" className="block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input
          id="adminName"
          name="adminName"
          type="text"
          required
          placeholder="e.g. Ada Okafor"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label htmlFor="adminEmail" className="block text-sm font-medium text-slate-700">
          Your email
        </label>
        <input
          id="adminEmail"
          name="adminEmail"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
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
        {pending ? "Setting up…" : "Create my estate"}
      </button>
    </form>
  );
}

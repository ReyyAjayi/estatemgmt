"use client";

import { useActionState, useState } from "react";
import { staffLogin, tenantLogin, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [tab, setTab] = useState<"staff" | "tenant">("tenant");

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab("tenant")}
          className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${
            tab === "tenant" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Tenant
        </button>
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`rounded-md px-3 py-2.5 text-sm font-semibold transition ${
            tab === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Admin / Landlord / Security
        </button>
      </div>

      {tab === "tenant" ? <TenantLoginForm /> : <StaffLoginForm />}
    </div>
  );
}

function TenantLoginForm() {
  const [state, formAction, pending] = useActionState(tenantLogin, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="houseCode" className="block text-sm font-medium text-slate-700">
          House Code
        </label>
        <input
          id="houseCode"
          name="houseCode"
          type="text"
          required
          autoCapitalize="characters"
          placeholder="e.g. 7KX2P9QM"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base uppercase tracking-wider shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>
      <div>
        <label htmlFor="tenantCode" className="block text-sm font-medium text-slate-700">
          Tenant Code
        </label>
        <input
          id="tenantCode"
          name="tenantCode"
          type="text"
          required
          autoCapitalize="characters"
          placeholder="e.g. B4RT7WXN"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 text-base uppercase tracking-wider shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Both codes were given to you by your landlord.
        </p>
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function StaffLoginForm() {
  const [state, formAction, pending] = useActionState(staffLogin, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
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
          autoComplete="current-password"
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

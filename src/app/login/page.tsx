import { redirect } from "next/navigation";
import { getEstate } from "@/lib/estate";
import { getSession } from "@/lib/session";
import { roleHome, isSessionSubjectActive } from "@/lib/auth-guard";
import { LoginForm } from "./LoginForm";

// Must stay dynamic: see src/app/page.tsx for why (estate/session checks
// here are conditionally skipped, which would let Next statically cache a
// stale build-time result otherwise).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const estate = await getEstate();
  if (!estate) {
    redirect("/setup");
  }

  // A deactivated account's cookie still verifies cryptographically (see
  // auth-guard.ts) -- without re-checking DB status here too, this page
  // would bounce them straight to roleHome, which requireRole would just
  // redirect back to /login from, looping forever.
  const session = await getSession();
  if (session && (await isSessionSubjectActive(session))) {
    redirect(roleHome(session.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">{estate.name}</h1>
        <p className="mt-1 text-sm text-slate-600">Sign in to continue.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

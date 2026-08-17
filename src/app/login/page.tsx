import { redirect } from "next/navigation";
import { getEstate } from "@/lib/estate";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/auth-guard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const estate = await getEstate();
  if (!estate) {
    redirect("/setup");
  }

  const session = await getSession();
  if (session) {
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

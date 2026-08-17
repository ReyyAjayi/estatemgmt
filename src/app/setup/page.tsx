import { redirect } from "next/navigation";
import { getEstate } from "@/lib/estate";
import { SetupForm } from "./SetupForm";

export default async function SetupPage() {
  const estate = await getEstate();
  if (estate) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold text-slate-900">Set up your estate</h1>
        <p className="mt-1 text-sm text-slate-600">
          This one-time step creates your estate and your Admin account. You&apos;ll be
          able to add landlords and tenants afterward.
        </p>
        <div className="mt-6">
          <SetupForm />
        </div>
      </div>
    </main>
  );
}

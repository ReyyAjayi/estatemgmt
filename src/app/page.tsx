import { redirect } from "next/navigation";
import { getEstate } from "@/lib/estate";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/auth-guard";

// Must stay dynamic: the estate-existence check below can be satisfied
// after the build (first deploy has no estate yet), and the session check
// is skipped entirely on that branch, so static optimization would bake in
// a stale build-time redirect otherwise.
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const estate = await getEstate();
  if (!estate) {
    redirect("/setup");
  }

  const session = await getSession();
  redirect(session ? roleHome(session.role) : "/login");
}

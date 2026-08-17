import { redirect } from "next/navigation";
import { getEstate } from "@/lib/estate";
import { getSession } from "@/lib/session";
import { roleHome } from "@/lib/auth-guard";

export default async function RootPage() {
  const estate = await getEstate();
  if (!estate) {
    redirect("/setup");
  }

  const session = await getSession();
  redirect(session ? roleHome(session.role) : "/login");
}

import "server-only";
import { prisma } from "@/lib/prisma";

// Single-estate MVP: there is at most one Estate row. Its mere existence is
// the entire access check for the one-time "set up your estate" flow.
export function getEstate() {
  return prisma.estate.findFirst();
}

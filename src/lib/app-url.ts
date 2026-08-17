import "server-only";
import { headers } from "next/headers";

// The QR code embedded in a certificate needs an absolute URL. Reading it
// from request headers means this works unmodified across local dev and
// wherever this gets deployed, without a separate APP_URL setting to keep
// in sync.
export async function getAppOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

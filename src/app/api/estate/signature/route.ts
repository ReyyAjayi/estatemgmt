import { getSession } from "@/lib/session";
import { getEstate } from "@/lib/estate";
import { readSignatureFile, signatureContentType } from "@/lib/storage";

// The chairman's signature isn't tenant-private data — it's meant to appear
// on documents every role can already see (certificates). Gated only to
// "must be logged in," same threshold as the estate name shown in every
// dashboard header.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const estate = await getEstate();
  if (!estate?.chairmanSignatureUrl) {
    return new Response("Not found", { status: 404 });
  }

  const buffer = await readSignatureFile(estate.chairmanSignatureUrl);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": signatureContentType(estate.chairmanSignatureUrl) },
  });
}

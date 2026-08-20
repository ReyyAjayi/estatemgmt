import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Proof-of-payment and signature uploads go through Server Actions
      // (submitPaymentAction etc.), which Next.js caps at 1MB by default --
      // well under the 5MB limit the upload forms themselves advertise
      // (see MAX_FILE_BYTES in storage.ts). A ~1.1MB file was silently
      // rejected by this default, not the app's own validation. Set above
      // 5MB to leave headroom for multipart/form-data framing overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

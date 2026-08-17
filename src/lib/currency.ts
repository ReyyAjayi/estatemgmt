// Amounts are stored in kobo (the smallest NGN unit) throughout the app —
// see prisma/schema.prisma Fee.amount. This is the only place that formats
// or converts between kobo and the naira figure a human types into a form.

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

// react-pdf's built-in fonts (Helvetica etc.) don't include a ₦ glyph, so
// formatNaira()'s output renders as a broken character on the certificate
// PDF. Used only there — every screen in the app uses formatNaira() as
// normal, since browsers render ₦ fine.
export function formatNairaAscii(kobo: number): string {
  return `NGN ${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(kobo / 100)}`;
}

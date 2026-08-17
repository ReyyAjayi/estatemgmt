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

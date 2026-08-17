import Link from "next/link";

export function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{label}</p>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition hover:border-slate-300 hover:shadow-sm">
      {content}
    </Link>
  );
}

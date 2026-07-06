import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-2xl font-medium text-text-hi">Not found</p>
        <p className="max-w-sm text-sm text-text-lo">
          That page or instrument doesn’t exist. It may have moved, or the symbol isn’t listed.
        </p>
        <Link href="/" className="mt-1 rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink-900 hover:opacity-90">
          Back to market
        </Link>
      </div>
    </main>
  );
}

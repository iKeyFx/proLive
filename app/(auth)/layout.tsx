import { Wordmark } from "@/components/brand/Wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-start gap-3">
          <Wordmark />
          <p className="text-sm text-text-lo">
            A precision trading desk. Simulated money, real-money correctness.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-ink-800 p-6">{children}</div>
        <p className="mt-6 text-xs text-text-lo">
          No real money is involved. The only data stored is your email.
        </p>
      </div>
    </main>
  );
}

"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <p className="font-display text-xl font-medium text-text-hi">Something broke on this screen</p>
        <p className="max-w-md text-sm text-text-lo">
          The page hit an unexpected error. Your data is safe — nothing was changed. Try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-1 rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink-900 hover:opacity-90"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

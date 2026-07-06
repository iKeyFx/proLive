/**
 * Wordmark — a small engraved-gauge mark + "ProLive" set in the display face.
 * The mark is a precision tick-ring: a circle with graduated ticks, echoing an
 * instrument dial rather than a generic logo.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="9" stroke="var(--signal)" strokeWidth="1.25" />
        <line x1="11" y1="2.5" x2="11" y2="5" stroke="var(--signal)" strokeWidth="1.25" />
        <line x1="11" y1="17" x2="11" y2="19.5" stroke="var(--text-lo)" strokeWidth="1.25" />
        <line x1="2.5" y1="11" x2="5" y2="11" stroke="var(--text-lo)" strokeWidth="1.25" />
        <line x1="17" y1="11" x2="19.5" y2="11" stroke="var(--text-lo)" strokeWidth="1.25" />
        <line x1="11" y1="11" x2="14.5" y2="7.5" stroke="var(--text-hi)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11" cy="11" r="1.4" fill="var(--signal)" />
      </svg>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight text-text-hi">
          Pro<span className="text-text-lo">Live</span>
        </span>
      )}
    </span>
  );
}

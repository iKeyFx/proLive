import { Rail } from "@/components/shell/Rail";
import { StatusStrip } from "@/components/shell/StatusStrip";
import { FeaturedTape } from "@/components/market/FeaturedTape";

/**
 * The persistent instrument-panel shell: compact left rail, a top status strip,
 * the live featured tape, then the content grid. Content sits in a max-width
 * column so dense data stays readable on ultra-wide screens.
 */
export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-16">
      <Rail />
      <StatusStrip />
      <FeaturedTape />
      <main className="px-4 pb-24 pt-4 md:px-6 md:pb-8" data-email={email}>
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

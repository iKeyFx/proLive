import { Rail } from "@/components/shell/Rail";
import { StatusStrip } from "@/components/shell/StatusStrip";
import { FeaturedTape } from "@/components/market/FeaturedTape";

/**
 * The persistent instrument-panel shell: compact left rail, top status strip,
 * the live featured tape, then the content grid.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-16">
      <Rail />
      <StatusStrip />
      <FeaturedTape />
      <main className="px-4 pb-24 pt-4 md:px-6 md:pb-8">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}

import { Watchlist } from "@/components/market/Watchlist";

export const metadata = { title: "Market — ProLive" };

export default function MarketPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-lg font-medium">Market</h1>
        <p className="text-sm text-text-lo">Live prices. Pick an instrument to view detail and trade.</p>
      </div>
      <Watchlist />
    </div>
  );
}

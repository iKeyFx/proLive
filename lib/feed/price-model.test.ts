import { describe, it, expect } from "vitest";
import { priceAt, openPrice, sparkSeries, tickAll } from "./price-model";
import { INSTRUMENTS, getInstrument } from "@/lib/instruments";

describe("price model — determinism (client & server must agree)", () => {
  it("is a pure function: same (symbol, t) → same price", () => {
    const t = 1_770_000_000_000;
    for (const inst of INSTRUMENTS) {
      expect(priceAt(inst.symbol, t)).toBe(priceAt(inst.symbol, t));
    }
  });

  it("returns integer kobo above the floor for known symbols", () => {
    const t = Date.now();
    for (const inst of INSTRUMENTS) {
      const p = priceAt(inst.symbol, t);
      expect(Number.isInteger(p)).toBe(true);
      expect(p).toBeGreaterThanOrEqual(100);
    }
  });

  it("returns 0 for unknown symbols", () => {
    expect(priceAt("NOPE", Date.now())).toBe(0);
  });
});

describe("price model — stays in a sane band around the seed", () => {
  it("never drifts more than ~20% from seed across a long horizon", () => {
    for (const inst of INSTRUMENTS) {
      const seed = inst.seedPrice as number;
      // sample across ~6 hours at 30s spacing
      for (let t = 0; t < 6 * 3600_000; t += 30_000) {
        const p = priceAt(inst.symbol, t);
        expect(p).toBeGreaterThan(seed * 0.7);
        expect(p).toBeLessThan(seed * 1.3);
      }
    }
  });
});

describe("price model — actually moves over time", () => {
  it("changes between ticks so the tape is live", () => {
    const now = Date.now();
    let changed = 0;
    for (const inst of INSTRUMENTS) {
      if (priceAt(inst.symbol, now) !== priceAt(inst.symbol, now + 3000)) changed++;
    }
    // at least most symbols move over a 3s gap
    expect(changed).toBeGreaterThan(INSTRUMENTS.length / 2);
  });
});

describe("derived helpers", () => {
  it("openPrice is the model evaluated 24h earlier", () => {
    const now = 1_770_000_000_000;
    const sym = INSTRUMENTS[0]!.symbol;
    expect(openPrice(sym, now)).toBe(priceAt(sym, now - 86_400_000));
  });

  it("sparkSeries returns the requested length, all positive", () => {
    const s = sparkSeries(INSTRUMENTS[0]!.symbol, Date.now(), 48, 1500);
    expect(s).toHaveLength(48);
    expect(s.every((p) => p > 0)).toBe(true);
  });

  it("tickAll covers every instrument", () => {
    const ticks = tickAll(Date.now());
    expect(ticks).toHaveLength(INSTRUMENTS.length);
    expect(getInstrument(ticks[0]!.symbol)).toBeDefined();
  });
});

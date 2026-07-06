import { describe, it, expect } from "vitest";
import {
  kobo,
  qtyMicro,
  divRound,
  tradeCost,
  avgEntry,
  unrealizedPnl,
  applyBuy,
  applySell,
  maxAffordableQty,
  nairaToKobo,
  unitsToMicro,
  formatNaira,
  formatPercent,
  QTY_SCALE,
  type Position,
} from "./index";

describe("divRound — half away from zero", () => {
  it("rounds halves away from zero", () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(-5, 2)).toBe(-3);
    expect(divRound(7, 2)).toBe(4);
    expect(divRound(-7, 2)).toBe(-4);
  });
  it("leaves exact divisions untouched", () => {
    expect(divRound(4, 2)).toBe(2);
    expect(divRound(0, 7)).toBe(0);
  });
  it("rounds just-below-half down", () => {
    expect(divRound(4, 3)).toBe(1); // 1.333
    expect(divRound(5, 3)).toBe(2); // 1.666
  });
  it("throws on zero denominator and non-integers", () => {
    expect(() => divRound(1, 0)).toThrow();
    expect(() => divRound(1.5, 2)).toThrow();
  });
});

describe("constructors reject floats", () => {
  it("kobo() requires integer", () => {
    expect(() => kobo(1.5)).toThrow();
  });
  it("nairaToKobo converts cleanly", () => {
    expect(nairaToKobo(142.3)).toBe(14230);
    expect(nairaToKobo(0.01)).toBe(1);
    expect(nairaToKobo(1000)).toBe(100000);
  });
  it("unitsToMicro converts cleanly", () => {
    expect(unitsToMicro(1)).toBe(QTY_SCALE);
    expect(unitsToMicro(1.5)).toBe(1_500_000);
  });
});

describe("tradeCost rounding", () => {
  it("computes exact whole-unit cost", () => {
    // 10 units @ ₦298.10 = ₦2981.00 = 298100 kobo
    expect(tradeCost(kobo(29810), unitsToMicro(10))).toBe(298100);
  });
  it("rounds fractional-quantity cost half away from zero", () => {
    // 0.333333 units @ 30000 kobo = 9999.99 → rounds to 10000
    const cost = tradeCost(kobo(30000), qtyMicro(333_333));
    expect(cost).toBe(divRound(30000 * 333_333, QTY_SCALE));
  });
});

describe("buy reconciles exactly", () => {
  it("cashDelta === −tradeCost and basis accumulates", () => {
    const start: Position = { qty: qtyMicro(0), costBasis: kobo(0) };
    const r = applyBuy(start, kobo(29810), unitsToMicro(10));
    expect(r.cashDelta).toBe(-298100);
    expect(r.position.qty).toBe(10 * QTY_SCALE);
    expect(r.position.costBasis).toBe(298100);
    // cash delta must equal qty*price exactly
    expect(-r.cashDelta).toBe(tradeCost(kobo(29810), unitsToMicro(10)));
  });

  it("average entry round-trips after two buys", () => {
    let pos: Position = { qty: qtyMicro(0), costBasis: kobo(0) };
    pos = applyBuy(pos, kobo(10000), unitsToMicro(3)).position; // 3 @ 100.00
    pos = applyBuy(pos, kobo(20000), unitsToMicro(1)).position; // 1 @ 200.00
    // basis = 30000 + 20000 = 50000 over 4 units → avg 12500 kobo = ₦125.00
    expect(pos.costBasis).toBe(50000);
    expect(avgEntry(pos.costBasis, pos.qty)).toBe(12500);
  });
});

describe("sell apportions basis and realizes P/L", () => {
  it("partial sell removes proportional basis", () => {
    // hold 4 units, basis 50000 (avg 12500). Sell 2 @ 15000.
    const pos: Position = { qty: unitsToMicro(4), costBasis: kobo(50000) };
    const r = applySell(pos, kobo(15000), unitsToMicro(2));
    expect(r.cashDelta).toBe(30000); // proceeds 2*15000
    // removed basis = 50000 * 2/4 = 25000 ; realized = 30000 - 25000 = 5000
    expect(r.realizedPnl).toBe(5000);
    expect(r.position.qty).toBe(unitsToMicro(2));
    expect(r.position.costBasis).toBe(25000);
  });

  it("full close zeroes basis exactly (no dust left)", () => {
    const pos: Position = { qty: unitsToMicro(3), costBasis: kobo(33337) };
    const r = applySell(pos, kobo(11200), unitsToMicro(3));
    expect(r.position.qty).toBe(0);
    expect(r.position.costBasis).toBe(0);
    expect(r.realizedPnl).toBe(33600 - 33337);
  });

  it("rejects overselling", () => {
    const pos: Position = { qty: unitsToMicro(1), costBasis: kobo(10000) };
    expect(() => applySell(pos, kobo(10000), unitsToMicro(2))).toThrow();
  });
});

describe("unrealized P/L", () => {
  it("is positive when price rises, negative when it falls", () => {
    const pos: Position = { qty: unitsToMicro(10), costBasis: kobo(100000) }; // avg 100.00
    expect(unrealizedPnl(kobo(12000), pos.qty, pos.costBasis)).toBe(20000); // +₦200
    expect(unrealizedPnl(kobo(8000), pos.qty, pos.costBasis)).toBe(-20000); // −₦200
  });
});

describe("buying power / insufficient funds", () => {
  it("maxAffordableQty floors to what cash allows", () => {
    // cash ₦1000.00 = 100000 kobo, price ₦298.10 = 29810 kobo → 3.354.. → floor
    const max = maxAffordableQty(kobo(100000), kobo(29810));
    expect(max).toBe(Math.floor((100000 * QTY_SCALE) / 29810));
    // verify it is genuinely affordable and one more micro is not... at unit scale
    expect(tradeCost(kobo(29810), max)).toBeLessThanOrEqual(100000);
  });
  it("returns 0 when price is non-positive", () => {
    expect(maxAffordableQty(kobo(100000), kobo(0))).toBe(0);
  });
});

describe("formatting (UI edge only)", () => {
  it("formats naira with two decimals", () => {
    expect(formatNaira(kobo(298100))).toContain("2,981.00");
  });
  it("formats percent with sign", () => {
    expect(formatPercent(0.0123)).toBe("+1.23%");
    expect(formatPercent(-0.05)).toBe("−5.00%");
    expect(formatPercent(0)).toBe("0.00%");
  });
});

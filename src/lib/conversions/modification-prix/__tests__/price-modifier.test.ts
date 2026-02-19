import { describe, it, expect } from "vitest";
import {
  applyPriceOperation,
  applyPriceOperationToString,
  applyToPrices,
  recomputePrice,
  PriceOperation,
  PriceRow,
} from "../price-modifier";

// ─── increase-fixed ─────────────────────────────────────────────────────────

describe("applyPriceOperation — increase-fixed", () => {
  const op: PriceOperation = { type: "increase-fixed", amount: 10 };

  it("increases price by fixed amount", () => {
    expect(applyPriceOperation(100, op)).toBe(110);
  });

  it("handles decimal prices", () => {
    expect(applyPriceOperation(99.99, op)).toBe(109.99);
  });

  it("handles zero price", () => {
    expect(applyPriceOperation(0, op)).toBe(10);
  });
});

// ─── decrease-fixed ─────────────────────────────────────────────────────────

describe("applyPriceOperation — decrease-fixed", () => {
  const op: PriceOperation = { type: "decrease-fixed", amount: 10 };

  it("decreases price by fixed amount", () => {
    expect(applyPriceOperation(100, op)).toBe(90);
  });

  it("clamps to 0 when result would be negative", () => {
    expect(applyPriceOperation(5, op)).toBe(0);
  });

  it("clamps to 0 when price equals amount", () => {
    expect(applyPriceOperation(10, op)).toBe(0);
  });
});

// ─── increase-percent ───────────────────────────────────────────────────────

describe("applyPriceOperation — increase-percent", () => {
  const op: PriceOperation = { type: "increase-percent", percent: 21 };

  it("increases price by percentage", () => {
    expect(applyPriceOperation(100, op)).toBe(121);
  });

  it("rounds to 2 decimal places", () => {
    expect(applyPriceOperation(99.99, op)).toBe(120.99);
  });

  it("handles zero price", () => {
    expect(applyPriceOperation(0, op)).toBe(0);
  });

  it("handles small percentages", () => {
    const smallOp: PriceOperation = { type: "increase-percent", percent: 0.5 };
    expect(applyPriceOperation(200, smallOp)).toBe(201);
  });
});

// ─── decrease-percent ───────────────────────────────────────────────────────

describe("applyPriceOperation — decrease-percent", () => {
  const op: PriceOperation = { type: "decrease-percent", percent: 25 };

  it("decreases price by percentage", () => {
    expect(applyPriceOperation(100, op)).toBe(75);
  });

  it("rounds to 2 decimal places", () => {
    expect(applyPriceOperation(33.33, op)).toBe(25);
  });

  it("handles 100% decrease", () => {
    const fullOp: PriceOperation = { type: "decrease-percent", percent: 100 };
    expect(applyPriceOperation(50, fullOp)).toBe(0);
  });
});

// ─── applyPriceOperationToString ────────────────────────────────────────────

describe("applyPriceOperationToString", () => {
  const op: PriceOperation = { type: "increase-fixed", amount: 5 };

  it("applies operation to a valid price string", () => {
    expect(applyPriceOperationToString("100.00", op)).toBe("105.00");
  });

  it("returns empty string for empty input", () => {
    expect(applyPriceOperationToString("", op)).toBe("");
  });

  it("returns original string for non-numeric input", () => {
    expect(applyPriceOperationToString("abc", op)).toBe("abc");
  });

  it("formats result with 2 decimal places", () => {
    expect(applyPriceOperationToString("100", op)).toBe("105.00");
  });
});

// ─── recomputePrice ─────────────────────────────────────────────────────────

describe("recomputePrice", () => {
  it("computes TTC from HT with 21% TVA", () => {
    expect(recomputePrice("100.00", "21.0", "toTTC")).toBe("121.00");
  });

  it("computes HT from TTC with 21% TVA", () => {
    expect(recomputePrice("121.00", "21.0", "toHT")).toBe("100.00");
  });

  it("computes TTC from HT with 6% TVA", () => {
    expect(recomputePrice("100.00", "6.0", "toTTC")).toBe("106.00");
  });

  it("computes HT from TTC with 6% TVA", () => {
    expect(recomputePrice("106.00", "6.0", "toHT")).toBe("100.00");
  });

  it("rounds to 2 decimal places", () => {
    // 99.99 * 1.21 = 120.9879 → 120.99
    expect(recomputePrice("99.99", "21.0", "toTTC")).toBe("120.99");
  });

  it("handles HT→TTC→HT roundtrip with minimal rounding error", () => {
    const ttc = recomputePrice("110.00", "21.0", "toTTC"); // 133.10
    const htBack = recomputePrice(ttc, "21.0", "toHT"); // 110.00
    expect(htBack).toBe("110.00");
  });

  it("returns empty when tvaRate is empty", () => {
    expect(recomputePrice("100.00", "", "toTTC")).toBe("");
  });

  it("returns empty when price is empty", () => {
    expect(recomputePrice("", "21.0", "toTTC")).toBe("");
  });

  it("returns empty when price is non-numeric", () => {
    expect(recomputePrice("abc", "21.0", "toTTC")).toBe("");
  });

  it("handles 0% TVA", () => {
    expect(recomputePrice("100.00", "0.0", "toTTC")).toBe("100.00");
    expect(recomputePrice("100.00", "0.0", "toHT")).toBe("100.00");
  });
});

// ─── applyToPrices ──────────────────────────────────────────────────────────

function makeRow(overrides: Partial<PriceRow> = {}): PriceRow {
  return {
    ref: "A",
    priceHT: "100.00",
    priceTTC: "121.00",
    priceMin: "90.00",
    tvaRate: "21.0",
    priceBaseType: "HT",
    ...overrides,
  };
}

describe("applyToPrices — target HT", () => {
  it("modifies HT+MIN and recalculates TTC from newHT", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "HT");
    expect(results[0].priceHT).toBe("110.00");
    expect(results[0].priceMin).toBe("99.00");
    // TTC recalculated: 110 * 1.21 = 133.10
    expect(results[0].priceTTC).toBe("133.10");
    expect(results[0].changed).toBe(true);
  });

  it("recalculates TTC with fixed increase", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const results = applyToPrices([makeRow()], op, "HT");
    expect(results[0].priceHT).toBe("110.00");
    // 110 * 1.21 = 133.10
    expect(results[0].priceTTC).toBe("133.10");
  });

  it("recalculates TTC with decrease", () => {
    const op: PriceOperation = { type: "decrease-fixed", amount: 20 };
    const results = applyToPrices([makeRow()], op, "HT");
    expect(results[0].priceHT).toBe("80.00");
    // 80 * 1.21 = 96.80
    expect(results[0].priceTTC).toBe("96.80");
  });

  it("recalculates TTC with 6% TVA", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const row = makeRow({
      priceHT: "100.00",
      priceTTC: "106.00",
      tvaRate: "6.0",
    });
    const results = applyToPrices([row], op, "HT");
    expect(results[0].priceHT).toBe("110.00");
    // 110 * 1.06 = 116.60
    expect(results[0].priceTTC).toBe("116.60");
  });

  it("preserves original values", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "HT");
    expect(results[0].originalPriceHT).toBe("100.00");
    expect(results[0].originalPriceTTC).toBe("121.00");
    expect(results[0].originalPriceMin).toBe("90.00");
  });

  it("preserves tvaRate and priceBaseType", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "HT");
    expect(results[0].tvaRate).toBe("21.0");
    expect(results[0].priceBaseType).toBe("HT");
  });

  it("keeps TTC unchanged when tvaRate is empty", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const row = makeRow({ tvaRate: "" });
    const results = applyToPrices([row], op, "HT");
    expect(results[0].priceHT).toBe("110.00");
    expect(results[0].priceTTC).toBe("121.00");
  });
});

describe("applyToPrices — target TTC", () => {
  it("modifies TTC and recalculates HT from newTTC", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "TTC");
    // TTC: 121 * 1.10 = 133.10
    expect(results[0].priceTTC).toBe("133.10");
    // HT recalculated: 133.10 / 1.21 = 110.00
    expect(results[0].priceHT).toBe("110.00");
    expect(results[0].priceMin).toBe("90.00");
    expect(results[0].changed).toBe(true);
  });

  it("recalculates HT with fixed increase", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const results = applyToPrices([makeRow()], op, "TTC");
    expect(results[0].priceTTC).toBe("131.00");
    // 131 / 1.21 = 108.26446... → 108.26
    expect(results[0].priceHT).toBe("108.26");
  });

  it("recalculates HT with decrease", () => {
    const op: PriceOperation = { type: "decrease-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "TTC");
    // TTC: 121 * 0.90 = 108.90
    expect(results[0].priceTTC).toBe("108.90");
    // HT: 108.90 / 1.21 = 90.00
    expect(results[0].priceHT).toBe("90.00");
  });

  it("recalculates HT with 6% TVA", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const row = makeRow({
      priceHT: "100.00",
      priceTTC: "106.00",
      tvaRate: "6.0",
    });
    const results = applyToPrices([row], op, "TTC");
    expect(results[0].priceTTC).toBe("116.00");
    // 116 / 1.06 = 109.43396... → 109.43
    expect(results[0].priceHT).toBe("109.43");
  });

  it("does not modify priceMin", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const results = applyToPrices([makeRow()], op, "TTC");
    expect(results[0].priceMin).toBe("90.00");
  });

  it("keeps HT unchanged when tvaRate is empty", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const row = makeRow({ tvaRate: "" });
    const results = applyToPrices([row], op, "TTC");
    expect(results[0].priceTTC).toBe("131.00");
    expect(results[0].priceHT).toBe("100.00");
  });
});

describe("applyToPrices — edge cases", () => {
  it("marks unchanged when operation has no effect", () => {
    const noOp: PriceOperation = { type: "increase-fixed", amount: 0 };
    const results = applyToPrices([makeRow()], noOp, "HT");
    expect(results[0].changed).toBe(false);
  });

  it("handles empty array", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    expect(applyToPrices([], op, "HT")).toEqual([]);
  });

  it("preserves empty price strings for HT target", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const row = makeRow({ priceHT: "", priceMin: "" });
    const results = applyToPrices([row], op, "HT");
    expect(results[0].priceHT).toBe("");
    expect(results[0].priceMin).toBe("");
  });

  it("preserves empty price strings for TTC target", () => {
    const op: PriceOperation = { type: "increase-fixed", amount: 10 };
    const row = makeRow({ priceTTC: "" });
    const results = applyToPrices([row], op, "TTC");
    expect(results[0].priceTTC).toBe("");
  });

  it("handles multiple rows", () => {
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const rows = [
      makeRow({ ref: "A", priceHT: "100.00", priceTTC: "121.00" }),
      makeRow({ ref: "B", priceHT: "200.00", priceTTC: "242.00" }),
    ];
    const results = applyToPrices(rows, op, "HT");
    expect(results[0].priceHT).toBe("110.00");
    expect(results[0].priceTTC).toBe("133.10");
    expect(results[1].priceHT).toBe("220.00");
    // 220 * 1.21 = 266.20
    expect(results[1].priceTTC).toBe("266.20");
  });

  it("HT→TTC→HT roundtrip is consistent via percent operations", () => {
    // Increase HT by 10%, then verify the TTC/HT relationship
    const op: PriceOperation = { type: "increase-percent", percent: 10 };
    const results = applyToPrices([makeRow()], op, "HT");
    // newHT = 110, newTTC = 133.10
    // Verify: 110 * 1.21 = 133.10 ✓
    const htFloat = parseFloat(results[0].priceHT);
    const ttcFloat = parseFloat(results[0].priceTTC);
    expect(ttcFloat).toBeCloseTo(htFloat * 1.21, 1);
  });
});

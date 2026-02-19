import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { generateExcel } from "../excel-generator";
import { PriceModificationResult } from "../price-modifier";

function readSheet(buffer: Uint8Array): string[][] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
}

function makeResult(
  overrides: Partial<PriceModificationResult> = {},
): PriceModificationResult {
  return {
    ref: "A",
    priceHT: "110.00",
    priceTTC: "133.10",
    priceMin: "99.00",
    originalPriceHT: "100.00",
    originalPriceTTC: "121.00",
    originalPriceMin: "90.00",
    tvaRate: "21.0",
    priceBaseType: "HT",
    changed: true,
    ...overrides,
  };
}

describe("generateExcel", () => {
  it("creates an Excel file with Dolibarr headers", () => {
    const buffer = generateExcel([makeResult()]);
    const data = readSheet(buffer);
    expect(data[0]).toEqual([
      "Réf.* (p.ref)",
      "Prix de vente HT (p.price)",
      "Prix de vente min. (p.price_min)",
      "Prix de vente TTC (p.price_ttc)",
      "Taux TVA (p.tva_tx)",
      "PriceBaseType (p.price_base_type)",
    ]);
  });

  it("includes all results as rows", () => {
    const results = [makeResult({ ref: "A" }), makeResult({ ref: "B" })];
    const buffer = generateExcel(results);
    const data = readSheet(buffer);
    expect(data).toHaveLength(3); // header + 2 rows
    expect(data[1][0]).toBe("A");
    expect(data[2][0]).toBe("B");
  });

  it("outputs correct column values", () => {
    const buffer = generateExcel([makeResult()]);
    const data = readSheet(buffer);
    // [ref, priceHT, priceMin, priceTTC, tvaRate, priceBaseType]
    expect(data[1]).toEqual(["A", "110.00", "99.00", "133.10", "21.0", "HT"]);
  });

  it("handles empty results array", () => {
    const buffer = generateExcel([]);
    const data = readSheet(buffer);
    expect(data).toHaveLength(1); // header only
  });

  it("returns a Uint8Array", () => {
    const buffer = generateExcel([]);
    expect(buffer).toBeInstanceOf(Uint8Array);
  });
});

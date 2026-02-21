import { describe, it, expect } from "vitest";
import {
  parsePrice,
  autoDetectMappings,
  updateMapping,
  getMissingRequiredColumns,
  getAvailableTargetColumns,
  ColumnMapping,
} from "../column-mapper";

describe("parsePrice", () => {
  it("handles numeric values", () => {
    expect(parsePrice(123.45)).toBe("123.45");
    expect(parsePrice(100)).toBe("100");
  });

  it("handles string with € symbol", () => {
    expect(parsePrice("€ 123.45")).toBe("123.45");
    expect(parsePrice("€123.45")).toBe("123.45");
    expect(parsePrice("123.45€")).toBe("123.45");
    expect(parsePrice("€ 1393.05")).toBe("1393.05");
  });

  it("handles French format with comma", () => {
    expect(parsePrice("123,45")).toBe("123.45");
    expect(parsePrice("1 234,56")).toBe("1234.56");
    expect(parsePrice("€ 1 234,56")).toBe("1234.56");
  });

  it("handles European format with period as thousands separator", () => {
    expect(parsePrice("1.234,56")).toBe("1234.56");
    expect(parsePrice("€ 1.234,56")).toBe("1234.56");
  });

  it("handles empty/null values", () => {
    expect(parsePrice(null)).toBe("");
    expect(parsePrice("")).toBe("");
    expect(parsePrice(undefined as unknown as null)).toBe("");
  });

  it("handles EUR text", () => {
    expect(parsePrice("123.45 EUR")).toBe("123.45");
    expect(parsePrice("EUR 123.45")).toBe("123.45");
  });
});

describe("autoDetectMappings", () => {
  it("detects reference column", () => {
    const headers = ["Référence", "Nom", "Prix"];
    const mappings = autoDetectMappings(headers);
    expect(mappings[0].targetId).toBe("ref");
  });

  it("detects various reference aliases", () => {
    expect(autoDetectMappings(["SKU"])[0].targetId).toBe("ref");
    expect(autoDetectMappings(["Référence / Referentie"])[0].targetId).toBe(
      "ref",
    );
    expect(autoDetectMappings(["product_code"])[0].targetId).toBe("ref");
  });

  it("detects label column", () => {
    const headers = ["Ref", "Désignation"];
    const mappings = autoDetectMappings(headers);
    expect(mappings[1].targetId).toBe("label");
  });

  it("detects various label aliases", () => {
    expect(autoDetectMappings(["Ref", "Libellé"])[1].targetId).toBe("label");
    expect(autoDetectMappings(["Ref", "Benaming"])[1].targetId).toBe("label");
    expect(
      autoDetectMappings(["Ref", "Benaming / Désignation"])[1].targetId,
    ).toBe("label");
  });

  it("detects price column", () => {
    expect(autoDetectMappings(["Prix"])[0].targetId).toBe("price");
    expect(autoDetectMappings(["Price"])[0].targetId).toBe("price");
    expect(autoDetectMappings(["Prijs / Prix"])[0].targetId).toBe("price");
  });

  it("detects EAN/barcode column", () => {
    expect(autoDetectMappings(["EAN"])[0].targetId).toBe("barcode");
    expect(autoDetectMappings(["Code-barres"])[0].targetId).toBe("barcode");
    // "Barcode" matches ref's "code" alias, so we put it with a ref column to test barcode specifically
    expect(autoDetectMappings(["Ref", "Barcode"])[1].targetId).toBe("barcode");
  });

  it("does not duplicate mappings", () => {
    const headers = ["Référence", "Reference", "Ref"];
    const mappings = autoDetectMappings(headers);
    const refMappings = mappings.filter((m) => m.targetId === "ref");
    expect(refMappings.length).toBe(1);
  });

  it("returns null for unknown columns", () => {
    const headers = ["Référence", "Unknown Column", "Prix"];
    const mappings = autoDetectMappings(headers);
    expect(mappings[1].targetId).toBeNull();
  });

  it("maps Völkel file headers correctly", () => {
    const headers = [
      "Référence / Referentie",
      "Benaming / Désignation",
      "EAN",
      "Prijs / Prix",
      "EAN Minimum Packaging",
      "Qty",
    ];
    const mappings = autoDetectMappings(headers);
    expect(mappings[0].targetId).toBe("ref");
    expect(mappings[1].targetId).toBe("label");
    expect(mappings[2].targetId).toBe("barcode");
    expect(mappings[3].targetId).toBe("price");
    // EAN Minimum Packaging and Qty are not standard mappings
    expect(mappings[4].targetId).toBeNull();
    expect(mappings[5].targetId).toBeNull();
  });
});

describe("updateMapping", () => {
  it("updates a single mapping", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "A", targetId: "ref" },
      { sourceIndex: 1, sourceHeader: "B", targetId: null },
    ];
    const updated = updateMapping(mappings, 1, "label");
    expect(updated[1].targetId).toBe("label");
    expect(updated[0].targetId).toBe("ref");
  });

  it("clears previous mapping when reassigning target", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "A", targetId: "ref" },
      { sourceIndex: 1, sourceHeader: "B", targetId: null },
    ];
    const updated = updateMapping(mappings, 1, "ref");
    expect(updated[1].targetId).toBe("ref");
    expect(updated[0].targetId).toBeNull();
  });

  it("can clear a mapping", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "A", targetId: "ref" },
    ];
    const updated = updateMapping(mappings, 0, null);
    expect(updated[0].targetId).toBeNull();
  });
});

describe("getMissingRequiredColumns", () => {
  it("returns empty when all required columns are mapped", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "Ref", targetId: "ref" },
      { sourceIndex: 1, sourceHeader: "Label", targetId: "label" },
    ];
    const missing = getMissingRequiredColumns(mappings);
    // fk_product_type, tosell, tobuy have defaults
    expect(missing).toHaveLength(0);
  });

  it("returns missing required columns without defaults", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "Ref", targetId: "ref" },
    ];
    const missing = getMissingRequiredColumns(mappings);
    expect(missing.map((c) => c.id)).toContain("label");
  });
});

describe("getAvailableTargetColumns", () => {
  it("excludes already mapped columns", () => {
    const mappings: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: "Ref", targetId: "ref" },
    ];
    const available = getAvailableTargetColumns(mappings);
    expect(available.find((c) => c.id === "ref")).toBeUndefined();
    expect(available.find((c) => c.id === "label")).toBeDefined();
  });
});

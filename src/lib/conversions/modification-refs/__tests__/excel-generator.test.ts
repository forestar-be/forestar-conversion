import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { generateExcel } from "../excel-generator";
import { ModificationResult } from "../ref-modifier";

describe("generateExcel", () => {
  function readExcel(buffer: Uint8Array): {
    headers: string[];
    rows: string[][];
  } {
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    const headers = (data[0] as string[]) || [];
    const rows = data.slice(1).map((r) => (r as unknown[]).map(String));
    return { headers, rows };
  }

  it("generates an Excel with correct headers", () => {
    const results: ModificationResult[] = [
      { original: "A", modified: "PFX-A", changed: true },
    ];
    const buffer = generateExcel(results);
    const { headers } = readExcel(buffer);
    expect(headers).toEqual(["Ref", "Nouvelle Ref"]);
  });

  it("generates one row per result", () => {
    const results: ModificationResult[] = [
      { original: "A", modified: "PFX-A", changed: true },
      { original: "B", modified: "PFX-B", changed: true },
      { original: "C", modified: "C", changed: false },
    ];
    const buffer = generateExcel(results);
    const { rows } = readExcel(buffer);
    expect(rows).toHaveLength(3);
  });

  it("contains original and modified refs", () => {
    const results: ModificationResult[] = [
      { original: "OLD-123", modified: "NEW-123", changed: true },
    ];
    const buffer = generateExcel(results);
    const { rows } = readExcel(buffer);
    expect(rows[0]).toEqual(["OLD-123", "NEW-123"]);
  });

  it("handles empty results", () => {
    const buffer = generateExcel([]);
    const { headers, rows } = readExcel(buffer);
    expect(headers).toEqual(["Ref", "Nouvelle Ref"]);
    expect(rows).toHaveLength(0);
  });

  it("returns a valid Uint8Array", () => {
    const results: ModificationResult[] = [
      { original: "A", modified: "B", changed: true },
    ];
    const buffer = generateExcel(results);
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});

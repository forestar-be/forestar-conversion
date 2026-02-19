import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  mergeSheets,
  MergeOptions,
  generateExcel,
  isDolibarrFormat,
  MAX_ROWS_PER_FILE,
} from "../excel-merger";
import { ParsedSheet } from "../excel-parser";

describe("mergeSheets", () => {
  const base: ParsedSheet = {
    headers: ["Ref", "Label", "Description", "Price"],
    rows: [
      ["REF001", "Title EN 1", "Desc EN 1", "100"],
      ["REF002", "Title EN 2", "Desc EN 2", "200"],
      ["REF003", "Title EN 3", "Desc EN 3", "300"],
    ],
  };

  const source: ParsedSheet = {
    headers: ["Code", "Titre FR", "Description FR"],
    rows: [
      ["REF001", "Titre FR 1", "Desc FR 1"],
      ["REF003", "Titre FR 3", "Desc FR 3"],
    ],
  };

  const options: MergeOptions = {
    baseKeyCol: 0,
    sourceKeyCol: 0,
    mappings: [
      { baseColIndex: 1, sourceColIndex: 1 }, // Label ← Titre FR
      { baseColIndex: 2, sourceColIndex: 2 }, // Description ← Description FR
    ],
  };

  it("replaces mapped columns for matched rows", () => {
    const result = mergeSheets(base, source, options);
    expect(result.rows[0]).toEqual([
      "REF001",
      "Titre FR 1",
      "Desc FR 1",
      "100",
    ]);
    expect(result.rows[2]).toEqual([
      "REF003",
      "Titre FR 3",
      "Desc FR 3",
      "300",
    ]);
  });

  it("keeps original values for unmatched rows", () => {
    const result = mergeSheets(base, source, options);
    expect(result.rows[1]).toEqual([
      "REF002",
      "Title EN 2",
      "Desc EN 2",
      "200",
    ]);
  });

  it("reports correct match counts", () => {
    const result = mergeSheets(base, source, options);
    expect(result.matchedCount).toBe(2);
    expect(result.unmatchedCount).toBe(1);
    expect(result.totalRows).toBe(3);
  });

  it("reports unmatched refs", () => {
    const result = mergeSheets(base, source, options);
    expect(result.unmatchedRefs).toEqual(["REF002"]);
  });

  it("preserves headers from base", () => {
    const result = mergeSheets(base, source, options);
    expect(result.headers).toEqual(["Ref", "Label", "Description", "Price"]);
  });

  it("matches keys case-insensitively", () => {
    const sourceLC: ParsedSheet = {
      headers: ["Code", "Titre"],
      rows: [["ref001", "Titre FR 1"]],
    };
    const opts: MergeOptions = {
      baseKeyCol: 0,
      sourceKeyCol: 0,
      mappings: [{ baseColIndex: 1, sourceColIndex: 1 }],
    };
    const result = mergeSheets(base, sourceLC, opts);
    expect(result.rows[0][1]).toBe("Titre FR 1");
    expect(result.matchedCount).toBe(1);
  });

  it("handles empty mappings (no columns replaced)", () => {
    const opts: MergeOptions = {
      baseKeyCol: 0,
      sourceKeyCol: 0,
      mappings: [],
    };
    const result = mergeSheets(base, source, opts);
    expect(result.rows).toEqual(base.rows);
    expect(result.matchedCount).toBe(2);
  });

  it("handles empty base", () => {
    const emptyBase: ParsedSheet = { headers: ["Ref", "Label"], rows: [] };
    const result = mergeSheets(emptyBase, source, options);
    expect(result.rows).toHaveLength(0);
    expect(result.matchedCount).toBe(0);
  });

  it("handles empty source", () => {
    const emptySource: ParsedSheet = { headers: ["Code"], rows: [] };
    const result = mergeSheets(base, emptySource, options);
    expect(result.rows).toEqual(base.rows);
    expect(result.unmatchedCount).toBe(3);
  });

  it("uses first occurrence for duplicate keys in source", () => {
    const dupeSource: ParsedSheet = {
      headers: ["Code", "Titre"],
      rows: [
        ["REF001", "Premier"],
        ["REF001", "Deuxième"],
      ],
    };
    const opts: MergeOptions = {
      baseKeyCol: 0,
      sourceKeyCol: 0,
      mappings: [{ baseColIndex: 1, sourceColIndex: 1 }],
    };
    const result = mergeSheets(base, dupeSource, opts);
    expect(result.rows[0][1]).toBe("Premier");
  });

  it("trims whitespace in keys for matching", () => {
    const spacedSource: ParsedSheet = {
      headers: ["Code", "Titre"],
      rows: [["  REF001  ", "Titre FR"]],
    };
    const opts: MergeOptions = {
      baseKeyCol: 0,
      sourceKeyCol: 0,
      mappings: [{ baseColIndex: 1, sourceColIndex: 1 }],
    };
    const result = mergeSheets(base, spacedSource, opts);
    expect(result.rows[0][1]).toBe("Titre FR");
  });
});

// ─── isDolibarrFormat ───────────────────────────────────────────────────────

describe("isDolibarrFormat", () => {
  it("detects Dolibarr headers with (p.xxx) pattern", () => {
    expect(
      isDolibarrFormat(["Réf.* (p.ref)", "Libellé* (p.label)", "Prix"]),
    ).toBe(true);
  });

  it("returns false for plain headers", () => {
    expect(isDolibarrFormat(["Ref", "Label", "Price"])).toBe(false);
  });

  it("returns false for empty headers", () => {
    expect(isDolibarrFormat([])).toBe(false);
  });
});

// ─── generateExcel — ZIP splitting ──────────────────────────────────────────

describe("generateExcel — ZIP splitting", () => {
  function makeDolibarrResult(rowCount: number) {
    const headers = ["Réf.* (p.ref)", "Libellé* (p.label)", "Prix (p.price)"];
    const rows = Array.from({ length: rowCount }, (_, i) => [
      `REF${i}`,
      `Label ${i}`,
      `${i * 10}`,
    ]);
    return {
      headers,
      rows,
      matchedCount: rowCount,
      unmatchedCount: 0,
      totalRows: rowCount,
      unmatchedRefs: [],
    };
  }

  it("returns single Excel when rows <= MAX_ROWS_PER_FILE with Dolibarr headers", async () => {
    const result = await generateExcel(makeDolibarrResult(MAX_ROWS_PER_FILE));
    expect(result.isZip).toBe(false);
    expect(result.fileCount).toBe(1);
  });

  it("returns ZIP when rows > MAX_ROWS_PER_FILE with Dolibarr headers", async () => {
    const result = await generateExcel(
      makeDolibarrResult(MAX_ROWS_PER_FILE + 1),
    );
    expect(result.isZip).toBe(true);
    expect(result.fileCount).toBe(2);
  });

  it("returns single Excel for large non-Dolibarr files", async () => {
    const result = await generateExcel({
      headers: ["Ref", "Label"],
      rows: Array.from({ length: MAX_ROWS_PER_FILE + 100 }, (_, i) => [
        `R${i}`,
        `L${i}`,
      ]),
      matchedCount: 0,
      unmatchedCount: 0,
      totalRows: MAX_ROWS_PER_FILE + 100,
      unmatchedRefs: [],
    });
    expect(result.isZip).toBe(false);
    expect(result.fileCount).toBe(1);
  });

  it("generates valid ZIP with correct file count", async () => {
    const count = MAX_ROWS_PER_FILE * 2 + 50;
    const result = await generateExcel(makeDolibarrResult(count));
    expect(result.isZip).toBe(true);
    expect(result.fileCount).toBe(3);

    const zip = await JSZip.loadAsync(result.buffer);
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toHaveLength(3);
    expect(fileNames).toContain("fusion_1.xlsx");
    expect(fileNames).toContain("fusion_2.xlsx");
    expect(fileNames).toContain("fusion_3.xlsx");

    // Verify first file has MAX_ROWS_PER_FILE data rows
    const file1 = await zip.file("fusion_1.xlsx")!.async("uint8array");
    const wb1 = XLSX.read(file1, { type: "array" });
    const data1 = XLSX.utils.sheet_to_json(wb1.Sheets[wb1.SheetNames[0]], {
      header: 1,
    }) as string[][];
    expect(data1.length - 1).toBe(MAX_ROWS_PER_FILE);

    // Last file has the remainder
    const file3 = await zip.file("fusion_3.xlsx")!.async("uint8array");
    const wb3 = XLSX.read(file3, { type: "array" });
    const data3 = XLSX.utils.sheet_to_json(wb3.Sheets[wb3.SheetNames[0]], {
      header: 1,
    }) as string[][];
    expect(data3.length - 1).toBe(50);
  });
});

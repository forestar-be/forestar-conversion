import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcel, getColumnIndex, getColumnValues } from "../excel-parser";

function createTestWorkbook(data: (string | number | null)[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Test");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}

describe("parseExcel", () => {
  it("parses simple data with header at row 0", () => {
    const data = [
      ["Ref", "Name", "Price"],
      ["A001", "Product A", 10],
      ["A002", "Product B", 20],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer);

    expect(result.headers).toEqual(["Ref", "Name", "Price"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["A001", "Product A", 10]);
    expect(result.headerRow).toBe(0);
  });

  it("detects header row with company info above", () => {
    const data = [
      ["Company Name", null, null],
      ["Address Line", null, null],
      [null, null, null],
      ["Ref", "Name", "Price"],
      ["A001", "Product A", 10],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer);

    expect(result.headerRow).toBe(3);
    expect(result.headers).toEqual(["Ref", "Name", "Price"]);
    expect(result.rows).toHaveLength(1);
  });

  it("skips empty rows", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Product A"],
      [null, null],
      ["A002", "Product B"],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer);

    expect(result.rows).toHaveLength(2);
  });

  it("handles cells with null values", () => {
    const data = [
      ["Ref", "Name", "Price"],
      ["A001", null, 10],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer);

    expect(result.rows[0]).toEqual(["A001", null, 10]);
  });

  it("uses provided header row", () => {
    const data = [
      ["Company", null, null],
      ["Ref", "Name", "Price"],
      ["A001", "Product A", 10],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer, { headerRow: 1 });

    expect(result.headerRow).toBe(1);
    expect(result.headers).toEqual(["Ref", "Name", "Price"]);
  });

  it("returns sheet info", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Test"],
    ];
    const buffer = createTestWorkbook(data);
    const result = parseExcel(buffer);

    expect(result.sheetName).toBe("Test");
    expect(result.sheetNames).toContain("Test");
  });

  it("throws on empty workbook", () => {
    const ws = {};
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empty");
    const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    expect(() => parseExcel(buffer)).toThrow();
  });
});

describe("getColumnIndex", () => {
  it("finds column by exact name", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Test"],
    ];
    const parsed = parseExcel(createTestWorkbook(data));
    expect(getColumnIndex(parsed, "Ref")).toBe(0);
    expect(getColumnIndex(parsed, "Name")).toBe(1);
  });

  it("is case-insensitive", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Test"],
    ];
    const parsed = parseExcel(createTestWorkbook(data));
    expect(getColumnIndex(parsed, "ref")).toBe(0);
    expect(getColumnIndex(parsed, "REF")).toBe(0);
  });

  it("returns null for non-existent column", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Test"],
    ];
    const parsed = parseExcel(createTestWorkbook(data));
    expect(getColumnIndex(parsed, "Unknown")).toBeNull();
  });
});

describe("getColumnValues", () => {
  it("extracts column values", () => {
    const data = [
      ["Ref", "Name"],
      ["A001", "Product A"],
      ["A002", "Product B"],
    ];
    const parsed = parseExcel(createTestWorkbook(data));
    expect(getColumnValues(parsed, 0)).toEqual(["A001", "A002"]);
    expect(getColumnValues(parsed, 1)).toEqual(["Product A", "Product B"]);
  });
});

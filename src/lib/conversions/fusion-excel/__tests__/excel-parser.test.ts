import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseExcel } from "../excel-parser";

function makeExcelBuffer(headers: string[], rows: string[][]): ArrayBuffer {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

describe("parseExcel", () => {
  it("parses headers and rows", () => {
    const buffer = makeExcelBuffer(
      ["Ref", "Label", "Price"],
      [
        ["REF001", "Product 1", "100"],
        ["REF002", "Product 2", "200"],
      ],
    );
    const result = parseExcel(buffer);
    expect(result.headers).toEqual(["Ref", "Label", "Price"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["REF001", "Product 1", "100"]);
  });

  it("skips empty rows", () => {
    const buffer = makeExcelBuffer(
      ["Ref", "Label"],
      [
        ["REF001", "A"],
        ["", ""],
        ["REF002", "B"],
      ],
    );
    const result = parseExcel(buffer);
    expect(result.rows).toHaveLength(2);
  });

  it("returns empty for empty sheet", () => {
    const ws = XLSX.utils.aoa_to_sheet([]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const result = parseExcel(buf);
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("handles numeric cell values as strings", () => {
    const buffer = makeExcelBuffer(["Ref", "Qty"], [["REF001", "42"]]);
    const result = parseExcel(buffer);
    expect(result.rows[0][1]).toBe("42");
  });
});

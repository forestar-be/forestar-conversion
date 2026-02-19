import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  parseRefsFromText,
  parseRefsFromExcel,
  parseRefsFromZip,
} from "../ref-input-parser";

// ─── parseRefsFromText ──────────────────────────────────────────────────────

describe("parseRefsFromText", () => {
  it("splits by newline", () => {
    expect(parseRefsFromText("A\nB\nC")).toEqual(["A", "B", "C"]);
  });

  it("handles Windows line endings", () => {
    expect(parseRefsFromText("A\r\nB\r\nC")).toEqual(["A", "B", "C"]);
  });

  it("trims whitespace from lines", () => {
    expect(parseRefsFromText("  A  \n  B  ")).toEqual(["A", "B"]);
  });

  it("filters out empty lines", () => {
    expect(parseRefsFromText("A\n\n\nB\n\n")).toEqual(["A", "B"]);
  });

  it("returns empty array for empty input", () => {
    expect(parseRefsFromText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseRefsFromText("   \n  \n  ")).toEqual([]);
  });

  it("handles single ref", () => {
    expect(parseRefsFromText("ABC123")).toEqual(["ABC123"]);
  });
});

// ─── parseRefsFromExcel ─────────────────────────────────────────────────────

function makeExcelBuffer(headers: string[], rows: string[][]): ArrayBuffer {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

describe("parseRefsFromExcel", () => {
  it("finds refs in 'Réf.* (p.ref)' column", () => {
    const buf = makeExcelBuffer(
      ["Réf.* (p.ref)", "Label"],
      [
        ["ABC", "Product A"],
        ["DEF", "Product B"],
      ],
    );
    expect(parseRefsFromExcel(buf)).toEqual(["ABC", "DEF"]);
  });

  it("finds refs in 'Ref' column (case-insensitive)", () => {
    const buf = makeExcelBuffer(
      ["ref", "other"],
      [
        ["X1", "a"],
        ["X2", "b"],
      ],
    );
    expect(parseRefsFromExcel(buf)).toEqual(["X1", "X2"]);
  });

  it("finds refs in 'Référence' column", () => {
    const buf = makeExcelBuffer(["Référence", "Nom"], [["R1", "Item"]]);
    expect(parseRefsFromExcel(buf)).toEqual(["R1"]);
  });

  it("returns empty array if no ref column found", () => {
    const buf = makeExcelBuffer(["Name", "Price"], [["Product", "10"]]);
    expect(parseRefsFromExcel(buf)).toEqual([]);
  });

  it("skips empty ref values", () => {
    const buf = makeExcelBuffer(
      ["Ref", "Label"],
      [
        ["A", "x"],
        ["", "y"],
        ["B", "z"],
      ],
    );
    expect(parseRefsFromExcel(buf)).toEqual(["A", "B"]);
  });

  it("reads from multiple sheets", () => {
    const ws1 = XLSX.utils.aoa_to_sheet([["Ref"], ["A1"], ["A2"]]);
    const ws2 = XLSX.utils.aoa_to_sheet([["Ref"], ["B1"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Sheet1");
    XLSX.utils.book_append_sheet(wb, ws2, "Sheet2");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    expect(parseRefsFromExcel(buf)).toEqual(["A1", "A2", "B1"]);
  });
});

// ─── parseRefsFromZip ───────────────────────────────────────────────────────

describe("parseRefsFromZip", () => {
  it("extracts refs from Excel files inside a ZIP", async () => {
    const zip = new JSZip();
    const buf1 = makeExcelBuffer(["Réf.* (p.ref)", "Label"], [["Z1", "a"]]);
    const buf2 = makeExcelBuffer(["Réf.* (p.ref)", "Label"], [["Z2", "b"]]);
    zip.file("part1.xlsx", buf1);
    zip.file("part2.xlsx", buf2);

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const refs = await parseRefsFromZip(zipBuffer);
    expect(refs).toContain("Z1");
    expect(refs).toContain("Z2");
    expect(refs).toHaveLength(2);
  });

  it("ignores non-xlsx files in ZIP", async () => {
    const zip = new JSZip();
    const buf = makeExcelBuffer(["Ref"], [["A"]]);
    zip.file("data.xlsx", buf);
    zip.file("readme.txt", "some text");

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const refs = await parseRefsFromZip(zipBuffer);
    expect(refs).toEqual(["A"]);
  });

  it("returns empty array for ZIP with no xlsx files", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "nothing here");

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const refs = await parseRefsFromZip(zipBuffer);
    expect(refs).toEqual([]);
  });
});

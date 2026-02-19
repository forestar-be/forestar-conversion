import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import {
  parsePricesFromText,
  parsePricesFromExcel,
  parsePricesFromZip,
} from "../price-input-parser";

// ─── parsePricesFromText ────────────────────────────────────────────────────

describe("parsePricesFromText", () => {
  it("parses tab-separated ref+price lines", () => {
    const text = "REF001\t100.00\nREF002\t200.50";
    const result = parsePricesFromText(text);
    expect(result).toEqual([
      { ref: "REF001", price: "100.00" },
      { ref: "REF002", price: "200.50" },
    ]);
  });

  it("skips empty lines", () => {
    const text = "REF001\t100\n\nREF002\t200\n";
    const result = parsePricesFromText(text);
    expect(result).toHaveLength(2);
  });

  it("skips lines without tab separator", () => {
    const text = "REF001\t100\nJUST-A-REF\nREF002\t200";
    const result = parsePricesFromText(text);
    expect(result).toHaveLength(2);
  });

  it("skips lines with invalid price", () => {
    const text = "REF001\tabc\nREF002\t200";
    const result = parsePricesFromText(text);
    expect(result).toHaveLength(1);
    expect(result[0].ref).toBe("REF002");
  });

  it("returns empty array for empty text", () => {
    expect(parsePricesFromText("")).toEqual([]);
  });

  it("trims whitespace from ref and price", () => {
    const text = "  REF001  \t  100.50  ";
    const result = parsePricesFromText(text);
    expect(result[0]).toEqual({ ref: "REF001", price: "100.50" });
  });

  it("handles Windows line endings", () => {
    const text = "REF001\t100\r\nREF002\t200";
    const result = parsePricesFromText(text);
    expect(result).toHaveLength(2);
  });
});

// ─── parsePricesFromExcel ───────────────────────────────────────────────────

function makeExcelBuffer(
  headers: string[],
  rows: (string | number)[][],
): ArrayBuffer {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf;
}

describe("parsePricesFromExcel", () => {
  it("parses generic Ref and Prix columns as PriceRow with HT fallback", () => {
    const buf = makeExcelBuffer(
      ["Ref", "Prix"],
      [
        ["REF001", 100],
        ["REF002", 200.5],
      ],
    );
    const result = parsePricesFromExcel(buf);
    expect(result).toHaveLength(2);
    expect(result[0].ref).toBe("REF001");
    expect(result[0].priceHT).toBe("100");
    expect(result[0].priceTTC).toBe("");
    expect(result[1].ref).toBe("REF002");
    expect(result[1].priceHT).toBe("200.5");
  });

  it("parses full Dolibarr headers", () => {
    const buf = makeExcelBuffer(
      [
        "Réf.* (p.ref)",
        "Libellé",
        "Prix de vente HT (p.price)",
        "Prix de vente min. (p.price_min)",
        "Prix de vente TTC (p.price_ttc)",
        "Taux TVA (p.tva_tx)",
        "PriceBaseType (p.price_base_type)",
      ],
      [["CS50", "Title", "100.00", "90.00", "121.00", "21.0", "HT"]],
    );
    const result = parsePricesFromExcel(buf);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      ref: "CS50",
      priceHT: "100.00",
      priceMin: "90.00",
      priceTTC: "121.00",
      tvaRate: "21.0",
      priceBaseType: "HT",
    });
  });

  it("skips rows with missing ref", () => {
    const buf = makeExcelBuffer(
      ["Ref", "Prix"],
      [
        ["REF001", 100],
        ["", 200],
      ],
    );
    const result = parsePricesFromExcel(buf);
    expect(result).toHaveLength(1);
  });

  it("skips rows with invalid price", () => {
    const buf = makeExcelBuffer(
      ["Ref", "Prix"],
      [
        ["REF001", 100],
        ["REF002", "abc"],
      ],
    );
    const result = parsePricesFromExcel(buf);
    expect(result).toHaveLength(1);
  });

  it("returns empty when no matching columns found", () => {
    const buf = makeExcelBuffer(["Name", "Value"], [["A", 100]]);
    const result = parsePricesFromExcel(buf);
    expect(result).toEqual([]);
  });

  it("returns empty for sheet with only headers", () => {
    const buf = makeExcelBuffer(["Ref", "Prix"], []);
    const result = parsePricesFromExcel(buf);
    expect(result).toEqual([]);
  });
});

// ─── parsePricesFromZip ─────────────────────────────────────────────────────

describe("parsePricesFromZip", () => {
  it("extracts prices from Excel files in ZIP", async () => {
    const excelBuf = makeExcelBuffer(
      ["Ref", "Prix"],
      [
        ["REF001", 100],
        ["REF002", 200],
      ],
    );
    const zip = new JSZip();
    zip.file("data.xlsx", excelBuf);
    const zipBuf = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parsePricesFromZip(zipBuf);
    expect(result).toHaveLength(2);
  });

  it("merges prices from multiple Excel files", async () => {
    const buf1 = makeExcelBuffer(["Ref", "Prix"], [["A", 10]]);
    const buf2 = makeExcelBuffer(["Ref", "Prix"], [["B", 20]]);
    const zip = new JSZip();
    zip.file("file1.xlsx", buf1);
    zip.file("file2.xlsx", buf2);
    const zipBuf = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parsePricesFromZip(zipBuf);
    expect(result).toHaveLength(2);
  });

  it("ignores non-xlsx files in ZIP", async () => {
    const excelBuf = makeExcelBuffer(["Ref", "Prix"], [["A", 10]]);
    const zip = new JSZip();
    zip.file("data.xlsx", excelBuf);
    zip.file("readme.txt", "Hello");
    const zipBuf = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parsePricesFromZip(zipBuf);
    expect(result).toHaveLength(1);
  });
});

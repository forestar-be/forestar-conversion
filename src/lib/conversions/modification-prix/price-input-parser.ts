import * as XLSX from "xlsx";
import JSZip from "jszip";
import { PriceRow } from "./price-modifier";

/** Simple ref+price pair from text paste. */
export interface TextPricePair {
  ref: string;
  price: string;
}

/**
 * Parse ref+price pairs from tab-separated text lines.
 * Expected format: "REF\tPRICE" per line.
 * Lines with missing/invalid price are skipped.
 */
export function parsePricesFromText(text: string): TextPricePair[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split("\t");
      if (parts.length < 2) return null;
      const ref = parts[0].trim();
      const priceStr = parts[1].trim();
      if (!ref || !priceStr || isNaN(parseFloat(priceStr))) return null;
      return { ref, price: priceStr };
    })
    .filter((item): item is TextPricePair => item !== null);
}

const REF_PATTERNS = [
  /^réf/i,
  /^ref/i,
  /\(p\.ref\)/i,
  /^référence/i,
  /^reference/i,
];

const PRICE_HT_PATTERNS = [/\(p\.price\)$/i, /prix.*vente.*ht/i, /^prix.*ht/i];
const PRICE_TTC_PATTERNS = [
  /\(p\.price_ttc\)/i,
  /prix.*vente.*ttc/i,
  /^prix.*ttc/i,
];
const PRICE_MIN_PATTERNS = [
  /\(p\.price_min\)/i,
  /prix.*vente.*min/i,
  /^prix.*min/i,
];
const TVA_PATTERNS = [/\(p\.tva_tx\)/i, /taux.*tva/i, /^tva/i];
const PRICE_BASE_PATTERNS = [/\(p\.price_base_type\)/i, /pricebasetype/i];
const PRICE_GENERIC_PATTERNS = [/^prix$/i, /^price$/i, /^montant$/i];

function findColumnIndex(headers: unknown[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? "").trim();
    if (patterns.some((p) => p.test(header))) return i;
  }
  return -1;
}

/**
 * Extract PriceRow[] from a single Excel workbook buffer.
 * Looks for Dolibarr column headers (Ref, Prix HT, Prix TTC, Prix min, TVA, PriceBaseType).
 * Falls back to a generic "Prix" column treated as priceHT if no HT/TTC columns found.
 */
export function parsePricesFromExcel(buffer: ArrayBuffer): PriceRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const results: PriceRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    if (rows.length < 2) continue;

    const headerRow = rows[0] as unknown[];
    const refCol = findColumnIndex(headerRow, REF_PATTERNS);
    if (refCol === -1) continue;

    let htCol = findColumnIndex(headerRow, PRICE_HT_PATTERNS);
    const ttcCol = findColumnIndex(headerRow, PRICE_TTC_PATTERNS);
    const minCol = findColumnIndex(headerRow, PRICE_MIN_PATTERNS);
    const tvaCol = findColumnIndex(headerRow, TVA_PATTERNS);
    const baseCol = findColumnIndex(headerRow, PRICE_BASE_PATTERNS);

    // Fallback: generic "Prix" column → treat as HT
    if (htCol === -1 && ttcCol === -1) {
      htCol = findColumnIndex(headerRow, PRICE_GENERIC_PATTERNS);
    }

    // Need at least ref + one price column
    if (htCol === -1 && ttcCol === -1) continue;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const ref = String(row[refCol] ?? "").trim();
      if (!ref) continue;

      const priceHT = htCol !== -1 ? String(row[htCol] ?? "").trim() : "";
      const priceTTC = ttcCol !== -1 ? String(row[ttcCol] ?? "").trim() : "";

      // Skip rows where all price cells are empty or non-numeric
      if (
        (!priceHT || isNaN(parseFloat(priceHT))) &&
        (!priceTTC || isNaN(parseFloat(priceTTC)))
      )
        continue;

      results.push({
        ref,
        priceHT,
        priceTTC,
        priceMin: minCol !== -1 ? String(row[minCol] ?? "").trim() : "",
        tvaRate: tvaCol !== -1 ? String(row[tvaCol] ?? "").trim() : "",
        priceBaseType: baseCol !== -1 ? String(row[baseCol] ?? "").trim() : "",
      });
    }
  }

  return results;
}

/**
 * Extract PriceRow[] from a ZIP containing Excel files.
 */
export async function parsePricesFromZip(
  buffer: ArrayBuffer,
): Promise<PriceRow[]> {
  const zip = await JSZip.loadAsync(buffer);
  const results: PriceRow[] = [];

  const xlsxFiles = Object.keys(zip.files).filter((name) =>
    name.endsWith(".xlsx"),
  );

  for (const fileName of xlsxFiles) {
    const fileData = await zip.files[fileName].async("arraybuffer");
    const fileResults = parsePricesFromExcel(fileData);
    results.push(...fileResults);
  }

  return results;
}
